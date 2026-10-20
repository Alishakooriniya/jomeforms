import { describe, expect, it } from 'vitest';
import { hasPermission } from '../../src/middleware/authorize.js';

describe('permission checks', () => {
  it('denies anonymous users', () => {
    expect(hasPermission(undefined, 'clients.view')).toBe(false);
  });

  it('grants superadmins every permission', () => {
    expect(hasPermission({ role: 'superadmin', permissions: [] }, 'users.delete')).toBe(true);
  });

  it('honours the wildcard permission', () => {
    expect(hasPermission({ role: 'admin', permissions: ['*'] }, 'settings.edit')).toBe(true);
  });

  it('requires the exact permission key', () => {
    const user = { role: 'admin', permissions: ['clients.view'] };
    expect(hasPermission(user, 'clients.view')).toBe(true);
    expect(hasPermission(user, 'clients.edit')).toBe(false);
  });
});
