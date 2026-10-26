# 0003: Validate in the form, in the server action, and in the backend

Status: Accepted. The duplicated rules are a known cost.

## Context

Input must be checked, but there are three places it passes through, and they
have different purposes.

## Decision

- **Form (browser):** instant feedback for the user, no network. It can be
  bypassed, so it is a convenience only.
- **Server action (Next server):** runs the same rules again from
  `lib/validation/`. This is the first check that can be trusted on the frontend
  side, because the form's check can be skipped.
- **Backend:** checks again and is the final authority. Its field errors (400)
  and "email taken" (409) are shown under the fields.

## Consequences

- Never rely on the browser check alone.
- The same rules (valid email, password of at least 8 characters) are written in
  two repos. If one changes and the other does not, the user sees confusing
  results, such as the form accepting a password the backend rejects.
- Options considered for later: shared schemas (for example zod) in a shared
  package, which only pays off in a monorepo, or making the backend the single
  source of truth and having the frontend only display its errors.
