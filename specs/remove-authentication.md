# Spec for Remove Authentication

## Summary

Remove authentication and authorization entirely from the application to make it fully public. All pages should be accessible without login, and the app should work with existing data as it currently does—just without the login window and session checks.

## Functional Requirements

1. **Remove login page**
   - Delete or hide the login/authentication UI
   - Users should land directly on the app (e.g., `/timeline` or `/objects`)

2. **Make all routes public**
   - Remove `middleware.ts` authentication guards or modify to allow all traffic
   - Update route matcher if needed
   - All pages in `app/(app)/` should be accessible without session

3. **Remove session checks from API routes**
   - Remove `getServerSession(authOptions)` calls from all route handlers in `app/api/`
   - API routes should return data without requiring authentication

4. **Preserve existing data**
   - Keep all database tables, objects, contracts, employees, norms, settings intact
   - Data should continue to load and display normally

5. **System behavior unchanged**
   - Load calculations (`calcLoad`, `calcStageHours`) work as before
   - Slot finder, timeline, contract management all function normally
   - No user context needed (no user.role, user.id tracking)

## Functional Requirements Details

### Routes to update:
- `app/(app)/` pages — remove auth guards from layout or parent components
- `app/api/objects` — remove session check
- `app/api/employees` — remove session check
- `app/api/contracts` — remove session check
- `app/api/norms` — remove session check
- `app/api/settings` — remove session check
- `app/api/stages/[id]` — remove session check

### Files to delete or modify:
- `lib/auth.ts` — can be deleted (NextAuth config)
- `middleware.ts` — either delete or modify to allow all traffic
- `app/(auth)/` directory — delete login page if it exists
- NextAuth dependencies in `package.json` — can be removed

### Environment variables:
- Remove `NEXTAUTH_SECRET` requirement
- Remove `NEXTAUTH_URL` requirement
- Keep `DATABASE_URL` and other non-auth vars

## Possible Edge Cases

1. **Direct database access** — if User table has FK constraints, ensure they don't break when removing auth
2. **Settings singleton** — `Settings.id = "global"` should still be readable; may need a fallback if row is missing
3. **Hard-coded role checks** — any remaining role-based UI (e.g., only for admins) should either be removed or default to unrestricted
4. **Prisma User model** — if unused after auth removal, can be deleted or left for future use
5. **API error handling** — session-not-found errors should no longer appear; ensure error pages display gracefully

## Acceptance Criteria

- [ ] Login page is no longer shown; users land directly on the app
- [ ] All API routes return 200 without requiring a session
- [ ] `/timeline`, `/objects`, `/contracts`, `/employees`, `/norms`, `/settings` pages are all publicly accessible
- [ ] Load calculations and slot finder work with existing data
- [ ] No "unauthorized" or "redirect to login" errors appear
- [ ] Existing objects, contracts, employees, and settings data display correctly
- [ ] App can be deployed and accessed without environment variables for auth

## Open Questions

- Should the User table be removed from the Prisma schema, or left for future use?
- Are there any environment-specific auth requirements (e.g., staging vs. production)?
- Should any audit logging be added to track who is making API calls (IP-based)?
