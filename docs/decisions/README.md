# Decision records

An ADR (Architecture Decision Record) is a short note that answers one question:
**why did we do it this way?** Code shows what was built. These notes keep the
reasons, so you can understand them later or explain them in an interview.

Each record has the same parts: the situation (Context), what was chosen
(Decision), and what it costs and gives (Consequences).

Rules for adding one:
- One decision per file, numbered in order: `0005-short-title.md`.
- Do not rewrite an old record when the decision changes. Add a new record and
  mark the old one "Superseded by 000X".

Decisions about the API itself (sessions vs JWT, layering, Express) are in the
backend repo: `../backend-vibe/docs/decisions/`.

| # | Decision |
|---|---|
| [0001](0001-backend-called-from-next-server.md) | The backend is called only from the Next.js server; the session lives in an httpOnly cookie |
| [0002](0002-optimistic-proxy-real-check-in-backend.md) | `proxy.ts` only checks that a cookie exists; the backend does the real check |
| [0003](0003-validate-on-client-and-server.md) | Validate in the form, in the server action, and in the backend |
| [0004](0004-vitest-integration-test.md) | Vitest, and the first test calls the real backend |
