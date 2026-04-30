# Plan: Remove Authentication

## Context

The app currently has a three-layer auth system (NextAuth middleware → layout redirect → API 401 guards). The owner wants to make the app fully public — no login window, no session checks. All data and pages should be accessible without credentials. No user context is needed downstream; `session.user` is never read in any API handler for filtering or ownership, so removal is clean.

---

## Files to Delete

| File | Why |
|---|---|
| `middleware.ts` | Re-exports NextAuth middleware that blocks unauthenticated routes |
| `lib/auth.ts` | NextAuth `authOptions` config — unused after removal |
| `app/login/page.tsx` | Login UI |
| `app/login/` (directory) | Remove entire directory |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth catch-all API handler |
| `app/providers.tsx` | Only wraps `SessionProvider` — will be empty after removal |

---

## Files to Edit

### 1. `app/page.tsx`
Currently redirects to `/login` or `/dashboard` based on session.
**Change:** Always redirect to `/objects` (main entry point).

```ts
// Before
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
const session = await getServerSession(authOptions)
if (session) redirect('/dashboard')
else redirect('/login')

// After
redirect('/objects')
```

### 2. `app/(app)/layout.tsx`
Currently calls `getServerSession(authOptions)` and redirects to `/login` if no session.
**Change:** Remove session check entirely, keep Sidebar + Topbar rendering.

```ts
// Remove these lines
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
const session = await getServerSession(authOptions)
if (!session) redirect('/login')
```

### 3. `app/layout.tsx`
Currently wraps children in `<Providers>` (which is `<SessionProvider>`).
**Change:** Remove `<Providers>` wrapper, render `{children}` directly (or inline other non-auth providers if any exist).

### 4. `components/layout/Topbar.tsx`
Currently uses `useSession` to display user name/email and `signOut` button.
**Change:** Remove `useSession` import and usage. Remove sign-out button. Keep the rest of the topbar UI.

### 5. All API routes — remove `getServerSession` guard (11 files)

Pattern to remove from every handler function:
```ts
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

Files:
- `app/api/objects/route.ts` — lines 8-9, 16-17
- `app/api/objects/[id]/route.ts` — lines 8-9, 17-18, 50-51
- `app/api/contracts/route.ts` — lines 8-9, 19-20
- `app/api/contracts/[id]/route.ts` — lines 8-9, 48-49
- `app/api/employees/route.ts` — lines 8-9, 15-16
- `app/api/employees/[id]/route.ts` — lines 8-9, 22-23
- `app/api/norms/route.ts` — lines 8-9, 15-16
- `app/api/norms/[id]/route.ts` — lines 8-9, 33-34
- `app/api/settings/route.ts` — lines 17-18, 28-29
- `app/api/stages/[id]/route.ts` — lines 8-9

Also remove the unused imports in each file:
```ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
```

---

## Order of Execution

1. Delete `middleware.ts` — immediately unblocks all routes at edge
2. Edit `app/(app)/layout.tsx` — remove server-side session redirect
3. Edit `app/page.tsx` — fix root redirect to `/objects`
4. Edit all 10 API route files — remove session guards
5. Edit `components/layout/Topbar.tsx` — remove user name / sign-out UI
6. Edit `app/layout.tsx` — remove `<Providers>` wrapper
7. Delete `app/providers.tsx`, `lib/auth.ts`, `app/login/page.tsx`, `app/api/auth/[...nextauth]/route.ts`

---

## Notes

- `session.user` (id, role, email) is **never used** downstream in any handler — safe to remove without side effects
- No role-based UI or conditional rendering depends on `session.user.role` anywhere except Topbar
- `bcryptjs` and `next-auth` packages can be left in `package.json` for now (no harm) — removing them is an optional cleanup
- `NEXTAUTH_SECRET` and `NEXTAUTH_URL` env vars become unused but don't need to be removed
- The User table in Prisma schema can stay as-is

---

## Verification

1. `npm run dev` — app should open at `http://localhost:3000` and redirect to `/objects` without login prompt
2. Open `/objects`, `/contracts`, `/employees`, `/norms`, `/settings`, `/timeline` — all should render without redirect
3. Test CRUD: create an object, create a contract, edit/delete — API calls should return 200
4. Check browser console — no 401 errors, no NextAuth warnings
5. Confirm no sign-in button or user name appears in Topbar
