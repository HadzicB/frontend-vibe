# frontend-vibe

The web app: signup, login, logout, and two pages that need a login. It talks to
the API in `../backend-vibe`.

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4.

> How it is built: [docs/architecture.md](docs/architecture.md).
> Why it is built that way: [docs/decisions/](docs/decisions/).

## Run it

Prerequisites: Node, pnpm, and the backend running on port 8080 (see the
backend README).

1. Create `.env.local` in this folder:

   ```
   API_URL=http://localhost:8080
   ```

   This is the address of the backend. It is read on the server only.

2. Install and start:

   ```bash
   pnpm install   # install dependencies
   pnpm dev       # next dev --experimental-https
   ```

3. Open **https://localhost:3000**. Dev mode uses a self-signed certificate, so
   the browser shows a warning the first time. Accept it.

Scripts:

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server over HTTPS on port 3000 |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest, see below |

## Tests

`pnpm test` runs Vitest. The one test, `services/auth/authService.test.ts`,
is an integration test: it calls the **real backend** with a login that must
fail (`dgb` / `dgsg`) and expects `login()` to return `null`. So the backend
and Postgres must be running. It assumes no user with the email `dgb` exists.

It does not test the forms, the server actions, cookies, or redirects.

## Pages

| URL | Who can open it | What it is |
|---|---|---|
| `/login`, `/signup` | Only people without a session cookie | Forms |
| `/` | Logged in | "Hello, <email>" and a Log out button |
| `/user` | Logged in | Placeholder second protected page |
| `/session-expired` | Anyone (it is a redirect, not a page) | Deletes the session cookie, then goes to `/login` |

## Folder map

```
app/
  (auth)/login, signup/   pages and their forms (the form is a client component)
  page.tsx, user/         protected pages
  session-expired/        route handler that clears a bad cookie
actions/auth/            server actions: login, signup, logout
services/auth/           the fetch calls to the backend
lib/validation/          input checks (used by the form and the action)
components/              Button, TextInput
types/                   shared types
proxy.ts                 the cookie check that runs before every page
```

## Known gaps

- Both protected pages repeat the same session check. A single shared check
  (a data access layer) is the planned fix.
- Every service function repeats the same fetch and error handling. A small
  shared fetch wrapper is the planned fix.
- `services/auth/authService.ts` logs the plaintext password in `login()` as a
  debug line. Remove it before this goes anywhere beyond your own machine.
- Signup does not log the user in. It sends them to `/login`.
- No "forgot password" yet, though `/forgot-password` is already in the public
  list.
