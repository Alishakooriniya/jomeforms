# Agent Instructions

This repository has a design source of truth in [DESIGN.md](DESIGN.md).

## Required reading before design changes

Before changing any UI, layout, styling, theme, routing, permission model, data model, or component structure, agents must read:

- [DESIGN.md](DESIGN.md)
- the relevant provider/component files directly affected by the change

## Non-negotiable rules

- Preserve the existing architecture and design patterns unless a product requirement clearly demands a change.
- Do not introduce ad hoc styling or duplicate one-off patterns when a shared UI primitive already exists.
- Keep the app local-first, permission-aware, and audit-friendly.
- Keep RTL/Persian UX intact.
- If a design decision intentionally diverges from the current patterns, document the rationale in [DESIGN.md](DESIGN.md) alongside the implementation.

## Design-change workflow

1. Read [DESIGN.md](DESIGN.md).
2. Identify the direct files involved in the work.
3. Keep the change aligned with the established system.
4. Update documentation when the design direction changes.
5. Avoid breaking permissions, route structure, or persistent data flows.

This file exists so agents do not drift away from the established product design.