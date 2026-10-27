// Turns a WMO weather code (what the weather provider sends) into something to show.
// Reference: https://open-meteo.com/en/docs (section "WMO Weather interpretation codes")

type Condition = { emoji: string; label: string };

const CONDITIONS: Record<number, Condition> = {
  1: { emoji: "🌤️", label: "Mostly clear" },
  2: { emoji: "⛅", label: "Partly cloudy" },
  3: { emoji: "☁️", label: "Overcast" },
  45: { emoji: "🌫️", label: "Fog" },
  48: { emoji: "🌫️", label: "Freezing fog" },
  51: { emoji: "🌦️", label: "Light drizzle" },
  53: { emoji: "🌦️", label: "Drizzle" },
  55: { emoji: "🌧️", label: "Heavy drizzle" },
  56: { emoji: "🌧️", label: "Freezing drizzle" },
  57: { emoji: "🌧️", label: "Freezing drizzle" },
  61: { emoji: "🌧️", label: "Light rain" },
  63: { emoji: "🌧️", label: "Rain" },
  65: { emoji: "🌧️", label: "Heavy rain" },
  66: { emoji: "🌧️", label: "Freezing rain" },
  67: { emoji: "🌧️", label: "Freezing rain" },
  71: { emoji: "🌨️", label: "Light snow" },
  73: { emoji: "🌨️", label: "Snow" },
  75: { emoji: "❄️", label: "Heavy snow" },
  77: { emoji: "🌨️", label: "Snow grains" },
  80: { emoji: "🌦️", label: "Light showers" },
  81: { emoji: "🌧️", label: "Showers" },
  82: { emoji: "⛈️", label: "Heavy showers" },
  85: { emoji: "🌨️", label: "Snow showers" },
  86: { emoji: "❄️", label: "Heavy snow showers" },
  95: { emoji: "⛈️", label: "Thunderstorm" },
  96: { emoji: "⛈️", label: "Thunderstorm with hail" },
  99: { emoji: "⛈️", label: "Thunderstorm with hail" },
};

export function describeWeather(code: number, isDay: boolean): Condition {
  // Clear sky is the only code whose icon depends on day or night
  if (code === 0) {
    return isDay
      ? { emoji: "☀️", label: "Clear" }
      : { emoji: "🌙", label: "Clear night" };
  }
  return CONDITIONS[code] ?? { emoji: "🌡️", label: "Unknown" };
}
