"use client";
import { createAddressAction } from "@/actions/addresses/addressActions";
import Button from "@/components/Button";
import TextInput from "@/components/TextInput";
import { AddressActionState, AddressCandidate } from "@/types/address";
import Link from "next/link";
import { useActionState, useState } from "react";
import AddressSearch from "./AddressSearch";

export default function AddressForm() {
  const initialState: AddressActionState = {};

  const [state, formAction, pending] = useActionState(
    createAddressAction,
    initialState,
  );

  // The result the user picked. It lives in state, so it survives a failed submit.
  const [selected, setSelected] = useState<AddressCandidate | null>(null);

  // Backend field errors other than "label" (e.g. "too many addresses")
  const otherErrors = Object.entries(state.errors ?? {})
    .filter(([field]) => field !== "label")
    .flatMap(([, messages]) => messages);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-2">
      <p role="alert" className="min-h-5 text-sm text-red-600">
        {state.message ?? otherErrors[0]}
      </p>

      {selected ? (
        <div className="flex flex-col gap-1 rounded border border-zinc-300 p-3 text-sm dark:border-zinc-700">
          <span>{selected.displayName}</span>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="self-start underline"
          >
            Change
          </button>
          {/* What the action saves: the picked result, never typed coordinates */}
          <input type="hidden" name="displayName" value={selected.displayName} />
          <input type="hidden" name="street" value={selected.street ?? ""} />
          <input
            type="hidden"
            name="houseNumber"
            value={selected.houseNumber ?? ""}
          />
          <input
            type="hidden"
            name="postalCode"
            value={selected.postalCode ?? ""}
          />
          <input type="hidden" name="city" value={selected.city} />
          <input type="hidden" name="region" value={selected.region ?? ""} />
          <input type="hidden" name="country" value={selected.country} />
          <input
            type="hidden"
            name="countryCode"
            value={selected.countryCode ?? ""}
          />
          <input type="hidden" name="latitude" value={selected.latitude} />
          <input type="hidden" name="longitude" value={selected.longitude} />
        </div>
      ) : (
        <AddressSearch onSelect={setSelected} />
      )}

      <TextInput
        label="Name this address (optional)"
        name="label"
        placeholder="Home"
        defaultValue={state.values?.label}
        error={state.errors?.label?.[0]}
      />
      <Button
        type="submit"
        disabled={!selected}
        loading={pending}
        loadingText="Saving..."
      >
        Save address
      </Button>
      <Link href="/" className="text-sm underline">
        Skip for now
      </Link>
    </form>
  );
}
