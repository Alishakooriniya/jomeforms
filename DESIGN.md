# Design Guide for Jomeforms

This document is the source of truth for the product structure, UI patterns, and engineering decisions. Any agent or contributor making design or architecture changes must read this file before editing layout, theme, state flow, permissions, or component structure.

## 1. Product intent

Jomeforms is a server-backed CRM and document management application with Persian/RTL ergonomics. All business data lives in PostgreSQL behind the `backend/` API; the frontend is a thin client. The system is designed to support:

- client records and company relationships
- document management with scans and templates
- permission-based access control and audit tracking
- theme customization (the only browser-persisted preference)

The primary workflow is registering and processing case files, then collecting and generating the documents attached to them. Pricing is supporting data, not a primary dashboard or case-list signal. Current case groups are document requests and rent renewals; their detailed forms can be introduced independently while common and group-specific steps remain trackable.

The app is intentionally opinionated: the design should feel cohesive, structured, and business-application oriented rather than generic dashboard-only.

## 2. Architecture overview

### Core composition

The application root in `src/App.tsx` composes providers in a strict order:

1. `ErrorBoundary`
2. `ThemeProvider`
3. `ToastProvider`
4. `DataProvider`
5. `AuthProvider`
6. `AppRoutes`

This order is important. Theme, data, and auth must be available before route rendering. Route-level security and permission checks sit at the route layer, not inside individual pages.

### Route and permission model

- Protected pages live inside the main `AppLayout` shell.
- Public pages such as `/login` remain outside the protected routing tree.
- `RequireAuth` protects the full application shell.
- `RequirePermission` guards individual routes and actions.
- `HomeRedirect` chooses a valid landing page based on the user's permission set.

This keeps access control centralized and predictable.

## 3. State and data patterns

### Central store

`src/store/DataProvider.tsx` is the client-side cache and single gateway for business operations. All CRUD logic for clients, documents, templates, users, companies, reminders, settings, and audit entries lives here; every action calls the API and writes the server's authoritative response back into the cached `DbShape`. Pages keep consuming `useDb()`/`useDbActions()` and do not talk to the API directly (except lazy file/blob fetches via `api.*Blob`).

Design rules:

- keep business operations in the provider rather than scattering them across pages
- all actions are async (`Promise`-returning); optimistic updates are avoided — the server response is the truth that gets cached
- preserve audit logging for meaningful actions (it happens server-side; the provider just refreshes the cached audit list)
- treat PostgreSQL as the single source of truth; the in-memory `DbShape` is only a cache
- lazy-load heavy collections: document scans load per document (`loadDocumentScans`), workflow evidence loads per client (`loadClientDetail`)
- avoid direct mutation of arrays/objects in page components

### Server-backed persistence (no local mode)

The application is server-only. The former local-first mode (browser `localStorage`/`IndexedDB` database, client-side demo seeding, local auth) was removed deliberately — the product requirement is that the UI always displays the backend data.

- `src/lib/apiClient.ts` is the single HTTP client (envelope, versioned paths,
  in-memory access token, refresh-cookie session recovery, typed resources)
- `AuthProvider` authenticates through `POST /auth/login`, restores the session
  through the rotating HttpOnly cookie, and reads permissions from the server
- account profiles and password changes use authenticated API endpoints; password
  changes revoke all refresh sessions and return the user to sign-in
- reminders, letterhead prints, settings, audit logs, and backup export/import
  are all server resources (`/reminders`, `/letterhead`, `/settings`,
  `/audit-logs`, `/backup`)
- uploaded files (document scans, workflow evidence) live on the server and are
  fetched as authenticated blobs (`api.documents.scanBlob`,
  `api.clients.evidenceBlob`)
- the access token is never persisted; the only `localStorage` key is the theme
  preference (`crm.theme.v1`) plus a one-time cleanup pass that removes legacy
  `crm.*` business-data keys
- reusable permission roles (`PermissionRole`, `/roles` page) were removed;
  permissions are assigned per user in the user editor's `PermissionMatrix`.
  Exactly one `superadmin` account may exist — it is created by the seed and the
  API rejects creating or promoting a second one — so the user editor has no
  role selector: every account created from it is an `admin` whose access comes
  solely from the permissions checked in the matrix. The editor collects only
  full name, username, mobile, password, active flag, and permissions
  The backend `/roles` routes, services, and the `roles`/`role_permissions`
  tables were removed as well (migration `010_drop_roles.sql`); the
  `roles.view`/`roles.manage` permission keys no longer exist. `GET
  /permissions` still exposes the catalog for permission-assignment UIs

### Audit trail

Actions are logged inside the central data layer with metadata such as:

- action name
- entity type
- entity ID
- entity label
- user name and user ID
- timestamp

This is a required pattern for operational transparency and should remain intact for all business actions.

Case records include an auditable workflow. Payment receipts and replies from external organizations are stored as local evidence and can gate completion of their respective steps. A manager may override an evidence gate only with a recorded reason. Case summaries combine case, document, scan, and workflow audit events with their exact timestamps.

## 4. UI and layout design

### Shell layout

`src/components/layout/AppLayout.tsx` defines the default shell:

- desktop sidebar
- mobile drawer menu
- header/topbar area
- main content area with max-width container
- footer metadata

The layout is intentionally stable so pages primarily define content rather than rebuilding the application shell.

### Theme system

`src/store/ThemeProvider.tsx` handles theme preference and applies it to `document.documentElement`:

- `dark` class toggled on root — the product intentionally ships only light/dark; there is no system mode, accent picker, or radius picker (product decision, 2026-10: keep one brand palette and one radius)
- persisted mode via storage helpers
- the header button toggles dark/light directly; Settings → پوسته offers the same two choices

Use the theme configuration from `src/config/theme.ts` and the design tokens already defined rather than creating unscoped custom colors or arbitrary spacing rules.

### Design language

The app uses a consistent product-style system:

- compact, business-focused UI
- semantic tokens for color, border, surface, and text
- strong emphasis on readability and dense data views
- RTL-aware layout and Persian labels
- utility-driven layout patterns with CSS variables for theme adaptation

Case registration is a dedicated page rather than a creation modal. The primary global search is deliberately limited to full name, national ID, case number, and related company name. Creating a new form/document remains available as a secondary operation from the relevant case.

Case registration captures only the applicant's identity and contact details:
full name, national ID, mobile, birth certificate number, father's name, issue
city, birth date, and residential address. Names accept letters and Persian
joiners rather than digits; mobile numbers must be 11 digits starting with 09,
and birth certificate numbers are limited to 10 digits. Counterparty and
property/financial data are not part of a case record. The API and database
follow the same shape; case number, request type, company link, status,
workflow, audit metadata, and document relations remain operational
case-management fields.

User-entered date-only values use the Jalali calendar throughout the UI and API,
are stored as `YYYY/MM/DD`, and reject Gregorian-formatted inputs. Audit and
other operational timestamps remain ISO instants in storage and are displayed
using the Jalali calendar; they must not be converted into calendar strings.
The Jalali date picker is RTL-aligned and allows direct month and year selection
as well as choosing a day from the calendar grid.

When introducing new UI, prefer existing patterns and token names over hard-coded values.

The form library lives in the management nav group as «فرم‌ها» (`/templates`).
It is a manager-only area: the list and editor routes require
`templates.edit` (and `templates.create` for the new-form route), so staff
accounts never see the template library itself. Regular users only *use* the
forms a manager has registered — `templates.view` means "use forms in
documents" and gates `DocumentCreate`, while `templates.create`,
`templates.edit`, and `templates.delete` are the management permissions. The
backend mirrors this split: `GET /form-templates` requires `templates.view`
(reading a form to use it) and the mutation routes require the management
permissions.

Template authoring follows a short guided flow: name and categorize the form,
add questions using Persian labels, then write and preview the printable text.
Internal field keys are generated automatically and remain out of the way;
less-common field and template settings stay available under expandable
"more settings" sections. In the text editor, fields are inserted by their
human-readable labels rather than exposing template syntax as the primary UX.

Official forms with a fixed paper frame are rendered in one of two ways.
Simple fixed frames (border + checkboxes + date line) are drawn in frontend
HTML/SVG (`document-request-a4` layout) — keep the A4 frame and its
non-editable geometry in the named frontend print layout; keep editable wording
and field definitions in the template data so they continue to persist and be
versioned with the backend template. Preview and print must use the same
code-rendered layout, preserve the source form's page dimensions, and leave the
surrounding app layout and shared document patterns unchanged.

Forms whose paper original is dense or fixed (the regional office's official
request forms, e.g. FN04 «تقاضای صدور سند») use the **canvas layout**
(`canvas-a4`, 2026-10): like the letterhead, the page extracted from the
source PDF is bundled as a frame image in `public/forms/` and field values
are layered on top of it at percentage-of-page positions. This diverges from
the HTML/SVG rule on purpose — the value layer is data-driven (`canvas` jsonb
on `form_templates`, versioned with the template) so a manager can reposition
fields from the «چیدمان روی فرم» tab of the template editor without touching
code, which a hand-redrawn HTML layout cannot offer. `x`/`y` mark the value's
horizontal-left and vertical-center in % of the page; each value renders with
a white background so it covers the baked dotted blank exactly and no gap is
left visible. `option` placements draw a check over the frame's baked ☐ boxes
for select fields. Frames are bundled assets — admins edit positions only and
do not upload new frames; new official forms get their frame added with code.
`src/lib/canvasFormPrint.ts` and `CanvasFormPreview` share the same model, so
preview and print are identical.

Form documents use B Nazanin as their typeface in both preview and print. The
family stack lives once in `src/index.css` (`.form-font` for screen) and once in
`src/lib/print.ts` (`FORM_FONT_FAMILY`/`FORM_FONT_FACE` for standalone print
documents); the font resolves from the OS installation first and optionally
from bundled files in `public/fonts/`. Every form page also draws a page border
(about 8 mm inside the paper edge): the fixed A4 layout shares its frame
geometry via `DOCUMENT_REQUEST_FRAME` in `src/lib/documentRequestPrint.ts`, and
the generic document sheet paints the same frame with a fixed-position element
in print and an absolutely-positioned inset div in `DocumentPreview`.

## 5. Component conventions

### Reusable UI layer

The app should favor the primitives under `src/components/ui/`:

- `Button`
- `Field`
- `Card`
- `Table`
- `Modal`
- `Drawer`
- `Tabs`
- `Pagination`
- `Badge`
- `Avatar`
- `EmptyState`

This is the visual system for the app. Pages should compose these building blocks instead of creating one-off markup patterns each time.

### Business components

Domain-specific widgets live under `src/components/clients`, `companies`, `documents`, `form`, and `layout`.

- feature components should stay focused on one domain
- shared business rules belong to the store or utility layer
- page-level logic should not duplicate general form behavior when a reusable component exists

## 6. File organization conventions

The repo is organized by responsibility:

- `src/App.tsx`: app composition and router setup
- `src/config/`: navigation and theme config
- `src/data/`: labels, permissions, templates, seed data
- `src/lib/`: utilities, formatters, persistence, crypto, printing
- `src/pages/`: route-level screens
- `src/store/`: global state and providers
- `src/components/`: reusable UI + domain components
- `src/types.ts`: central shared types

Follow this structure unless there is a very strong reason to change it. New files should fit the same responsibility-based organization.

## 7. Coding and UI design rules

- Keep changes small and consistent with the existing system.
- Do not add ad hoc CSS classes that bypass the theme system.
- Prefer composition over duplication.
- Keep forms and tables aligned with established naming and behavior.
- Preserve RTL support and Persian language conventions.
- Maintain the server-backed data flow — no business data in browser storage.
- When adding a new permission or route, update the navigation config and access checks together.
- When changing a design element, update the functional context and documentation in the same change.

## 8. Required change workflow for future agents

Before any design-related modification, do the following:

1. Read this file completely.
2. Review the relevant provider or component where the current behavior lives.
3. Preserve the existing architecture unless a clear product necessity requires a break.
4. Document the reason for any intentional design deviation in this file.
5. Keep the design system consistent with the app's tone and domain.

## 9. Design decision principles

These are the non-negotiables to preserve:

- server-backed data architecture (PostgreSQL is the source of truth)
- provider-driven state management
- route-level permission enforcement
- reusable UI primitives and consistency
- centralized audit logging
- theme-driven visual identity
- Persian/RTL-first UX

## 10. UI refinement decisions (2026-10)

The frontend was tightened around scan-ability and lower cognitive load. The backend, API contracts, permissions, audit logging, and data model were left untouched. These decisions are now the reference for future UI work:

### Page headers

- Top-level pages (lists, dashboard, settings) do not show breadcrumbs; breadcrumbs render only when a route is more than one level below a section (for example a case or document detail).
- Large decorative icon tiles are removed from page headers. Page identity comes from the title, subtitle, and the active sidebar item. The `icon` prop remains accepted for compatibility but is not rendered as a header ornament.
- One primary action per page stays in the header; secondary actions (export, delete, alternate outputs) are secondary buttons or inside an overflow menu.

### Tables

- Tables are the primary scanning surface and every row is single-line. Global table cells use `whitespace-nowrap`; long text is truncated with a `title` tooltip, never wrapped into multiple lines. Row height is 40px (compact) and must not grow because of secondary information.
- Columns are chosen for the task, not for completeness. Secondary fields belong in the record detail, an expandable section, or a context menu.
- Empty states render inside the table body so the header and result area stay coherent. List pages use the shared `DataTable`; one-off table markup is not allowed.

### List toolbars

- Lists show one search field, one (occasionally two) primary filters, and a `فیلتر بیشتر` disclosure for template/date/company/membership/permission filters. The disclosure opens inline and is not a second page.
- Active filters appear as removable chips inside the toolbar. Search stays full-width on small screens and shares the row with filters only from `sm` upward.

### Case detail (no tabs)

The case page is a single coherent screen instead of four tabs, kept deliberately minimal: a compact four-cell summary strip, then one merged card holding the workflow above the case documents table, separated by a slim in-card subheader. The workflow renders as a horizontal stepper (scrollable on narrow screens); clicking a node selects it and the selected step's status, evidence files, upload, completion, and manager-override disclosure render in a detail row beneath the stepper — defaulting to the active step. There is no side column — applicant details and the activity history open as dialogs from ghost icon buttons in the page header (eye = مشخصات متقاضی، history = تاریخچه فعالیت، edit = ویرایش پرونده, the last gated by `clients.edit`). All previous actions and audit data remain available; only their presentation changed.

### Document detail (no tabs)

The document preview is the primary surface. Recorded values are an expandable section directly below the preview. The side column holds document path, archived scans, and notes. Basic metadata lives in the header subtitle and the path card instead of a separate card. Print, edit, status changes, downloads, and deletion keep their existing behavior.

### Dashboard

The dashboard is action-first: open work (overdue evidence, documents awaiting signature), then active case metrics, then recent cases and the activity feed. Every metric has a working link with the correct filter; numbers are only shown when they lead somewhere.

### Reminders

Managers define time-bound reminders at `/reminders` (permission `reminders.manage`, under the management nav group): reminder text, a Jalali date that defaults to today, an optional `HH:MM` time, and a target user. A reminder without a time is due at the start of its day. Due reminders surface in the recipient's topbar bell — the same dropdown that lists documents awaiting signature, now shown to every signed-in user — and selecting one marks it done. The dashboard header keeps a secondary shortcut button to the page. Reminders are a server resource (`/reminders`), stored in PostgreSQL and audit-logged like other entities (`reminder`).

### Brand identity

The product is «محبوسات عام المنفعه امام جمعه», held in the static `ORG_NAME` constant in `src/config/org.ts` — it is not stored in settings, local storage, or the backend and is not editable from the settings page (the `orgName`/`orgLegalName` fields were removed from the settings model, API, and `app_settings` table). The brand is deliberately text-only — there is no logo or icon and none should be introduced. In the sidebar header and on the login page the name renders in IranNastaliq via `.nastaliq-font` (files in `public/fonts/`) in brand green (`brand-700` light / `brand-400` dark); everywhere else the standard UI font is used. The document title, footer, print header, and the `__org_name` template token all resolve to `ORG_NAME`.

The login page is a single centered composition with minimal copy: the Nastaliq org name over a compact sign-in card that posts to `POST /auth/login`. There are no demo-account chips — authentication is server-only. There is no marketing panel or feature list.

### Navigation and forms

The sidebar brand shows the static `ORG_NAME` from `src/config/org.ts`; the management group is collapsed unless one of its routes is active. Account administration lives in a single «کاربران» page (`/users`) — the former superadmin-only «مدیریت مدیران» page was merged into it (2026-10) since both managed the same accounts; `/admin-users` redirects to `/users`, and each row's «مشاهده عملکرد» action deep-links to `/audit?user=<id>` for the per-user activity report the old page showed inline. The dedicated `/admin-users` API routes remain available server-side; the frontend simply no longer consumes them. On the dedicated registration page (`/clients/new`) the case form renders as one unified grid — all fields visible, only full name required, every field validated (name/letters, national-ID checksum, mobile format, certificate digits, Jalali date, length caps matching the API schema). The edit dialogs instead keep the supplementary fields under a collapsible `اطلاعات تکمیلی` disclosure that auto-opens when the record already has such data (`ClientForm`'s `alwaysShowExtra` prop). Redundant dashboard-style stat cards and duplicated summary cards were removed from collections, audit, and role pages; the information they repeated is still available in the main list or detail view.

All of these are frontend-only changes. Do not move filtering, numbering, permissions, or workflow rules out of the store/API while refining presentation.

The dedicated «گزارش‌ها» page (`/reports`) was removed (2026-10) — the product
does not need a separate analytics screen; the dashboard covers the actionable
overview and «گزارش فعالیت» covers accountability. The `reports.view` and
`reports.export` permission keys, the backend `/reports` routes, service,
repository, and validator, and the `api.reports` client methods were removed
with it (migration `011_drop_reports_permissions.sql` deletes the retired
keys). The letterhead print log that used to live on that page was removed
from the UI — prints are still recorded server-side and remain queryable via
`GET /letterhead/prints` (`letterhead.manage`). The audit-page CSV export is now simply
part of `audit.view` — it exports rows the viewer already sees.

### Letterhead

The official letterhead lives at `/letterhead` as a standalone page and is never reused inside form documents. To stay pixel-identical to the organization's printed stationery, the three separated boxes — fixed header with the Nastaliq brand mark and dotted تاریخ/شماره/پیوست lines, the large middle writing box, and the footer address box — are **not redrawn in HTML**: they come from `public/letterhead/frame.jpg`, the frame image extracted from the source letterhead PDF (1287×1812 ≈ 155dpi). The image fills the whole sheet; editable content is layered on top of it:

- **Header meta values** — تاریخ/شماره/پیوست render as absolutely-positioned text on the baked dotted lines (`LETTERHEAD_META_FIELDS` tops are measured in image-pixel rows).
- **Middle box** — a simple canvas: a `contentEditable` region inside the box where the letter is typed directly. The toolbar above the preview offers bold, italic, underline, right/center/left alignment, and text color (`document.execCommand`; paste is forced to plain text). The stored value is the region's `innerHTML`, sanitized to a small tag/style allowlist before printing (`sanitizeLetterHtml`).
- **Footer box** — the baked footer in the image is covered by a white rounded box redrawn in the same position, so the address (`app_settings.letterhead_address`, editable with `letterhead.manage`) is always live and applies to every print.

Preview (`src/components/letterhead/LetterheadPreview.tsx`) and print (`src/lib/letterheadPrint.ts`) share `LETTERHEAD_LAYOUT` geometry — positions in % of the sheet, font sizes in `cqw` — so preview and print are identical and A5 is an exact scale-down of A4. Four outputs are supported: blank/filled × A4/A5; a blank print renders only the frame image plus the footer overlay.

Permissions follow the product default: `letterhead.view` is pre-granted to every user (checked by default in `UserEditor`, seeded for all existing users) and can be revoked per user; `letterhead.manage` gates address editing and the print log. The print log has no UI — every print is still recorded server-side and `GET /letterhead/prints` requires `letterhead.manage`, so the records stay queryable for audit purposes. Every print/copy is recorded in `letterhead_prints` — and in `audit_logs` with entity `letterhead` — capturing the acting user, paper size, blank/filled kind, and a snapshot of the printed field values before the print window opens, so distributed letterheads stay traceable.

## 11. Summary

The app's design is intentionally structured, domain-oriented, and stateful. The goal is not to create a generic React template, but to maintain a coherent internal CRM product with a clear business workflow and a stable design language.

If a proposed change conflicts with this design, it should be treated as an architectural decision and explained before implementation.
