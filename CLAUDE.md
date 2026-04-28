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

No test runner is configured — verify changes manually via the dev server.

## Deployment (Docker)

```bash
docker-compose up -d                          # Dev with local PostgreSQL
docker-compose -f docker-compose.prod.yml up -d  # Production
./scripts/update.sh                           # Pull + rebuild + migrate (server)
./scripts/backup.sh                           # Create compressed DB backup
./scripts/restore.sh ./backups/<file>.sql.gz  # Restore from backup
```

Data persists across updates in Docker volume `postgres_prod_data`. Migrations run automatically in `update.sh` via `prisma migrate deploy`.

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

> **Note:** `middleware.ts` explicitly lists protected routes. If you add a new page route, add its pattern to the `matcher` array. Currently `/timeline` is intentionally public (no auth required on load) — add it to the matcher if that changes.

### Domain model

- **Object** — a building project with type (`Жилой`/`Коммерческий`), complexity (`Стандартный`/`Средней сложности`/`Сложный`), area, and room counts
- **Contract** — links an Object to a service type (`ДПИ`/`ЭАП`/`АЛР`/`Авторский надзор`), has a team (role → employee assignments), stages (ordered schedule entries with start date + working days), and status (`active`/`done`)
- **Employee** — has a role (`Тимлид`/`Дизайнер`/`Визуализатор`/`Проектировщик`/`Архитектор`/`Комплектатор`) and type (`Ведущий специалист`/`Специалист`/`Младший специалист`), which affect load coefficients
- **Norm** — lookup table mapping service + stage + role → base hours per unit; `base` field is one of: `Нет`, `Площадь объекта`, `Кол-во комнат основные`, `Кол-во комнат вспомагательные`, `Кол-во комнат технические`, `Кол-во позиций ИИИ`
- **Settings** — singleton row (`id = "global"`) storing working hours, all coefficients, and `customHolidays` (JSON array of `"YYYY-MM-DD"` strings)

### Calculation pipeline

```
Norm.hResidential|hCommercial
  × object.area|rooms*    (base field)
  × kC (complexity coeff: kStandard/kMedium/kComplex)
  × kT (employee type coeff: kSenior/kMid/kJunior)
= role hours per stage     → calcStageHours()

distributed across months by working-day overlap
= LoadResult[empId][monthKey]  → calcLoad()
```

Working days skip weekends + Russian federal holidays + `customHolidays`. Holiday logic is in `lib/holidays.ts`:
- `RU_HOLIDAY_MONTH_DAYS` — 15 recurring `"MM-DD"` strings
- `buildHolidaySet(fromYear, toYear, customHolidays)` — expands to `Set<"YYYY-MM-DD">`
- `addWorkingDays()` and `countWorkingDays()` in `lib/calc.ts` accept an optional `holidays` set

### Slot finder

`lib/slotFinder.ts` exports `findSlots(SlotInput): SlotResult` — a pure client-side function that answers "when can I start a new contract and with which team?". It:
1. Computes required hours per role per stage via inline norm math (kT=1.0 baseline, no team yet)
2. Runs `calcLoad()` once on existing contracts (outside the date loop)
3. Iterates candidate start dates in 7-day steps up to 180 days
4. For each date: chains stage schedules, distributes hours across months, finds one employee per role whose free capacity ≥ required per month
5. Returns `primary` candidate + up to 2 alternatives

The result is fed to `components/timeline/ContractSlotFinder.tsx` (Block 2 of `/timeline`), which also pushes a `SlotDraftPreview` to the parent page so Block 1 can render dashed preview bars and `calcLoad` can include the draft contract.

When "Создать договор" is clicked, a `ContractDraftPayload` is stored in `sessionStorage['contractDraft']`. `app/(app)/contracts/page.tsx` reads and clears it on mount — if `objectDraft` is present, it first `POST /api/objects` to create the object, then opens the contract modal pre-filled.

### UI components

All shared UI is in `components/ui/index.tsx`: `Modal`, `Confirm`, `PeriodNav`, `FilterButtons`, `PageHeader`, `FormGroup`, `Tag`. Layout shell (`Sidebar`, `Topbar`) is in `components/layout/`. Page-specific compound components live under `components/<page>/` (e.g. `components/timeline/`).

Styles use CSS custom properties defined in `app/globals.css`. Light theme palette:
- `--bg #f7f8fb` · `--surface #ffffff` · `--surface2 #f4f4f6` · `--border #e4e6eb`
- `--accent #1A6BFF` · `--accent2 #6366f1` · `--accent3 #f59e0b` · `--accent4 #ef4444`
- `--text #1f2041` · `--text2 #6b7280` · `--text3 #9ca3af`

Font: Manrope (loaded via `next/font/google`, variable `--font-manrope`). Do not use `font-mono` or `font-display` Tailwind classes — both map to Manrope as well.

### Utility helpers

- `lib/api.ts` — `fetchJson<T>()`, `showError()`, `confirmDuplicateName()` used by all pages
- `lib/coerce.ts` — `num()` and `int()` for safe API body parsing in route handlers
- `lib/calc.ts` — also exports `ROLE_COLORS`, `ROLES`, `STAGES`, `SERVICES`, `BASES`, `EMPLOYEE_TYPES`, `OBJECT_TYPES`, `COMPLEXITY_TYPES` as canonical enum arrays

### TypeScript gotcha — Set iteration

`tsconfig.json` targets `esnext` but the Next.js bundler config does not enable `downlevelIteration`. Spreading a `Set` with `[...new Set(...)]` raises **TS2802**. Always use `Array.from(new Set(...))` instead.

### User management

No UI for managing users. Add users via Prisma Studio (`npm run db:studio`) or a script using `bcryptjs` to hash passwords before inserting into the `User` table.
