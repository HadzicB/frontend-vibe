import { describe, expect, it } from "vitest";
import { blendWeather, categorize } from "./weatherBlend";

// Unit tests: pure functions, no backend, no network. Run in milliseconds.

function weather(
  weatherCode: number,
  temperature: number,
  overrides: { isDay?: boolean; windSpeed?: number } = {},
) {
  return {
    temperature,
    weatherCode,
    isDay: overrides.isDay ?? true,
    windSpeed: overrides.windSpeed ?? 10,
    observedAt: "2026-10-26T12:00:00Z",
  };
}

describe("categorize", () => {
  it("groups WMO codes into kinds of weather", () => {
    expect(categorize(0)).toBe("clear");
    expect(categorize(2)).toBe("partly");
    expect(categorize(3)).toBe("cloudy");
    expect(categorize(45)).toBe("fog");
    expect(categorize(63)).toBe("rain");
    expect(categorize(81)).toBe("rain");
    expect(categorize(73)).toBe("snow");
    expect(categorize(95)).toBe("storm");
  });

  it("treats an unknown code as cloudy", () => {
    expect(categorize(1234)).toBe("cloudy");
  });
});

describe("blendWeather", () => {
  it("returns null when there is nothing to blend", () => {
    expect(blendWeather([])).toBeNull();
  });

  it("describes a single place as itself", () => {
    const blend = blendWeather([weather(0, 20)]);
    expect(blend?.dominant).toBe("clear");
    expect(blend?.avgTemperature).toBe(20);
    expect(blend?.title).toBe("A mild, clear blend");
  });

  it("averages temperature, wind and daylight", () => {
    const blend = blendWeather([
      weather(0, 10, { windSpeed: 10, isDay: true }),
      weather(3, 20, { windSpeed: 30, isDay: false }),
    ]);
    expect(blend?.avgTemperature).toBe(15);
    expect(blend?.avgWind).toBe(20);
    expect(blend?.dayShare).toBe(0.5);
  });

  it("shares add up to 1 and the most common weather dominates", () => {
    const blend = blendWeather([weather(61, 8), weather(63, 9), weather(0, 10)]);
    const total = Object.values(blend!.shares).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1);
    expect(blend?.dominant).toBe("rain");
    expect(blend?.shares.rain).toBeCloseTo(2 / 3);
  });

  it("lets the more dramatic weather win a tie", () => {
    const blend = blendWeather([weather(0, 10), weather(95, 10)]);
    expect(blend?.dominant).toBe("storm");
  });

  it("calls it mixed when nothing has a majority", () => {
    const blend = blendWeather([weather(0, 10), weather(3, 10), weather(61, 10)]);
    expect(blend?.title).toBe("A cool, mixed blend");
  });

  it("names the temperature at each boundary", () => {
    expect(blendWeather([weather(0, -3)])?.title).toContain("freezing");
    expect(blendWeather([weather(0, 7.9)])?.title).toContain("cold");
    expect(blendWeather([weather(0, 8)])?.title).toContain("cool");
    expect(blendWeather([weather(0, 30)])?.title).toContain("hot");
  });
});
