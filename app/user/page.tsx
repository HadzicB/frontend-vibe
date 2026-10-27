import WeatherBlendScene from "@/components/WeatherBlendScene";
import { blendWeather } from "@/lib/weatherBlend";
import { describeWeather } from "@/lib/weather";
import {
  listAddresses,
  UnauthorizedError,
} from "@/services/addresses/addressService";
import { getMe } from "@/services/auth/authService";
import { Address, CurrentWeather } from "@/types/address";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function UserPage() {
  // proxy.ts only checks that the cookie exists; getMe asks the backend
  // whether the session is real and not expired.
  const sessionId = (await cookies()).get("session")?.value;
  const user = sessionId ? await getMe(sessionId) : null;
  if (!sessionId || !user) redirect("/session-expired");

  // Just for fun: one imaginary weather made from the weather of every address.
  // It is decoration, so if the addresses cannot be loaded the page still works.
  let addresses: Address[] = [];
  try {
    addresses = await listAddresses(sessionId, { withWeather: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/session-expired");
    console.log(error);
  }

  const ingredients = addresses.filter(
    (a): a is Address & { weather: CurrentWeather } => !!a.weather,
  );
  const blend = blendWeather(ingredients.map((a) => a.weather));

  return (
    <main className="flex flex-col flex-1 items-center justify-center gap-6 bg-zinc-50 px-4 py-8 font-sans dark:bg-black">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-semibold">User info</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as {user.username}
        </p>
      </div>

      {blend ? (
        <section className="flex w-full max-w-3xl flex-col gap-3">
          <div className="aspect-video overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <WeatherBlendScene blend={blend} />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-4xl font-semibold">
              {Math.round(blend.avgTemperature)}°C
            </p>
            <p className="text-lg">{blend.title}</p>
            <p className="text-sm text-zinc-500">
              Made from {blend.count} {blend.count === 1 ? "place" : "places"}:{" "}
              {ingredients
                .map((a) => {
                  const { emoji } = describeWeather(
                    a.weather.weatherCode,
                    a.weather.isDay,
                  );
                  return `${emoji} ${a.label ?? a.city} ${Math.round(a.weather.temperature)}°`;
                })
                .join(" · ")}
            </p>
            <p className="text-xs text-zinc-400">
              For fun only, not a forecast. Weather data by{" "}
              <a href="https://open-meteo.com/" className="underline">
                Open-Meteo.com
              </a>
            </p>
          </div>
        </section>
      ) : (
        <p className="max-w-sm text-center text-zinc-600 dark:text-zinc-400">
          Save an address and the weather of all your places will be mixed into
          one picture here.{" "}
          <Link href="/addresses/new" className="underline">
            Add an address
          </Link>
        </p>
      )}

      <Link href="/" className="underline">
        Back to home
      </Link>
    </main>
  );
}
