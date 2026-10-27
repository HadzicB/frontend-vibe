import { Session, SignupResult } from "@/types/auth";

// Thrown when the backend can't be reached at all (down, wrong port, no network)
export class ServiceUnavailableError extends Error {}

export async function login(
  email: string,
  password: string,
): Promise<Session | null> {
  console.log({ email }, { password });
  let res: Response;
  try {
    res = await fetch(`${process.env.API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    // fetch only rejects when no response arrived (e.g. ECONNREFUSED)
    throw new ServiceUnavailableError("Backend unreachable");
  }

  // 401 = wrong credentials (expected). Anything else is a real failure.
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Login failed with status ${res.status}`);

  const data = await res.json();
  return data.session;
}

export async function signup(
  email: string,
  password: string,
): Promise<SignupResult> {
  let res: Response;
  try {
    res = await fetch(`${process.env.API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new ServiceUnavailableError("Backend unreachable");
  }

  if (res.ok) {
    const data = await res.json();
    return { success: true, session: data.session };
  }

  // 400 (validation) and 409 (email taken) carry field errors
  if (res.status === 400 || res.status === 409) {
    const data = await res.json();
    return { success: false, errors: data.errors };
  }
  throw new Error(`Signup failed with status ${res.status}`);
}

export async function logout(sessionId: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${process.env.API_URL}/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionId}` },
    });
  } catch {
    throw new ServiceUnavailableError("Backend unreachable");
  }
  // 401 = session already gone (expired/logged out): the goal is reached
  if (!res.ok && res.status !== 401)
    throw new Error(`Logout failed with status ${res.status}`);
}

// Asks the backend who owns this session. null = fake, expired or logged out.
export async function getMe(
  sessionId: string,
): Promise<{ id: number; username: string } | null> {
  let res: Response;
  try {
    res = await fetch(`${process.env.API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${sessionId}` },
    });
  } catch {
    throw new ServiceUnavailableError("Backend unreachable");
  }

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`getMe failed with status ${res.status}`);

  const data = await res.json();
  return data.user;
}
