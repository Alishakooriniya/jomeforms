-- ============================================================================
--  Drop the reports feature — the /reports page and API were removed; the
--  reports.* permission keys are retired. The FK cascade also clears matching
--  rows in user_permissions.
-- ============================================================================

delete from permissions where key like 'reports.%';
