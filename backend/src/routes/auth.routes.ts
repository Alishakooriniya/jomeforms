import { Router } from 'express';
import type { Container } from '../container.js';
import { AuthController } from '../controllers/auth.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  authenticate,
  requireSameOrigin,
  validate,
} from '../middleware/index.js';
import { changePasswordBodySchema, loginBodySchema } from '../validators/auth.validator.js';

export function createAuthRouter(container: Container): Router {
  const router = Router();
  const controller = new AuthController(container.services.auth);

  router.post(
    '/login',
    validate({ body: loginBodySchema }),
    asyncHandler(controller.login),
  );
  router.post('/refresh', requireSameOrigin, asyncHandler(controller.refresh));
  router.post('/logout', requireSameOrigin, asyncHandler(controller.logout));
  router.get('/me', authenticate(container.repositories.users), asyncHandler(controller.me));
  router.post(
    '/change-password',
    authenticate(container.repositories.users),
    validate({ body: changePasswordBodySchema }),
    asyncHandler(controller.changePassword),
  );

  return router;
}
