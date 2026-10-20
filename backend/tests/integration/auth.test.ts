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
});
