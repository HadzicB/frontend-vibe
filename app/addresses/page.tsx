import { deleteAddressAction } from "@/actions/addresses/addressActions";
import Button from "@/components/Button";
import {
  listAddresses,
  UnauthorizedError,
} from "@/services/addresses/addressService";
import { describeWeather } from "@/lib/weather";
import { Address, CurrentWeather } from "@/types/address";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

// null/undefined = the weather provider had nothing: show a dash, not an error
function WeatherBadge({ weather }: { weather?: CurrentWeather | null }) {
  if (!weather) {
    return (
      <span className="text-zinc-400" title="Weather unavailable">
        –
      </span>
    );
  }
  const { emoji, label } = describeWeather(weather.weatherCode, weather.isDay);
  return (
    <div
      className="flex flex-col items-center text-center"
      title={`${label}, wind ${Math.round(weather.windSpeed)} km/h`}
    >
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="font-semibold">{Math.round(weather.temperature)}°C</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

function formatAddress(a: Address) {
  const streetLine = [a.street, a.houseNumber].filter(Boolean).join(" ");
  const cityLine = [a.postalCode, a.city].filter(Boolean).join(" ");
  return [streetLine, cityLine, a.country].filter(Boolean).join(", ");
}

export default async function AddressesPage() {
  // proxy.ts only checks that the cookie exists; the backend call below is the
  // real check, and a 401 sends the user to /session-expired.
  const sessionId = (await cookies()).get("session")?.value;
  if (!sessionId) redirect("/session-expired");

  let addresses: Address[];
  try {
    addresses = await listAddresses(sessionId, { withWeather: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/session-expired");
    throw error;
  }

  return (
    // No background color here: the section's backdrop (app/addresses/layout.tsx) must show through
    <main className="flex flex-col flex-1 items-center justify-center gap-4 px-4 py-8 font-sans">
      <h1 className="text-2xl font-semibold">Your addresses</h1>

      {addresses.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          You have not saved an address yet.
        </p>
      ) : (
        <ul className="flex w-full max-w-2xl flex-col gap-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              // Almost no background: the map is meant to be seen through the list.
              // flex-wrap lets the weather and Delete drop below the text on a phone.
              className="flex flex-wrap items-center justify-between gap-4 rounded border border-zinc-300/60 bg-white/10 p-3 text-sm dark:border-zinc-700/60 dark:bg-white/5"
            >
              <div className="flex flex-col">
                {address.label && (
                  <span className="font-semibold">{address.label}</span>
                )}
                {/* Exactly what the user picked; older rows have none */}
                <span>{address.displayName ?? formatAddress(address)}</span>
                <span className="text-zinc-500">
                  {address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}
                </span>
              </div>
              <WeatherBadge weather={address.weather} />
              <form action={deleteAddressAction}>
                <input type="hidden" name="id" value={address.id} />
                <Button type="submit">Delete</Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {addresses.length > 0 && (
        <p className="text-xs text-zinc-500">
          Weather data by{" "}
          <a href="https://open-meteo.com/" className="underline">
            Open-Meteo.com
          </a>
        </p>
      )}

      <div className="flex gap-4 text-sm">
        <Link href="/addresses/new" className="underline">
          Add an address
        </Link>
        <Link href="/" className="underline">
          Back to home
        </Link>
      </div>
    </main>
  );
}
