import type { CurrentWeather } from "@/types/address";

// Mixes the current weather of several places into one imaginary "blend".
// Purely for fun: it feeds an illustration, it is not a forecast of anywhere.

export type Category =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "storm";

// The order breaks ties: if two kinds of weather are equally common, the more
// dramatic one wins
const PRIORITY: Category[] = [
  "storm",
  "snow",
  "rain",
  "fog",
  "cloudy",
  "partly",
  "clear",
];

// WMO weather codes, as sent by the weather provider (see lib/weather.ts)
export function categorize(code: number): Category {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 67) return "rain"; // drizzle, rain, freezing rain
  if (code >= 80 && code <= 82) return "rain"; // rain showers
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "storm";
  return "cloudy"; // a code we do not know: grey is the safest guess
}

export type Blend = {
  count: number; // how many places went in
  avgTemperature: number; // degrees Celsius
  avgWind: number; // km/h
  dayShare: number; // 0 = all night, 1 = all day
  shares: Record<Category, number>; // each 0..1, adding up to 1
  dominant: Category;
  title: string; // e.g. "A mild, mixed blend"
};

const ADJECTIVE: Record<Category, string> = {
  clear: "clear",
  partly: "partly cloudy",
  cloudy: "overcast",
  fog: "foggy",
  rain: "rainy",
  snow: "snowy",
  storm: "stormy",
};

function temperatureWord(celsius: number) {
  if (celsius < 0) return "freezing";
  if (celsius < 8) return "cold";
  if (celsius < 15) return "cool";
  if (celsius < 22) return "mild";
  if (celsius < 28) return "warm";
  return "hot";
}

// null when there is nothing to blend
export function blendWeather(weathers: CurrentWeather[]): Blend | null {
  const count = weathers.length;
  if (count === 0) return null;

  const counts = Object.fromEntries(PRIORITY.map((c) => [c, 0])) as Record<
    Category,
    number
  >;
  for (const w of weathers) counts[categorize(w.weatherCode)] += 1;

  const shares = Object.fromEntries(
    PRIORITY.map((c) => [c, counts[c] / count]),
  ) as Record<Category, number>;

  // Strictly greater, so on a tie the category listed first in PRIORITY stays
  const dominant = PRIORITY.reduce((best, c) =>
    shares[c] > shares[best] ? c : best,
  );

  const avgTemperature =
    weathers.reduce((sum, w) => sum + w.temperature, 0) / count;
  const avgWind = weathers.reduce((sum, w) => sum + w.windSpeed, 0) / count;
  const dayShare = weathers.filter((w) => w.isDay).length / count;

  // When no kind of weather has the majority, call it mixed
  const mood = shares[dominant] < 0.5 ? "mixed" : ADJECTIVE[dominant];
  const title = `A ${temperatureWord(avgTemperature)}, ${mood} blend`;

  return {
    count,
    avgTemperature,
    avgWind,
    dayShare,
    shares,
    dominant,
    title,
  };
}
