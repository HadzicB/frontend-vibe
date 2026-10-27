import AddressMap from "@/components/AddressMap";
import {
  listAddresses,
  UnauthorizedError,
} from "@/services/addresses/addressService";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// The look of the whole addresses section (the list and the "add address" step):
// a soft tint and the map of the user's places behind every page in it.
// The actions revalidate this layout (revalidatePath(..., "layout")), because a
// layout is not re-rendered by navigating between its pages, and the dots would
// otherwise stay stale after adding or deleting an address.
export default async function AddressesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionId = (await cookies()).get("session")?.value;

  let points: { id: number; label: string; latitude: number; longitude: number }[] =
    [];
  if (sessionId) {
    try {
      const addresses = await listAddresses(sessionId);
      points = addresses.map((a) => ({
        id: a.id,
        label: a.label ?? a.city,
        latitude: a.latitude,
        longitude: a.longitude,
      }));
    } catch (error) {
      if (error instanceof UnauthorizedError) redirect("/session-expired");
      // The backdrop is decoration: if it cannot load, the page still works
      console.log(error);
    }
  }

  return (
    <>
      {/* Behind the map (same layer, earlier in the DOM): a faint sky tint */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-sky-100/60 via-transparent to-transparent dark:from-sky-950/40"
      />
      <AddressMap points={points} />
      {children}
    </>
  );
}
