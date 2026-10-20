import type { RequestHandler } from 'express';
import { AuthenticationError, ErrorCode } from '../errors/index.js';
import type { UserRepository } from '../repositories/user.repository.js';
import { toPublicUser } from '../services/auth.service.js';
import { verifyAccessToken } from '../utils/tokens.js';

/**
 * Verifies the access token and re-loads the user on every request so that
 * deactivation or permission changes take effect immediately.
 */
export function authenticate(users: UserRepository): RequestHandler {
  return async (req, _res, next) => {
    try {
      const header = req.get('authorization') ?? '';
      const [scheme, token] = header.split(' ');
      if (scheme?.toLowerCase() !== 'bearer' || !token) {
        throw new AuthenticationError('A bearer access token is required.');
      }

      const payload = verifyAccessToken(token);
      const user = await users.findById(payload.sub);
      if (!user) throw new AuthenticationError('Account no longer exists.', ErrorCode.INVALID_TOKEN);
      if (!user.active) {
        throw new AuthenticationError('This account is disabled.', ErrorCode.ACCOUNT_DISABLED);
      }

      req.user = toPublicUser(user);
      next();
    } catch (error) {
      next(error);
    }
  };
}
