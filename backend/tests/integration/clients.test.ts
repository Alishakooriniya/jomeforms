import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { hasTestDatabase, resetDatabase } from '../helpers/db.js';
import { API, app, auth, clientPayload, login, PNG_BUFFER } from '../helpers/api.js';

const describeDb = hasTestDatabase ? describe : describe.skip;

describeDb('case files', () => {
  let token: string;

  beforeAll(async () => {
    await resetDatabase();
    token = (await login()).token;
  });

  it('creates a case file with a generated code and a workflow', async () => {
    const response = await request(app)
      .post(`${API}/clients`)
      .set(auth(token))
      .send(clientPayload())
      .expect(201);

    expect(response.body.data.code).toMatch(/^پ-\d{4}-\d{4}$/);
    expect(response.body.data.workflow.map((step: { id: string }) => step.id)).toEqual([
      'initial-request',
      'document-review',
      'case-completion',
    ]);
    expect(response.body.data.status).toBe('new');
  });

  it('returns validation details for invalid input', async () => {
    const response = await request(app)
      .post(`${API}/clients`)
      .set(auth(token))
      .send(clientPayload({ mobile: '12345', nationalId: '0000000000' }))
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(['mobile', 'nationalId']));
  });

  it('paginates and searches case files', async () => {
    await request(app)
      .post(`${API}/clients`)
      .set(auth(token))
      .send(clientPayload({ fullName: 'زهرا کریمی', nationalId: '0123456789' }))
      .expect(201);

    const page = await request(app)
      .get(`${API}/clients?page=1&limit=1&sortBy=createdAt&sortOrder=desc`)
      .set(auth(token))
      .expect(200);
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta).toMatchObject({ page: 1, limit: 1, total: 2, totalPages: 2 });

    const search = await request(app)
      .get(`${API}/clients?search=${encodeURIComponent('کریمی')}`)
      .set(auth(token))
      .expect(200);
    expect(search.body.meta.total).toBe(1);
    expect(search.body.data[0].fullName).toBe('زهرا کریمی');

    const badSort = await request(app)
      .get(`${API}/clients?sortBy=drop%20table`)
      .set(auth(token))
      .expect(200);
    expect(badSort.body.success).toBe(true);
  });

  it('enforces the evidence gate and records overrides with a reason', async () => {
    const created = await request(app)
      .post(`${API}/clients`)
      .set(auth(token))
      .send(
        clientPayload({
          caseType: 'rent_renewal',
          // Mirrors the UI: payment and external-reply steps are opt-in per case.
          workflow: [
            { id: 'initial-request', title: 'ثبت درخواست', kind: 'form', status: 'pending', requiresEvidence: false, evidenceIds: [] },
            { id: 'document-review', title: 'بررسی مدارک', kind: 'form', status: 'pending', requiresEvidence: false, evidenceIds: [] },
            { id: 'payment', title: 'رسید پرداخت', kind: 'payment', status: 'pending', requiresEvidence: true, evidenceIds: [] },
            { id: 'case-completion', title: 'تکمیل پرونده', kind: 'completion', status: 'pending', requiresEvidence: false, evidenceIds: [] },
          ],
        }),
      )
      .expect(201);
    const id = created.body.data.id as string;

    const steps = created.body.data.workflow as Array<{ id: string; requiresEvidence: boolean }>;
    await request(app)
      .post(`${API}/clients/${id}/workflow/steps/${steps[0]!.id}/complete`)
      .set(auth(token))
      .expect(200);
    await request(app)
      .post(`${API}/clients/${id}/workflow/steps/${steps[1]!.id}/complete`)
      .set(auth(token))
      .expect(200);

    const gated = await request(app)
      .post(`${API}/clients/${id}/workflow/steps/payment/complete`)
      .set(auth(token))
      .expect(409);
    expect(gated.body.error.message).toMatch(/evidence/i);

    const uploaded = await request(app)
      .post(`${API}/clients/${id}/workflow/steps/payment/evidence`)
      .set(auth(token))
      .attach('file', PNG_BUFFER, { filename: 'receipt.png', contentType: 'image/png' })
      .expect(201);
    expect(uploaded.body.data.name).toBe('receipt.png');

    const completed = await request(app)
      .post(`${API}/clients/${id}/workflow/steps/payment/complete`)
      .set(auth(token))
      .expect(200);
    expect(completed.body.data.status).toBe('in_progress');

    const missingReason = await request(app)
      .post(`${API}/clients/${id}/workflow/steps/case-completion/override`)
      .set(auth(token))
      .send({ reason: 'no' })
      .expect(422);
    expect(missingReason.body.error.code).toBe('VALIDATION_ERROR');

    const overridden = await request(app)
      .post(`${API}/clients/${id}/workflow/steps/case-completion/override`)
      .set(auth(token))
      .send({ reason: 'تأیید مدیر ارشد' })
      .expect(200);
    expect(overridden.body.data.workflow.at(-1)).toMatchObject({
      overrideReason: 'تأیید مدیر ارشد',
      status: 'completed',
    });
    expect(overridden.body.data.status).toBe('done');
  });

  it('enforces permissions per endpoint', async () => {
    await request(app)
      .post(`${API}/users`)
      .set(auth(token))
      .send({
        username: 'viewer',
        fullName: 'کاربر مشاهده‌گر',
        password: 'ViewerPass123!',
        role: 'admin',
        permissions: ['clients.view'],
      })
      .expect(201);

    const viewerToken = (await login('viewer', 'ViewerPass123!')).token;

    await request(app).get(`${API}/clients`).set(auth(viewerToken)).expect(200);
    await request(app).post(`${API}/clients`).set(auth(viewerToken)).send(clientPayload()).expect(403);
    await request(app).get(`${API}/users`).set(auth(viewerToken)).expect(403);
    await request(app).get(`${API}/audit-logs`).set(auth(viewerToken)).expect(403);
  });

  it('returns 404 for unknown case files', async () => {
    const id = '00000000-0000-4000-8000-000000000000';
    const response = await request(app).get(`${API}/clients/${id}`).set(auth(token)).expect(404);
    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});
