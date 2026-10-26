# 0002: `proxy.ts` only checks that a cookie exists; the backend does the real check

Status: Accepted. A shared check for pages (a data access layer) is planned.

## Context

Next.js lets you run code before every page (`proxy.ts`). It is tempting to do
all authentication there. But the proxy runs on every request, including
prefetches, so it should stay fast. Asking the backend from there on every
request would be slow and would put the real decision in the wrong place.

## Decision

- `proxy.ts` is an **optimistic** check: "is there a `session` cookie?" No
  cookie on a protected route means a redirect to `/login`. A cookie on `/login`
  or `/signup` means a redirect to `/`. Everything not on the public list is
  protected by default.
- The **real** check happens where data is shown: the page asks the backend
  (`GET /users/me` through `getMe`). The backend looks the session up in the
  database.
- If the backend rejects the session, the page redirects to `/session-expired`,
  a route handler that deletes the cookie and redirects to `/login`. Pages
  cannot delete cookies, and without this the proxy and the page would redirect
  each other in a loop.

## Consequences

- A fake or expired cookie passes the proxy but fails at the backend. This is
  expected, not a bug.
- The proxy does no network work.
- The backend stays the single authority on who is logged in. It also checks
  every protected request itself, so skipping the frontend checks gains an
  attacker nothing.
- Cost: today both protected pages copy the same `getMe` block. The plan is to
  move it into one `verifySession()` function (in a data access layer, cached per
  render) so no page repeats it.
