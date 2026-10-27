"use server";

import { validateLogin } from "@/lib/validation/login";
import { validateSignup } from "@/lib/validation/signup";
import {
  login,
  logout,
  ServiceUnavailableError,
  signup,
} from "@/services/auth/authService";
import { ActionState, Session } from "@/types/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Store the session ID in a cookie the browser sends back on every request
async function setSessionCookie(session: Session) {
  const cookieStore = await cookies();
  cookieStore.set("session", session.id, {
    httpOnly: true, // JavaScript in the browser cannot read it
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const errors = validateLogin(email, password);
  if (Object.keys(errors).length > 0) {
    return { errors, values: { email } };
  }

  let result: Session | null;
  try {
    result = await login(email, password);
  } catch (error) {
    console.log(error);
    if (error instanceof ServiceUnavailableError) {
      return {
        message: "Service unavailable, try again later.",
        values: { email, password },
      };
    }
    return {
      message: "Something went wrong. Please try again.",
      values: { email, password },
    };
  }

  console.log(result);
  if (!result) {
    return { message: "Wrong email or password", values: { email, password } };
  }

  await setSessionCookie(result);

  console.log(result);
  redirect("/");
}

export async function signupAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const errors = validateSignup(email, password);
  if (Object.keys(errors).length > 0) {
    return { errors, values: { email } };
  }

  let result;
  try {
    result = await signup(email, password);
  } catch (error) {
    console.log(error);
    if (error instanceof ServiceUnavailableError) {
      return {
        message: "Service unavailable, try again later.",
        values: { email, password },
      };
    }
    return {
      message: "Something went wrong. Please try again.",
      values: { email, password },
    };
  }

  if (!result.success) {
    return { errors: result.errors, values: { email, password } };
  }

  // Signup logs the user in (step 1 of 2). Step 2 is their address.
  if (!result.session) redirect("/login");
  await setSessionCookie(result.session);

  // redirect() throws internally, so it must be outside try/catch
  redirect("/addresses/new");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  if (sessionId) {
    try {
      await logout(sessionId);
    } catch (error) {
      console.log(error);
    }
  }

  // Remove the cookie from the browser either way
  cookieStore.delete("session");
  redirect("/login");
}
