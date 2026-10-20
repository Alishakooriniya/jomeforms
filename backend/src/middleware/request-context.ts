import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/** Attach a correlation ID to every request and echo it back to the client. */
export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = req.get('x-request-id');
  const requestId = incoming && /^[A-Za-z0-9._-]{8,100}$/.test(incoming) ? incoming : randomUUID();
  req.requestId = requestId;
  req.validated = { body: undefined, query: undefined, params: undefined };
  res.setHeader('x-request-id', requestId);
  next();
};
