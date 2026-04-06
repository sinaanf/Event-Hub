# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains EventHub — a B2B event management platform.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui

## Artifacts

- **event-platform** — B2B event management frontend (React + Vite), served at `/`
- **api-server** — Express 5 REST API, served at `/api`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## DB Schema

- `events` — event records with title, location, dates, status, maxAttendees
- `speakers` — speaker profiles with bio, company, jobTitle
- `sessions` — sessions linked to events and speakers with room/track
- `attendees` — event registrations with status tracking

## API Routes

- `GET/POST /api/events` — list and create events
- `GET/PUT/DELETE /api/events/:id` — manage single event
- `GET /api/events/:id/sessions` — list sessions for event
- `POST /api/sessions`, `PUT/DELETE /api/sessions/:id` — manage sessions
- `GET /api/events/:id/attendees` — list attendees for event
- `POST /api/attendees`, `PUT/DELETE /api/attendees/:id` — manage attendees
- `GET/POST /api/speakers`, `PUT/DELETE /api/speakers/:id` — manage speakers
- `GET /api/analytics/dashboard` — dashboard stats
- `GET /api/analytics/events/:id` — per-event analytics
- `GET /api/analytics/recent-registrations` — activity feed

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
