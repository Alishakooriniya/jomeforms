# Jomeforms API

REST backend for the Jomeforms real-estate case management and document system.
It serves the existing React frontend in `../src` and mirrors its domain model
field-for-field, so responses can be consumed without a mapping layer.

Stack: **Node.js 22+, Express 5, TypeScript (ESM), PostgreSQL 16, `pg`, Zod,
JWT access tokens + rotating refresh cookie, Pino, Vitest + Supertest.**

---

## 1. Architecture

```
HTTP request
  → middleware (request id, logging, helmet, cors, auth, validation)
  → route            (method + path + middleware + controller only)
  → controller       (extract validated input, call a service, send the envelope)
  → service          (business rules, permissions-adjacent checks, audit events)
  → repository       (parameterised SQL, row ↔ domain mapping)
  → PostgreSQL
```

Rules that keep the layers honest:

- routes contain no business logic;
- controllers never build SQL and never receive repository objects;
- services never touch `req`/`res`;
- repositories never decide policy;
- every mutation is validated and audited.

```
backend/
├── db/migrations/001_init.sql   initial schema and settings
├── db/migrations/002_template_print_layout.sql
├── db/migrations/003_identity_only_clients.sql
├── db/migrations/004_persian_dates.sql
├── docs/openapi.yaml            OpenAPI 3.1 document (served at /api/docs)
├── src/
│   ├── app.ts                   Express app factory (testable, no listen)
│   ├── server.ts                process entrypoint, graceful shutdown
│   ├── container.ts             composition root (repositories + services)
│   ├── config/                  env validation, pool, logger, permission catalog
│   ├── controllers/             thin HTTP adapters
│   ├── domain/workflow.ts       case workflow rules (step order, status changes)
│   ├── errors/                  AppError hierarchy + error codes
│   ├── middleware/              auth, authorization, validation, upload, errors
│   ├── repositories/            SQL per aggregate
│   ├── routes/                  one router per resource, mounted under /api/v1
│   ├── services/                business logic, storage abstraction, audit
│   ├── types/                   domain model + Express request augmentation
│   ├── utils/                   templates, Jalali dates, pagination, tokens
│   ├── validators/              Zod schemas per resource
│   └── db/                      migrate / seed / cli
└── tests/                       unit + integration suites
```

### Response contract

Success:

```json
{ "success": true, "data": {}, "message": "optional", "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }
```

Error:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed.", "details": [{ "field": "mobile", "message": "…" }], "requestId": "…" } }
```

Every response echoes `x-request-id`; internal errors are logged with that id and
never leak stack traces (production hides 5xx messages entirely).

---

## 2. Installation

Requirements: Node.js ≥ 22 and a PostgreSQL ≥ 14 database.

```bash
cd backend
npm install
cp .env.example .env        # then edit values
```

## 3. Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development` / `test` / `production` |
| `PORT` | no | `4000` | HTTP port (shell env wins over `.env`) |
| `API_PREFIX` | no | `/api/v1` | API mount path |
| `DATABASE_URL` | **yes** | – | PostgreSQL connection string |
| `DATABASE_SSL` | no | `false` | Enable TLS (usually `true` in production) |
| `DATABASE_POOL_MAX` | no | `10` | Pool size |
| `JWT_SECRET` | **yes** | – | ≥ 32 chars, never commit |
| `JWT_EXPIRES_IN` | no | `15m` | Access token lifetime |
| `JWT_ISSUER` / `JWT_AUDIENCE` | no | `jomeforms-api` / `jomeforms-web` | Token claims |
| `REFRESH_TOKEN_TTL_DAYS` | no | `7` | Refresh cookie lifetime |
| `COOKIE_SECURE` | no | `true` in production | Send the refresh cookie over HTTPS only |
| `CORS_ORIGINS` | no | `http://localhost:5173,…` | Allowed browser origins |
| `LOG_LEVEL` | no | `info` | Pino level (`silent` in tests) |
| `TRUST_PROXY` | no | `0` | Express `trust proxy` hops |
| `UPLOAD_DIR` | no | `./var/uploads` | Where scans/evidence are written |
| `MAX_UPLOAD_MB` | no | `10` | Upload size limit |
| `SEED_ADMIN_*` | seed only | – | First superadmin created by `db:seed` |

The app validates configuration at startup and exits with a readable error when
something mandatory is missing. `dotenv` does not override variables already
exported by the shell, so `PORT=4000 npm run dev` is a reliable override.

## 4. Database setup

```bash
# any local PostgreSQL works; example with Docker
docker run -d --name jomeforms-postgres \
  -e POSTGRES_USER=jomeforms -e POSTGRES_PASSWORD=jomeforms_dev \
  -e POSTGRES_DB=jomeforms -p 55433:5432 postgres:16-alpine

cd backend
export DATABASE_URL=postgres://jomeforms:jomeforms_dev@127.0.0.1:55433/jomeforms
npm run db:migrate     # applies db/migrations/*.sql in order
npm run db:seed        # permission catalog + admin + two identity-only demo cases
npm run db:verify      # prints tables and row counts
```

`npm run db:reset` **drops the schema** and is development-only.

The seed loads the permission catalog from `src/config/permissions.ts`, which
mirrors the frontend permission catalog. Permissions are assigned per user —
there are no reusable role bundles; the superadmin edits each manager's
permissions directly via `PUT /users/{id}/permissions`.
The first superadmin password comes from `SEED_ADMIN_PASSWORD`; change it after
the first login.

## 5. Running locally

```bash
npm run dev        # tsx watch src/server.ts
```

- API: `http://localhost:4000/api/v1`
- Health: `http://localhost:4000/health`
- Swagger UI: `http://localhost:4000/api/docs`
- Raw spec: `http://localhost:4000/api/openapi.yaml`
- Manager account administration is available at `/api/v1/admin-users` to
  authenticated superadmins only. `POST /api/v1/auth/change-password` changes
  the current user's password and revokes all refresh sessions.
- Error messages returned by the API are localized in Persian; clients should
  display the response's `error.message`.
- Date-only input and stored values use valid Jalali `YYYY/MM/DD` strings.
  Persian/Arabic digits are normalized, and Gregorian `YYYY-MM-DD` input is
  rejected. Audit and other operational timestamps remain ISO date-time values;
  date filters are converted to Gregorian boundaries only when querying those
  timestamps.

## 6. Tests

```bash
# unit tests only (no database needed)
npm test

# unit + integration against a disposable database
export TEST_DATABASE_URL=postgres://jomeforms:jomeforms_dev@127.0.0.1:55433/jomeforms_test
createdb -h 127.0.0.1 -p 55433 -U jomeforms jomeforms_test   # once
npm test
```

Integration suites are skipped — not failed — when `TEST_DATABASE_URL` is not
set. The helper refuses to run if the URL does not contain `test`, because it
truncates every table before each suite. Migration runs automatically.

Suites cover: login/refresh rotation/logout/deactivation, permission
enforcement, validation, case creation and numbering, search + pagination,
workflow evidence gates and manager overrides, document numbering, required
template values, status lifecycle and scan upload/serving/type spoofing.

## 7. API summary

All routes are under `/api/v1`. `…/{id}` expects a UUID.

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/auth/login`, `/auth/refresh`, `/auth/logout` | public (cookie/Origin guarded) |
| GET | `/auth/me` | authenticated |
| GET/POST | `/users` | `users.view` / `users.create` |
| GET/PATCH/DELETE | `/users/{id}` | `users.view` / `users.edit` / `users.delete` |
| PUT | `/users/{id}/permissions` | `users.edit` |
| PATCH | `/users/{id}/status` | `users.edit` |
| GET | `/permissions` | authenticated catalog |
| GET/POST | `/companies` | `companies.view` / `companies.create` |
| GET/PATCH/DELETE | `/companies/{id}` | `companies.view` / `companies.edit` / `companies.delete` |
| PUT | `/companies/{id}/members` | `companies.edit` |
| GET/POST | `/clients` | `clients.view` / `clients.create` |
| GET/PATCH/DELETE | `/clients/{id}` | `clients.view` / `clients.edit` / `clients.delete` |
| POST | `/clients/{id}/workflow/steps/{stepId}/complete` | `clients.workflow.advance` |
| POST | `/clients/{id}/workflow/steps/{stepId}/evidence` | `clients.workflow.advance` |
| POST | `/clients/{id}/workflow/steps/{stepId}/override` | `clients.workflow.override` |
| GET | `/clients/evidence/{evidenceId}/file` | `clients.view` |
| GET/POST | `/form-templates` | `templates.view` / `templates.create` |
| GET/PATCH/DELETE | `/form-templates/{id}` | `templates.view` / `templates.edit` / `templates.delete` |
| POST | `/form-templates/{id}/duplicate` | `templates.create` |
| GET/POST | `/documents` | `documents.view` / `documents.create` |
| GET/PATCH/DELETE | `/documents/{id}` | `documents.view` / `documents.edit` / `documents.delete` |
| PATCH | `/documents/{id}/status` | `documents.status` |
| POST | `/documents/{id}/print` | `documents.print` |
| GET/POST | `/documents/{id}/scans` | `documents.view` / `documents.upload` |
| GET | `/documents/{id}/scans/{scanId}/file` | `documents.view` |
| DELETE | `/documents/{id}/scans/{scanId}` | `documents.upload` |
| GET/DELETE | `/audit-logs` | `audit.view` / `audit.clear` |
| GET/PATCH | `/settings` | `settings.view` / `settings.edit` |

List endpoints accept `page`, `limit`, `search`, `sortBy`, `sortOrder` plus
resource filters; sort columns are whitelisted per repository.

## 8. Authentication

1. `POST /auth/login` verifies the bcrypt hash (constant work for unknown
   usernames to avoid user enumeration), stores a hashed refresh token in
   `sessions`, records an audit entry, returns a short-lived JWT in the body and
   sets `jf_refresh` as an **HttpOnly, SameSite=Strict** cookie (Secure in
   production, path `/`).
2. Authenticated calls send `Authorization: Bearer <token>`. `authenticate`
   re-loads the user on every request, so deactivation or permission changes
   apply immediately.
3. `POST /auth/refresh` rotates the refresh token and issues a new access token.
4. `POST /auth/logout` deletes the session and clears the cookie.
5. Resetting a password, deactivating or deleting a user revokes all sessions.

Permission checks combine role (`superadmin` bypasses checks) and the explicit
`permissions` array. `/permissions` exposes the catalog with Persian labels so
the UI can render the same groups.

## 9. Database model

`users`, `permissions`, `user_permissions`,
`companies`, `clients` (workflow + evidence as JSONB), `workflow_evidence`,
`form_templates`, `form_template_versions`, `documents`, `document_scans`,
`document_status_history`, `sessions`, `audit_logs`, `app_settings`,
`number_sequences`, `schema_migrations`.

Notable decisions:

- **UUID primary keys** generated by the database; timestamps are `timestamptz`.
- **Unique constraints** on usernames, case codes, document numbers and
  `(template_id, version)`. Templates are never mutated in place: editing creates
  a new version row, so old documents keep their snapshot.
- **Numbers** for cases and documents come from `number_sequences` in one
  transaction (`kind, year` → last number), formatted with the Jalali year and
  the configurable prefixes in `app_settings`.
- **Workflow** lives on the case as ordered JSON steps so case types can evolve
  without migrations; the server still enforces order and evidence rules.
- **Audit** is append-only and written for every meaningful mutation.
- **Soft deletion is not used**; deletes cascade to dependent rows. Deleting a
  company detaches users instead of deleting them.
- Files are stored on disk behind the `FileStorage` interface (`save`, `read`,
  `delete`) so object storage can replace it without touching services.

## 10. Adding a feature / endpoint

1. Add the column/table in a **new** `db/migrations/00X_*.sql`; never edit an
   applied migration.
2. Extend `src/types/domain.ts`.
3. Add the SQL in the matching `repositories/*.repository.ts` (parameterised
   only; whitelist sortable columns).
4. Put business rules in `services/*.service.ts`; throw the shared errors and
   record an audit entry for mutations.
5. Describe the payload with a Zod schema in `validators/*.validator.ts`.
6. Add a thin handler in `controllers/*.controller.ts` using `sendSuccess`,
   `sendPaginated` or `sendNoContent`.
7. Register the route with `authenticate`, `requirePermission`,
   `validate` and `asyncHandler`.
8. Wire nothing manually: `container.ts` already exposes the repositories and
   services; add new ones there if needed.
9. Cover the behaviour with a unit or integration test and update
   `docs/openapi.yaml`.

## 11. Frontend integration

The browser app is intentionally local-first (`DESIGN.md`), so the backend is
consumed in **server mode**, enabled with `VITE_API_MODE=server` at the repo
root. In that mode the login screen authenticates against `POST /auth/login`,
restores the session through the rotating refresh cookie and reads permissions
from the API. The typed client lives in `src/lib/apiClient.ts` and mirrors the
response envelope and endpoint list documented here. Local mode (the default)
keeps using browser storage, so offline demos still work.

Vite proxies `/api` to `http://127.0.0.1:4000` in development (see
`vite.config.ts`), so no CORS setup is needed for local UI work; direct API
calls from other origins must be listed in `CORS_ORIGINS`.

## 12. Docker

The repository root contains a complete Compose stack: `db` (PostgreSQL 16),
`migrate` (one-shot schema upgrade), `api` (this service), `web` (nginx + built
frontend) and an opt-in `seed` profile.

```bash
cp docker/.env.example docker/.env   # set JWT_SECRET and POSTGRES_PASSWORD
npm run docker:up                    # docker compose --env-file docker/.env up -d --build
npm run docker:seed                  # optional: create the first superadmin
docker compose --env-file docker/.env ps
```

- The web container proxies `/api/*` to `api:4000`, so the browser only talks to
  one origin; set `PUBLIC_ORIGIN` to that origin (CORS + refresh-cookie check).
- `migrate` must finish before `api` starts (`service_completed_successfully`).
  It is safe to run on every deploy because applied files are recorded.
- Uploads live in the `uploads` volume and the database in `db_data`; both
  survive `docker compose down`. `npm run docker:reset` removes them.
- The image is multi-stage (`node:22-alpine`), installs production dependencies
  only, runs as the unprivileged `node` user, and ships `db/` + `docs/` so the
  migrate service and Swagger UI work from the same image.
- Behind HTTPS set `COOKIE_SECURE=true` in `docker/.env`; the default Compose
  value is already `true`, use `false` only for local HTTP access.

## 13. Production notes

```bash
npm run build      # tsc → dist/
NODE_ENV=production node dist/server.js
```

- Put a TLS-terminating proxy in front; set `TRUST_PROXY=1` and `COOKIE_SECURE=true`.
- Run migrations as a deploy step (`npm run db:migrate`), then start the app.
- Store uploads on a persistent volume or swap `FileStorage` for object storage.
- `GET /health` checks the database and returns 503 when it is unreachable.
- Logs are JSON on stdout (Pino); ship them to your log platform. Credentials,
  cookies and request bodies are never logged.
