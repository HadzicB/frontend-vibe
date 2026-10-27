export type Session = {
  id: string; // the random session ID the backend created
  expiresAt: string; // ISO date string, e.g. "2026-10-20T13:07:18.156Z"
};

export type SignupResult = {
  success: boolean;
  errors?: Record<string, string[]>; // field errors sent by the backend (400/409)
  session?: Session; // signup logs the user in, so the backend returns a session
};

export type ActionState = {
  message?: string; // overall message, e.g. "Wrong email or password"
  errors?: Record<string, string[]>; // per-field, e.g. { email: ["Invalid email"] }
  values?: { email?: string; password?: string }; // submitted values to refill the form
};
