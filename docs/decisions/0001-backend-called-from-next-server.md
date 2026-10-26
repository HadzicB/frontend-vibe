# 0001: The backend is called only from the Next.js server; the session lives in an httpOnly cookie

Status: Accepted

## Context

The frontend needs to log users in against the separate backend and remember
them afterwards. Two questions: who is allowed to call the backend, and where
does the proof of login live?

## Decision

1. **Only the Next.js server calls the backend**, using `fetch` inside server
   actions, server components and services. The browser never does.
2. **The session ID is stored in a cookie** set by the server action, with
   `httpOnly`, `sameSite: lax`, `secure` in production, and an expiry copied from
   the backend's `expiresAt`. The cookie holds only the random ID, not user data.

## Consequences

Good:
- `API_URL` and the backend's address stay on the server.
- `httpOnly` means JavaScript in the page cannot read the cookie, so a
  cross-site scripting (XSS) bug cannot steal the session ID.
- No CORS to configure.
- The cookie expires when the backend session does.

Cost:
- Every backend call must go through the Next.js server, so there is one extra
  hop.
- The cookie is sent automatically with each request, so cross-site request
  forgery (CSRF) has to be kept in mind. `sameSite: lax` and Next's handling of
  server actions cover the basics.
- Storing the ID in `localStorage` would have been simpler but readable by any
  script on the page, which is why it was not used.

See also the backend decision on why sessions and not JWT:
`../../backend-vibe/docs/decisions/0002-server-side-sessions.md`.
