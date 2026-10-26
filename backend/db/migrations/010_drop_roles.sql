-- ============================================================================
--  Drop reusable role bundles — permissions are assigned per user only
--  (superadmin edits each manager's permissions directly; there is no roles
--  page or roles API anymore).
-- ============================================================================

drop table if exists role_permissions;
drop table if exists roles;

-- remove the retired role-management permission keys; the FK cascade also
-- clears matching rows in user_permissions
delete from permissions where key like 'roles.%';
