import { ServiceUnavailableError } from "@/services/auth/authService";
import {
  Address,
  AddressCandidate,
  CreateAddressResult,
  NewAddress,
} from "@/types/address";

// Thrown when the backend says the session is not valid (fake, expired, logged out)
export class UnauthorizedError extends Error {}

// One fetch to the backend with the session ID attached. A rejected fetch means
// no response arrived at all (e.g. ECONNREFUSED).
async function request(sessionId: string, path: string, init: RequestInit = {}) {
  try {
    return await fetch(`${process.env.API_URL}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${sessionId}` },
    });
  } catch {
    throw new ServiceUnavailableError("Backend unreachable");
  }
}

export async function searchAddresses(
  sessionId: string,
  query: string,
): Promise<AddressCandidate[]> {
  const res = await request(
    sessionId,
    `/addresses/search?q=${encodeURIComponent(query)}`,
  );
  if (res.status === 401) throw new UnauthorizedError();
  // 400 = query too short or too long: nothing to show
  if (res.status === 400) return [];
  // 502 = the backend's address provider is down
  if (res.status === 502) {
    throw new ServiceUnavailableError("Address search unavailable");
  }
  if (!res.ok) throw new Error(`Address search failed with status ${res.status}`);

  const data = await res.json();
  return data.results;
}

export async function listAddresses(
  sessionId: string,
  { withWeather = false } = {},
): Promise<Address[]> {
  const res = await request(
    sessionId,
    withWeather ? "/addresses?include=weather" : "/addresses",
  );
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`List addresses failed with status ${res.status}`);

  const data = await res.json();
  return data.addresses;
}

export async function createAddress(
  sessionId: string,
  address: NewAddress,
): Promise<CreateAddressResult> {
  const res = await request(sessionId, "/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(address),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (res.ok) return { success: true };

  // 400 (validation) and 409 (too many addresses) carry field errors
  if (res.status === 400 || res.status === 409) {
    const data = await res.json();
    return { success: false, errors: data.errors };
  }
  throw new Error(`Create address failed with status ${res.status}`);
}

export async function deleteAddress(
  sessionId: string,
  id: number,
): Promise<void> {
  const res = await request(sessionId, `/addresses/${id}`, {
    method: "DELETE",
  });
  if (res.status === 401) throw new UnauthorizedError();
  // 404 = already gone (or never yours): the goal is reached
  if (!res.ok && res.status !== 404) {
    throw new Error(`Delete address failed with status ${res.status}`);
  }
}
