import {
  searchAddresses,
  UnauthorizedError,
} from "@/services/addresses/addressService";
import { ServiceUnavailableError } from "@/services/auth/authService";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

// The browser can't call the backend (see CLAUDE.md), so the search box calls
// this same-origin route handler, which calls the backend from the server.
// proxy.ts skips /api paths, so this handler checks the session cookie itself.
export async function GET(request: NextRequest) {
  const sessionId = (await cookies()).get("session")?.value;
  if (!sessionId) {
    return Response.json({ message: "Not authenticated" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";

  try {
    const results = await searchAddresses(sessionId, query);
    return Response.json({ results });
  } catch (error) {
    console.log(error);
    if (error instanceof UnauthorizedError) {
      return Response.json({ message: "Not authenticated" }, { status: 401 });
    }
    if (error instanceof ServiceUnavailableError) {
      return Response.json({ message: "Unavailable" }, { status: 503 });
    }
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
