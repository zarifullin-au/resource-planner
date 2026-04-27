# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint via next lint

npm run db:migrate   # Apply schema changes (creates migration files)
npm run db:push      # Push schema without migration files (dev only)
npm run db:studio    # Open Prisma Studio GUI
npm run db:seed      # Seed demo data (objects, employees, contracts, norms)
```

Required environment variables (copy `.env.example` → `.env`):
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — random secret (`openssl rand -base64 32`)
- `NEXTAUTH_URL` — base URL (e.g. `http://localhost:3000`)

Default login after seeding: `admin@example.com` / `admin123`

## Architecture

**Stack:** Next.js 14 App Router · PostgreSQL · Prisma 5 · NextAuth v4 · Tailwind CSS · TypeScript

### Data flow

All pages are client components under `app/(app)/`. Each page calls `useAppData()` (`lib/useAppData.ts`), which fetches all five resources in parallel (`/api/objects`, `/api/employees`, `/api/contracts`, `/api/norms`, `/api/settings`) and exposes them with a `refresh()` callback. Pages derive computed views from this data using `useMemo`.

Load calculations live entirely in `lib/calc.ts` and are pure functions — no server calls. The key function is `calcLoad()`, which distributes each contract stage's hours across calendar months proportionally by working-day overlap. `calcStageHours()` applies complexity coefficients (`kC`), employee type coefficients (`kT`), and norm base values (area, room counts) to produce role → hours mappings per stage.

### API routes

All route handlers in `app/api/` follow the same pattern:
1. Check session with `getServerSession(authOptions)`, return 401 if missing
2. Interact with Prisma
3. Return `NextResponse.json(...)`

Route handlers exist for: `objects`, `contracts` (with nested `team` + `stages`), `employees`, `norms`, `stages/[id]`, `settings`.

### Auth

NextAuth credentials provider (`lib/auth.ts`) uses bcrypt password comparison against the `User` table. JWT strategy — role is stored in the token and surfaced on `session.user.role`. Route protection is handled by `middleware.ts` using NextAuth's default middleware export.

### Domain model

- **Object** — a building project with type (Жилой/Коммерческий), complexity, area, and room counts
- **Contract** — links an Object to a service type (ДПИ/ЭАП/АЛР/Авторский надзор), has a team (role → employee assignments) and stages (ordered schedule entries with start date + working days)
- **Employee** — has a role (Тимлид/Дизайнер/Визуализатор/Проектировщик/Архитектор/Комплектатор) and type (Ведущий/Специалист/Младший), which affect load coefficients
- **Norm** — lookup table mapping service + stage + role → base hours per unit; `base` field determines which object dimension to multiply by
- **Settings** — singleton row (`id = "global"`) storing working hours and all coefficients

### UI components

All shared UI is in `components/ui/index.tsx`: `Modal`, `Confirm`, `PeriodNav`, `FilterButtons`, `PageHeader`, `FormGroup`, `Tag`. Layout shell (`Sidebar`, `Topbar`) is in `components/layout/`. Styles use CSS custom properties defined in `app/globals.css` (e.g. `var(--surface)`, `var(--accent)`, `var(--text2)`).

### User management

No UI for managing users. Add users via Prisma Studio (`npm run db:studio`) or a script using `bcryptjs` to hash passwords before inserting into the `User` table.
