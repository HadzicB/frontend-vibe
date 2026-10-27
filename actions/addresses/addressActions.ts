"use server";

import {
  createAddress,
  deleteAddress,
  UnauthorizedError,
} from "@/services/addresses/addressService";
import { ServiceUnavailableError } from "@/services/auth/authService";
import { AddressActionState, NewAddress } from "@/types/address";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Empty string -> null, so the backend stores NULL instead of ""
function optional(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

export async function createAddressAction(
  _prevState: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const label = optional(formData, "label");
  const values = { label: label ?? "" };

  // These come from the search result the user picked, never typed by hand
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const city = optional(formData, "city");
  const country = optional(formData, "country");
  if (
    !formData.get("latitude") ||
    !formData.get("longitude") ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    !city ||
    !country
  ) {
    return { message: "Pick an address from the search results.", values };
  }

  const address: NewAddress = {
    label,
    displayName: optional(formData, "displayName") ?? "",
    street: optional(formData, "street"),
    houseNumber: optional(formData, "houseNumber"),
    postalCode: optional(formData, "postalCode"),
    city,
    region: optional(formData, "region"),
    country,
    countryCode: optional(formData, "countryCode"),
    latitude,
    longitude,
  };

  const sessionId = (await cookies()).get("session")?.value;
  if (!sessionId) redirect("/session-expired");

  let result;
  try {
    result = await createAddress(sessionId, address);
  } catch (error) {
    console.log(error);
    if (error instanceof UnauthorizedError) redirect("/session-expired");
    if (error instanceof ServiceUnavailableError) {
      return { message: "Service unavailable, try again later.", values };
    }
    return { message: "Something went wrong. Please try again.", values };
  }

  if (!result.success) {
    return { errors: result.errors, values };
  }

  // The map in the section layout is not re-rendered by navigating, so refresh it too
  revalidatePath("/addresses", "layout");

  // redirect() throws internally, so it must be outside try/catch
  redirect("/addresses");
}

export async function deleteAddressAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const sessionId = (await cookies()).get("session")?.value;
  if (!sessionId) redirect("/session-expired");
  if (!Number.isInteger(id) || id < 1) return;

  try {
    await deleteAddress(sessionId, id);
  } catch (error) {
    console.log(error);
    if (error instanceof UnauthorizedError) redirect("/session-expired");
    throw error;
  }

  // "layout" = the page and the section layout (the map), not just the page
  revalidatePath("/addresses", "layout");
}
