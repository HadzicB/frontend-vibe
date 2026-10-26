# 0004: Vitest, and the first test calls the real backend

Status: Accepted

## Context

The project had no tests. A test runner was needed that works with TypeScript
and ESM without configuration. The first thing worth checking is whether the
frontend and the backend agree with each other.

## Decision

- Use **Vitest** (`pnpm test` runs `vitest run`). It runs TypeScript directly, has
  the same `describe`/`it`/`expect` shape as Jest, and needs one package.
- The first test, `services/auth/authService.test.ts`, is an **integration
  test**: it calls the real running backend with a login that must fail and
  expects `login()` to return `null`.

## Consequences

- It checks the real connection: the service, the HTTP call, the backend and
  the database.
- It is slower and more fragile than a unit test. The backend and Postgres must
  be running, and the test assumes no user with the email `dgb` exists.
- It does not cover forms, server actions, cookies, or redirects. Those would
  need component tests or browser end-to-end tests (for example Playwright).
- Pure functions such as `lib/validation/*` are the cheapest next tests, since
  they need no backend.
