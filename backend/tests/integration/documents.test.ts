import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { hasTestDatabase, resetDatabase } from '../helpers/db.js';
import { API, app, auth, clientPayload, login, PNG_BUFFER } from '../helpers/api.js';

const describeDb = hasTestDatabase ? describe : describe.skip;

describeDb('documents and scans', () => {
  let token: string;
  let templateId: string;
  let clientId: string;

  beforeAll(async () => {
    await resetDatabase();
    token = (await login()).token;

    const template = await request(app)
      .post(`${API}/form-templates`)
      .set(auth(token))
      .send({
        title: 'قرارداد اجاره',
        category: 'rent',
        body: 'مستأجر {{tenant_name}} ملک {{address}} را اجاره کرد.',
        fields: [
          { id: 'f1', key: 'tenant_name', label: 'مستأجر', type: 'text', required: true },
          { id: 'f2', key: 'address', label: 'نشانی', type: 'text', required: true, source: 'address' },
          { id: 'f3', key: 'rent', label: 'اجاره', type: 'currency', required: false },
        ],
      })
      .expect(201);
    templateId = template.body.data.id;

    const client = await request(app)
      .post(`${API}/clients`)
      .set(auth(token))
      .send(clientPayload())
      .expect(201);
    clientId = client.body.data.id;
  });

  it('rejects missing required template values', async () => {
    const response = await request(app)
      .post(`${API}/documents`)
      .set(auth(token))
      .send({ templateId, clientId, values: { tenant_name: '' } })
      .expect(422);

    expect(response.body.error.message).toMatch(/required/i);
    expect(response.body.error.details[0].field).toBe('values.tenant_name');
  });

  it('creates a numbered document and autofills linked case fields', async () => {
    const response = await request(app)
      .post(`${API}/documents`)
      .set(auth(token))
      .send({ templateId, clientId, values: { tenant_name: 'علی رضایی', rent: '10000000' } })
      .expect(201);

    expect(response.body.data.number).toMatch(/^س-\d{4}-\d{4}$/);
    expect(response.body.data.values.address).toBe('خیابان ولیعصر');
    expect(response.body.data.templateVersion).toBe(1);
    expect(response.body.data.status).toBe('draft');
  });

  it('moves a document through its lifecycle and marks it printed', async () => {
    const created = await request(app)
      .post(`${API}/documents`)
      .set(auth(token))
      .send({ templateId, clientId, values: { tenant_name: 'علی رضایی' } })
      .expect(201);
    const id = created.body.data.id;

    const signed = await request(app)
      .patch(`${API}/documents/${id}/status`)
      .set(auth(token))
      .send({ status: 'signed' })
      .expect(200);
    expect(signed.body.data.status).toBe('signed');
    expect(signed.body.data.signedAt).toBeTypeOf('string');

    const invalid = await request(app)
      .patch(`${API}/documents/${id}/status`)
      .set(auth(token))
      .send({ status: 'completed' })
      .expect(422);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const printed = await request(app)
      .post(`${API}/documents/${id}/print`)
      .set(auth(token))
      .expect(200);
    expect(printed.body.data.printedAt).toBeTypeOf('string');
  });

  it('uploads a signed scan, serves it and marks the document scanned', async () => {
    const created = await request(app)
      .post(`${API}/documents`)
      .set(auth(token))
      .send({ templateId, clientId, values: { tenant_name: 'علی رضایی' } })
      .expect(201);
    const id = created.body.data.id;

    const scan = await request(app)
      .post(`${API}/documents/${id}/scans`)
      .set(auth(token))
      .attach('file', PNG_BUFFER, { filename: 'scan.png', contentType: 'image/png' })
      .expect(201);
    const scanId = scan.body.data.id;
    expect(scan.body.data.blobKey).not.toContain('..');

    const file = await request(app)
      .get(`${API}/documents/${id}/scans/${scanId}/file`)
      .set(auth(token))
      .expect(200);
    expect(file.headers['content-type']).toContain('image/png');

    const document = await request(app)
      .get(`${API}/documents/${id}`)
      .set(auth(token))
      .expect(200);
    expect(document.body.data.status).toBe('scanned');
    expect(document.body.data.scanIds).toContain(scanId);

    await request(app)
      .delete(`${API}/documents/${id}/scans/${scanId}`)
      .set(auth(token))
      .expect(204);
    await request(app)
      .get(`${API}/documents/${id}/scans/${scanId}/file`)
      .set(auth(token))
      .expect(404);
  });

  it('rejects files whose content does not match the declared type', async () => {
    const created = await request(app)
      .post(`${API}/documents`)
      .set(auth(token))
      .send({ templateId, clientId, values: { tenant_name: 'علی رضایی' } })
      .expect(201);

    const response = await request(app)
      .post(`${API}/documents/${created.body.data.id}/scans`)
      .set(auth(token))
      .attach('file', Buffer.from('<html>not an image</html>'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(415);
    expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('records meaningful actions in the audit trail', async () => {
    const audit = await request(app)
      .get(`${API}/audit-logs?entity=document`)
      .set(auth(token))
      .expect(200);
    expect(audit.body.meta.total).toBeGreaterThan(0);
    expect(audit.body.data[0]).toMatchObject({ entity: 'document' });
  });
});
