import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { hasTestDatabase, resetDatabase } from '../helpers/db.js';
import { API, app, auth, login } from '../helpers/api.js';

const describeDb = hasTestDatabase ? describe : describe.skip;

describeDb('authentication', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  it('signs in and returns a token plus a public user without secrets', async () => {
    const response = await request(app)
      .post(`${API}/auth/login`)
      .send({ username: 'testadmin', password: 'TestAdmin123!' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTypeOf('string');
    expect(response.body.data.user.permissions).toContain('*');
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|password_hash/);

    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
  });

  it('rejects a wrong password without revealing whether the user exists', async () => {
    const wrongPassword = await request(app)
      .post(`${API}/auth/login`)
      .send({ username: 'testadmin', password: 'not-the-password' })
      .expect(401);
    const unknownUser = await request(app)
      .post(`${API}/auth/login`)
      .send({ username: 'ghost', password: 'not-the-password' })
      .expect(401);

    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknownUser.body.error.code).toBe(wrongPassword.body.error.code);
    expect(unknownUser.body.error.message).toBe(wrongPassword.body.error.message);
    expect(wrongPassword.body.error.message).toContain('رمز عبور');
  });

  it('validates the login body', async () => {
    const response = await request(app)
      .post(`${API}/auth/login`)
      .send({ username: 'a' })
      .expect(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires a bearer token for protected routes', async () => {
    const response = await request(app).get(`${API}/clients`).expect(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');

    await request(app).get(`${API}/auth/me`).set(auth((await login()).token)).expect(200);
  });

  it('rotates the refresh token and invalidates the previous one', async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post(`${API}/auth/login`)
      .send({ username: 'testadmin', password: 'TestAdmin123!' })
      .expect(200);
    const firstCookie = loginResponse.headers['set-cookie']?.[0]?.split(';')[0] ?? '';
    expect(firstCookie).toContain('jf_refresh=');

    const refreshed = await agent.post(`${API}/auth/refresh`).expect(200);
    expect(refreshed.body.data.token).toBeTypeOf('string');

    const replay = await request(app)
      .post(`${API}/auth/refresh`)
      .set('Cookie', firstCookie)
      .expect(401);
    expect(replay.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects cross-origin refresh attempts', async () => {
    await request(app)
      .post(`${API}/auth/refresh`)
      .set('Origin', 'https://evil.example')
      .expect(403);
  });

  it('clears the session on logout', async () => {
    const agent = request.agent(app);
    await agent
      .post(`${API}/auth/login`)
      .send({ username: 'testadmin', password: 'TestAdmin123!' })
      .expect(200);

    await agent.post(`${API}/auth/logout`).expect(200);
    await agent.post(`${API}/auth/refresh`).expect(401);
  });

  it('blocks deactivated accounts', async () => {
    const { token } = await login();

    const created = await request(app)
      .post(`${API}/users`)
      .set(auth(token))
      .send({
        username: 'tempuser',
        fullName: 'کاربر موقت',
        password: 'TempPass123!',
        role: 'admin',
        permissions: ['clients.view'],
      })
      .expect(201);

    await request(app)
      .post(`${API}/auth/login`)
      .send({ username: 'tempuser', password: 'TempPass123!' })
      .expect(200);

    await request(app)
      .patch(`${API}/users/${created.body.data.id}/status`)
      .set(auth(token))
      .send({ active: false })
      .expect(200);

    const blocked = await request(app)
      .post(`${API}/auth/login`)
      .send({ username: 'tempuser', password: 'TempPass123!' })
      .expect(401);
    expect(blocked.body.error.code).toBe('ACCOUNT_DISABLED');
  });

  it('lets superadmins manage manager accounts and permanently delete them', async () => {
    const { token } = await login();
    const created = await request(app)
      .post(`${API}/admin-users`)
      .set(auth(token))
      .send({
        username: 'managedadmin',
        fullName: 'مدیر آزمایشی',
        password: 'ManagedPass123!',
        permissions: ['clients.view'],
      })
      .expect(201);

    expect(created.body.data.role).toBe('admin');
    expect(created.body.data.permissions).toEqual(['clients.view']);

    await login('managedadmin', 'ManagedPass123!');
    const report = await request(app)
      .get(`${API}/audit-logs`)
      .query({ userId: created.body.data.id })
      .set(auth(token))
      .expect(200);
    expect(report.body.data.some((entry: { action: string }) => entry.action === 'ورود به سامانه')).toBe(true);

    await request(app)
      .patch(`${API}/admin-users/${created.body.data.id}/status`)
      .set(auth(token))
      .send({ active: false })
      .expect(200);

    await request(app)
      .delete(`${API}/admin-users/${created.body.data.id}`)
      .set(auth(token))
      .expect(204);
  });

  it('does not allow managers to use superadmin-only manager administration', async () => {
    const { token } = await login();
    const created = await request(app)
      .post(`${API}/users`)
      .set(auth(token))
      .send({
        username: 'restrictedmanager',
        fullName: 'مدیر محدود',
        password: 'RestrictedPass123!',
        role: 'admin',
        permissions: ['users.view', 'users.create', 'audit.view'],
      })
      .expect(201);
    const managerLogin = await login('restrictedmanager', 'RestrictedPass123!');

    await request(app)
      .get(`${API}/admin-users`)
      .set(auth(managerLogin.token))
      .expect(403);

    await request(app)
      .post(`${API}/admin-users`)
      .set(auth(managerLogin.token))
      .send({
        username: 'forbiddenmanager',
        fullName: 'مدیر غیرمجاز',
        password: 'ForbiddenPass123!',
        permissions: [],
      })
      .expect(403);

    await request(app)
      .post(`${API}/users`)
      .set(auth(managerLogin.token))
      .send({
        username: 'bypassmanager',
        fullName: 'مدیر غیرمجاز',
        password: 'ForbiddenPass123!',
        role: 'admin',
        permissions: ['clients.view'],
      })
      .expect(403);

    await request(app)
      .post(`${API}/users`)
      .set(auth(managerLogin.token))
      .send({
        username: 'bypasssuperadmin',
        fullName: 'مدیر غیرمجاز',
        password: 'ForbiddenPass123!',
        role: 'superadmin',
        permissions: [],
      })
      .expect(403);

    await request(app)
      .patch(`${API}/users/${created.body.data.id}`)
      .set(auth(managerLogin.token))
      .send({ role: 'superadmin' })
      .expect(403);

    await request(app).delete(`${API}/users/${created.body.data.id}`).set(auth(token)).expect(204);
  });

  it('changes the current password and revokes existing refresh sessions', async () => {
    const { token } = await login();
    const agent = request.agent(app);
    await agent
      .post(`${API}/auth/login`)
      .send({ username: 'testadmin', password: 'TestAdmin123!' })
      .expect(200);
    const initialLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ username: 'testadmin', password: 'TestAdmin123!' })
      .expect(200);

    await request(app)
      .post(`${API}/auth/change-password`)
      .set(auth(initialLogin.body.data.token))
      .send({
        currentPassword: 'TestAdmin123!',
        newPassword: 'ChangedAdmin123!',
        confirmPassword: 'ChangedAdmin123!',
      })
      .expect(200);

    await agent.post(`${API}/auth/refresh`).expect(401);
    await request(app)
      .post(`${API}/auth/login`)
      .send({ username: 'testadmin', password: 'TestAdmin123!' })
      .expect(401);
    await request(app)
      .post(`${API}/auth/login`)
      .send({ username: 'testadmin', password: 'ChangedAdmin123!' })
      .expect(200);

    await request(app)
      .post(`${API}/auth/change-password`)
      .set(auth(token))
      .send({
        currentPassword: 'ChangedAdmin123!',
        newPassword: 'TestAdmin123!',
        confirmPassword: 'TestAdmin123!',
      })
      .expect(200);
  });
});
