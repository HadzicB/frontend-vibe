@AGENTS.md

# VIBE project (read first)

This is the **vibe** copy of the frontend, separate from `../frontend-part` (the hand-written learning project). `frontend-part` and `../backend-part` must stay untouched: never modify them from here. This project pairs with `../backend-vibe`.
Purpose of this project and session: an experiment to see how far stating "documentation" (this file) alone brings the implementation. Keep this file accurate: it is the spec the work is driven from.

# Project context

Learning project: Next.js fullstack app. Developed ad hoc, no fixed roadmap.
Backend is decided: a separate Node app in `../backend-vibe` (TypeScript, Express 5, port 8080), called with `fetch` from the Next server only (server components/actions), never from the browser, so it doesn't show in the browser Network tab and needs no CORS. Ask before adding backend-specific code.
Current state: login and signup work end to end against the separate backend (`API_URL` in `.env.local`).
- `services/auth/authService.ts` calls the backend `/login` and `/signup` with `fetch`.
- `actions/auth/authActions.ts` validates input (`lib/validation/`), calls the service, and on login sets an httpOnly `session` cookie from the backend's `{ id, expiresAt }` (the cookie expiry follows the BE; sessions last 20 minutes).
- Routes live in `app/(auth)/login` and `app/(auth)/signup`. Types are in `types/auth.ts`.
- Logout: `logoutAction` calls the BE `/logout` (sends `Authorization: Bearer <id>`), deletes the cookie, redirects to `/login`.
- `proxy.ts` (project root): optimistic check only, "does a `session` cookie exist?". Public routes list: `/login`, `/signup`, `/forgot-password`; everything else is protected by default. Matcher skips `api`, `_next/static`, `_next/image`, `favicon.ico`, `.png`. Has debug `console.log`s on redirects. I decided NOT to call the backend from the proxy.
- Real session check: `getMe(sessionId)` in `authService.ts` calls BE `GET /users/me` (null on 401). `app/page.tsx` uses it and shows "Hello, <username>". If the BE rejects the session (fake/expired/logged out), the page redirects to `app/session-expired/route.ts`, which deletes the cookie and redirects to `/login` (without that, the proxy would bounce the user back to `/`: redirect loop).
- `app/user/page.tsx` is a second protected page; it has the same `getMe` check as the home page (copy-pasted for now, to be replaced by the central helper below).
- Dev runs with `next dev --experimental-https` (self-signed cert, `https://localhost:3000`). `API_URL` stays plain http to the BE.
- Tests: Vitest (`pnpm test` runs `vitest run`). `services/auth/authService.test.ts` is an integration test: `login("dgb", "dgsg")` against the real BE (needs `../backend-vibe` running with Postgres) must return `null` (BE answers 401). It assumes no user `dgb` exists.

## Next steps (in order)

1. (done) `getMe` check on `app/user/page.tsx`.
2. (done) BE auth guard so every protected BE endpoint validates the session itself (see the backend CLAUDE.md). Error handling is aligned: `ServiceUnavailableError` for an unreachable BE in every service call, and `logout` treats a 401 as success.
3. Central place for BE calls (small `fetch` wrapper, server-only): base URL, auth header, error mapping, and one spot that handles a 401 by redirecting to `/session-expired` (the route handler that deletes the cookie, because pages and render can't delete cookies). `getMe` is not special: it becomes a plain call through this wrapper.
4. `verifySession()` in a data access layer (`lib/dal.ts`, `server-only`, wrapped in React `cache` so it runs once per render): the real-check counterpart of `proxy.ts`. Every page, action and BE data call goes through it, so no page copy-pastes a `getMe` block. Doc reference: "Creating a Data Access Layer (DAL)" in `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.
5. Idea to evaluate (probably overkill for two separate repos): shared zod schemas used by both FE and BE so validation rules aren't written twice. Cheaper options: zod only in each repo with the same rules, or BE as the single source of truth and FE just shows its 400 field errors. A shared package only pays off in a monorepo (pnpm workspace).
6. Interview topic, learn the concept (not necessarily implement): JWT vs server-side sessions. We use opaque session IDs looked up in the `sessions` table (stateful, instantly revocable). JWT is a signed token (`header.payload.signature`) the server can verify without a DB lookup (stateless), but it can't be revoked before expiry unless you add a denylist or short expiry + refresh token. Be ready to explain the trade-off, where to store each (httpOnly cookie vs localStorage), and why we chose sessions. Ask Claude for a short web-Claude prompt when ready.
7. Later: forgot password; signup creating a session (auto-login); roles/permissions with a data access layer (separate, more complex topic); maybe move to a `src/` folder (`@/*` alias would change).

## Still unclear to me (re-explain simply when I ask, in Serbian if I write Serbian)

- Who checks the session and when, across many clicks: proxy = cookie exists only; every BE call carries the session ID and the BE checks `sessions` itself; `/me` is just a feature that returns the user, not "the" authorization.
- Why a fake cookie passes the proxy but fails at the BE.
- What server actions send/receive (form-data envelope and React Flight response, not JSON); only the Next-to-BE call is JSON.
- Error flow across the whole chain: who returns and who throws errors, from the BE server to the Next server and then to the browser, and what each one does with an error (BE status + `{ message }`, what the service/action turns it into, what the browser finally sees: form message, redirect, or Next error page). I don't know this yet and will learn it by building (e.g. `error.tsx`, `not-found.tsx`, the central 401 handler in the fetch wrapper). Re-explain with a simple end-to-end example when I ask.

# How to work with me

- I'm learning: briefly explain the why, don't refactor or "fix" code I didn't ask about.
- Debug logging (console.log) is intentional. Don't remove it.
- Only change what I ask. Suggest improvements, don't apply them.
- When I ask for a review, list mistakes as concepts (what's wrong, why it matters, the fix), most important first.
- Web Claude prompts: ONLY print a ready-to-paste prompt for web Claude (a lesson with diagrams) when I ask for one. Don't add it automatically after tasks or reviews. When I do ask, base it on the concepts the change touches (e.g. controlled vs uncontrolled inputs, useActionState), or for reviews on the mistakes.
- Web Claude prompts are SHORT and focused: pick the ONE core concept the task hinges on (max 2 if inseparable), never a list of 4-6 topics. Ask for a single concise lesson (one or two diagrams, practical "how to implement it", no security/a11y/interview side topics unless that is the task itself). I want to implement, not dwell.
- Web Claude prompts are concept-only: never include my code snippets or project specifics (file names, my components). Web Claude should teach the concept with its own generic examples. For reviews, describe each mistake as a general concept/anti-pattern, not as my code.
- Before auth/Next.js-specific advice, check `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.

# Conventions

- Structure: `actions/` (server actions), `services/` (backend calls), `types/`, `components/`, `app/`
- Tailwind v4 for styling, pnpm for packages

# Decisions log

Update this section as decisions get made (e.g. "BE is now a separate app at ../backend-vibe").

- Goal: become confident enough to apply for full stack positions. Favor industry-standard patterns and explain how they come up in interviews.
- Backend: separate Node + Express app (TypeScript), sibling folder `../backend-vibe`. `services/` in this app becomes `fetch` calls to its API.
  - Update: the vibe BE is now TypeScript on Express 5 (single server, port 8080) with the `pg` driver. No ORM yet.
- Database: SQL with an ORM. I know schemas, keys and joins but need a refresher, so show the generated SQL and explain relational concepts. Proposed, not yet confirmed: Drizzle + PostgreSQL. Hosting/Docker setup is undecided, don't assume it.
  - Update: PostgreSQL 16 is confirmed and running locally, currently with raw `pg` (no ORM yet). Docker deferred.
- Next focus: authentication (login first, then sessions, route protection). Auth flow: backend verifies credentials and issues the token/session, Next.js keeps it in an httpOnly cookie.
