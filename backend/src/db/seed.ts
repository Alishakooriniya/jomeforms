import { PERMISSION_CATALOG } from '../config/permissions.js';
import { logger } from '../config/logger.js';
import { query } from '../config/database.js';
import { hashPassword } from '../utils/password.js';
import { createClientWorkflow } from '../domain/workflow.js';

async function seedPermissions(): Promise<void> {
  const groups = Array.from(new Set(PERMISSION_CATALOG.map((permission) => permission.group)));
  for (const permission of PERMISSION_CATALOG) {
    await query(
      `insert into permissions (key, group_id, label, sort_order)
       values ($1, $2, $3, $4)
       on conflict (key) do update set group_id = excluded.group_id, label = excluded.label, sort_order = excluded.sort_order`,
      [
        permission.key,
        permission.group,
        permission.label,
        PERMISSION_CATALOG.filter((item) => item.group === permission.group).indexOf(permission),
      ],
    );
  }
  logger.info({ permissions: PERMISSION_CATALOG.length, groups: groups.length }, 'permissions seeded');
}

async function seedAdmin(): Promise<void> {
  const existing = await query<{ count: string }>('select count(*)::text as count from users');
  if (Number(existing.rows[0]?.count ?? 0) > 0) {
    logger.info('users already exist; skipping admin seed');
    return;
  }

  const username = process.env.SEED_ADMIN_USERNAME?.trim() || 'superadmin';
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME?.trim() || 'مدیر ارشد سامانه';

  if (!password || password.length < 8) {
    throw new Error(
      'SEED_ADMIN_PASSWORD (at least 8 characters) is required to create the first superadmin. Add it to backend/.env and run npm run db:seed again.',
    );
  }

  await query(
    `insert into users (username, full_name, password_hash, role, active)
     values ($1, $2, $3, 'superadmin', true)`,
    [username.toLowerCase(), fullName, await hashPassword(password)],
  );
  logger.info({ username }, 'initial superadmin created');
}

async function seedDemoClients(): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;

  const clients = [
    {
      code: 'TEST-IDENTITY-001',
      fullName: 'نمونه آزمایشی یک',
      nationalId: '0123456789',
      mobile: '09120000001',
      birthCertificateNumber: '123456',
      fatherName: 'نمونه',
      issuePlace: 'تهران',
      birthDate: '1370/01/01',
      residenceAddress: 'نشانی آزمایشی شماره یک، تهران',
    },
    {
      code: 'TEST-IDENTITY-002',
      fullName: 'نمونه آزمایشی دو',
      nationalId: '0123456789',
      mobile: '09120000002',
      birthCertificateNumber: '654321',
      fatherName: 'آزمایش',
      issuePlace: 'تهران',
      birthDate: '1375/05/10',
      residenceAddress: 'نشانی آزمایشی شماره دو، تهران',
    },
  ];

  for (const client of clients) {
    await query(
      `insert into clients
        (code, full_name, national_id, mobile, case_type, workflow,
         birth_certificate_number, father_name, issue_place,
         birth_date, residence_address, status)
       values ($1, $2, $3, $4, 'document_request', $5::jsonb, $6, $7, $8, $9, $10, 'new')
       on conflict (code) do update set
         full_name = excluded.full_name,
         national_id = excluded.national_id,
         mobile = excluded.mobile,
         case_type = excluded.case_type,
         workflow = excluded.workflow,
         birth_certificate_number = excluded.birth_certificate_number,
         father_name = excluded.father_name,
         issue_place = excluded.issue_place,
         birth_date = excluded.birth_date,
         residence_address = excluded.residence_address,
         status = excluded.status`,
      [
        client.code,
        client.fullName,
        client.nationalId,
        client.mobile,
        JSON.stringify(createClientWorkflow('document_request')),
        client.birthCertificateNumber,
        client.fatherName,
        client.issuePlace,
        client.birthDate,
        client.residenceAddress,
      ],
    );
  }

  logger.info({ clients: clients.length }, 'identity-only demo cases seeded');
}

export async function seed(): Promise<void> {
  await seedPermissions();
  await seedAdmin();
  await seedDemoClients();
}
