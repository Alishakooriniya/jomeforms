import { PERMISSION_CATALOG, PRESET_ROLES } from '../config/permissions.js';
import { logger } from '../config/logger.js';
import { query, withTransaction } from '../config/database.js';
import { hashPassword } from '../utils/password.js';

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

async function seedPresetRoles(): Promise<void> {
  for (const preset of PRESET_ROLES) {
    await withTransaction(async (client) => {
      const existing = await client.query<{ id: string }>('select id from roles where code = $1', [
        preset.code,
      ]);
      let roleId = existing.rows[0]?.id;

      if (!roleId) {
        const inserted = await client.query<{ id: string }>(
          `insert into roles (code, name, description, is_system)
           values ($1, $2, $3, true) returning id`,
          [preset.code, preset.name, preset.description],
        );
        roleId = inserted.rows[0]?.id;
      } else {
        await client.query(
          'update roles set name = $1, description = $2, is_system = true where id = $3',
          [preset.name, preset.description, roleId],
        );
      }

      if (!roleId) throw new Error(`Failed to seed role ${preset.code}`);

      await client.query('delete from role_permissions where role_id = $1', [roleId]);
      await client.query(
        `insert into role_permissions (role_id, permission_key)
         select $1, unnest($2::text[])`,
        [roleId, preset.permissions],
      );
    });
  }
  logger.info({ roles: PRESET_ROLES.length }, 'preset roles seeded');
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

export async function seed(): Promise<void> {
  await seedPermissions();
  await seedPresetRoles();
  await seedAdmin();
}
