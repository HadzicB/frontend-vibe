# Architecture

How the frontend is built. For the reasons behind each choice, follow the links
to the decision records in [decisions/](decisions/).

## The big picture

```mermaid
flowchart LR
  B["Browser"] --> N["Next.js server<br/>(this app, port 3000)"]
  N -- fetch --> A["backend-vibe (Express)<br/>port 8080"]
  A --> D[("PostgreSQL")]
```

The browser talks only to the Next.js server. The Next.js server talks to the
backend. The browser never learns the backend's address, and it is never
trusted to say who the user is. See [0001](decisions/0001-backend-called-from-next-server.md).

## Where code runs

Next.js runs code in two places, and mixing them up is the most common source of
confusion:

| Code | Runs on | Examples here |
|---|---|---|
| Server components (default in `app/`) | Next.js server | `app/page.tsx`, `app/user/page.tsx` |
| Server actions (`"use server"`) | Next.js server, called from a form | `actions/auth/authActions.ts` |
| Services | Next.js server | `services/auth/authService.ts` |
| Client components (`"use client"`) | Browser | `LoginForm.tsx`, `SignupForm.tsx` |
| `proxy.ts` | Next.js server, before the page | the cookie check |

Because the `fetch` to the backend lives in services that are only called from
the server, `API_URL` never reaches the browser.

## The layers

```mermaid
flowchart LR
  F["Page / form<br/>what the user sees and does"] --> A["Server action<br/>checks input, decides what happens next:<br/>cookie, redirect or message"]
  A --> S["Service<br/>one fetch call, turns the<br/>response into a result"]
  S --> B["Backend<br/>the real work"]
```

- **Form (client component):** collects input, shows errors, and runs a quick
  check so the user gets instant feedback.
- **Server action:** the entry point on the server. Re-validates the input,
  calls a service, then decides the outcome: set the cookie, redirect, or return
  an error message for the form.
- **Service:** only talks to the backend. It turns an HTTP answer into a plain
  result. Example: login returns the session, or `null` for a 401. A backend that
  cannot be reached throws `ServiceUnavailableError`.

## How login works

```mermaid
sequenceDiagram
  actor U as User
  participant F as Login form (browser)
  participant A as loginAction (Next server)
  participant S as authService
  participant B as Backend
  U->>F: submit email and password
  Note over F: 1. quick check, nothing is sent if it fails
  F->>A: form submission
  Note over A: 2. same rules checked again
  A->>S: login(email, password)
  S->>B: POST /login
  alt wrong credentials
    B-->>S: 401
    S-->>A: null
    A-->>F: "Wrong email or password"
  else correct
    B-->>S: 200 with session (id, expiresAt)
    S-->>A: session
    Note over A: 3. set the "session" cookie, then redirect to "/"
    A-->>F: redirect to "/"
  end
```

The cookie is set with:

- `httpOnly`: the browser's JavaScript cannot read it
- `sameSite: lax`
- `secure`: only in production (dev runs on https anyway)
- `expires`: the same time the backend gave

The cookie holds only the random session ID. The user's data stays in the
backend. See [0001](decisions/0001-backend-called-from-next-server.md).

The form data goes to the server action as a form submission, and the response
is not JSON either (React uses its own format). Only the Next-server-to-backend
call is plain JSON.

## How a protected page stays protected

Two checks, doing different jobs:

```mermaid
flowchart TD
  R(["Request for /"]) --> P{"proxy.ts<br/>is there a session cookie?"}
  P -- no --> L1[/"redirect to /login"/]
  P -- yes --> G{"page.tsx asks the backend<br/>GET /users/me with the session ID"}
  G -- valid --> OK[/"render the page"/]
  G -- "rejected: fake, expired, logged out" --> X["redirect to /session-expired"]
  X --> D["delete the cookie"]
  D --> L2[/"redirect to /login"/]
```

- `proxy.ts` is only a **fast, optimistic** check. A fake cookie passes it.
- The **real** check is the backend call. The backend decides.
- `/session-expired` exists because pages cannot delete cookies, but route
  handlers can. Without deleting the bad cookie, `proxy.ts` would see a cookie,
  send the user back to `/`, the backend would reject it again, and it would loop
  forever.

See [0002](decisions/0002-optimistic-proxy-real-check-in-backend.md).

## Errors: what the user finally sees

| What went wrong | Service result | What the action does | What the user sees |
|---|---|---|---|
| Wrong email or password | `null` | returns a message | "Wrong email or password" on the form |
| Signup email taken, or validation | `{ success: false, errors }` | returns the field errors | Messages under the fields |
| Backend not reachable | throws `ServiceUnavailableError` | catches it, returns a message | "Service unavailable, try again later." |
| Any other failure | throws `Error` | catches it, returns a message | "Something went wrong. Please try again." |
| Session rejected on a page | `getMe` returns `null` | page redirects | Back at `/login` |
| Logout when the session is already gone (401) | treated as success | cookie deleted anyway | `/login` |

Expected outcomes are return values. Unexpected ones are thrown and caught in the
action.

## Validation lives in two places

`lib/validation/` holds the rules (valid email, password of 8+ characters). The
form uses them for instant feedback and the server action uses them again,
because anything coming from the browser can be bypassed. The backend checks a
third time and is the final authority. The rules are written in both repos, so
they can drift. See [0003](decisions/0003-validate-on-client-and-server.md).

## Testing

Vitest runs in Node (no browser). The one test is an integration test of
`authService.login` against the real backend. See [0004](decisions/0004-vitest-integration-test.md).
