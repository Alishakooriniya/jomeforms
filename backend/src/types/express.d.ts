import type { User } from './domain.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      requestId: string;
      validated: {
        body: unknown;
        query: unknown;
        params: unknown;
      };
    }
  }
}

export {};
