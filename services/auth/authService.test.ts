import { describe, expect, it } from "vitest";
import { login } from "./authService";

// Integration test: calls the REAL backend (needs `pnpm dev` running in the BE).
process.env.API_URL ??= "http://localhost:8080";

describe("login", () => {
  it("returns null for wrong credentials (email 'dgb', password 'dgsg')", async () => {
    // The BE answers 401 "Wrong email or password"; the service maps it to null.
    const result = await login("dgb", "dgsg");
    expect(result).toBeNull();
  });
});
