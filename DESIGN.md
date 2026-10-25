# Design Guide for Jomeforms

This document is the source of truth for the product structure, UI patterns, and engineering decisions. Any agent or contributor making design or architecture changes must read this file before editing layout, theme, state flow, permissions, or component structure.

## 1. Product intent

Jomeforms is a local-first CRM and document management application with Persian/RTL ergonomics. The system is designed to support:

- client records and company relationships
- document management with scans and templates
- role-based permissions and audit tracking
- theme customization and local persistence
- simple offline-first workflow with browser storage

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

`src/store/DataProvider.tsx` is the system-of-record for database states and business operations. All CRUD logic for clients, documents, templates, users, roles, companies, reminders, settings, and audit entries should live here.

Design rules:

- keep business operations in the provider rather than scattering them across pages
- update immutable state via a `commit` helper pattern
- preserve audit logging for meaningful actions
- treat the database model as the single source of truth
- avoid direct mutation of arrays/objects in page components

### Local-first persistence

The application is designed to work without a server dependency.

- persisted DB state is saved through local storage / IndexedDB helpers
- scanning and binary file payloads are stored with the IDB utilities
- the app is structured so backend integration can replace the provider implementation later without redesigning the UI layer

### Server mode (opt-in)

The repository ships a production backend under `backend/`. It is consumed only
when `VITE_API_MODE=server` is set; the default remains `local`, so offline demos
and the local-first guarantees are unchanged. In server mode:

- `src/lib/apiClient.ts` is the single HTTP client (envelope, versioned paths,
  in-memory access token, refresh-cookie session recovery, typed resources)
- `AuthProvider` authenticates through `POST /auth/login`, restores the session
  through the rotating HttpOnly cookie, and reads permissions from the server
- account profiles and password changes use authenticated API endpoints; password
  changes revoke all refresh sessions and return the user to sign-in
- superadmin-only manager administration uses dedicated API routes for account
  lifecycle, permission assignment, and audit-backed activity history
- the access token is never persisted in local storage
- indexedDB/local storage still owns everything else until the data provider is
  migrated deliberately; that migration must keep the `useDb`/`useDbActions`
  interfaces so pages do not change

This split is intentional: it delivers real server authentication without
breaking offline usage or rewriting page components in one step.

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

Official forms with a fixed paper frame are rendered from frontend HTML/SVG,
not by placing a PDF or image behind the form. Keep the A4 frame and its
non-editable geometry in a named frontend print layout; keep editable wording
and field definitions in the template data so they continue to persist and be
versioned with the backend template. Preview and print must use the same
code-rendered layout, preserve the source form's page dimensions, and leave the
surrounding app layout and shared document patterns unchanged.

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
- Maintain local-first behavior and offline resilience.
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

- local-first data architecture
- provider-driven state management
- route-level permission enforcement
- reusable UI primitives and consistency
- centralized audit logging
- theme-driven visual identity
- Persian/RTL-first UX

## 10. UI refinement decisions (2026-10)

The frontend was tightened around scan-ability and lower cognitive load. The backend, API contracts, permissions, audit logging, and data model were left untouched. These decisions are now the reference for future UI work:

### Page headers

- Top-level pages (lists, dashboard, reports, settings) do not show breadcrumbs; breadcrumbs render only when a route is more than one level below a section (for example a case or document detail).
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

Managers define time-bound reminders at `/reminders` (permission `reminders.manage`, under the management nav group): reminder text, a Jalali date that defaults to today, an optional `HH:MM` time, and a target user. A reminder without a time is due at the start of its day. Due reminders surface in the recipient's topbar bell — the same dropdown that lists documents awaiting signature, now shown to every signed-in user — and selecting one marks it done. The dashboard header keeps a secondary shortcut button to the page. Reminders live in the local DB (`crm.reminders.v1`), are audit-logged like other entities (`reminder`), and have no backend contract yet.

### Navigation and forms

The sidebar brand reads from `settings.orgName`; the management group is collapsed unless one of its routes is active. On the dedicated registration page (`/clients/new`) the case form renders as one unified grid — all fields visible, only full name required, every field validated (name/letters, national-ID checksum, mobile format, certificate digits, Jalali date, length caps matching the API schema). The edit dialogs instead keep the supplementary fields under a collapsible `اطلاعات تکمیلی` disclosure that auto-opens when the record already has such data (`ClientForm`'s `alwaysShowExtra` prop). Redundant dashboard-style stat cards and duplicated summary cards were removed from collections, audit, reports, and role pages; the information they repeated is still available in the main list or detail view.

All of these are frontend-only changes. Do not move filtering, numbering, permissions, or workflow rules out of the store/API while refining presentation.

## 11. Summary

The app's design is intentionally structured, domain-oriented, and stateful. The goal is not to create a generic React template, but to maintain a coherent internal CRM product with a clear business workflow and a stable design language.

If a proposed change conflicts with this design, it should be treated as an architectural decision and explained before implementation.
