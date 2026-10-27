import type { Blend } from "@/lib/weatherBlend";

// An illustration of a Blend: sky colour from the temperature, sun or moon from
// the time of day, and clouds, rain, snow, fog, lightning and wind from how much
// of each kind of weather went into the mix. Artistic, not a forecast.
// A server component: plain SVG, and the movement is CSS (see globals.css).

const W = 800;
const H = 450;

// Same input, same picture: a small seeded random number generator (mulberry32)
function seededRandom(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// HSL (hue 0-360, saturation and lightness 0-100) to [r, g, b] in 0-255
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) =>
    light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

// Mixing two colours directly, not by hue: blue and orange meet in a grey-violet
// like a dusk sky, where walking round the hue wheel would pass through green
function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
) {
  const [r, g, bl] = a.map((value, i) => Math.round(lerp(value, b[i], t)));
  return `rgb(${r} ${g} ${bl})`;
}

// Ellipses (cx, cy, rx, ry) that together look like one cloud
const CLOUD: [number, number, number, number][] = [
  [0, 0, 70, 26],
  [-42, 9, 48, 20],
  [44, 9, 52, 22],
  [8, -15, 42, 22],
];

export default function WeatherBlendScene({ blend }: { blend: Blend }) {
  const { shares, avgTemperature: temperature, avgWind: wind, dayShare } = blend;
  const random = seededRandom(Math.round(temperature * 10) + blend.count * 7919);

  // Gloom: how much of the sky is covered by anything that is not blue
  const gloom = clamp(
    shares.cloudy * 0.8 +
      shares.rain +
      shares.storm * 1.2 +
      shares.fog * 0.6 +
      shares.snow * 0.7 +
      shares.partly * 0.3,
  );
  const wet = clamp(shares.rain + shares.storm);
  const sunny = clamp(shares.clear + shares.partly * 0.6);
  const isDay = dayShare >= 0.5;

  // Cool weather is blue (deeper when colder), warm weather turns orange, and a
  // lot of cloud drains the colour
  const saturation = Math.round(lerp(70, 12, gloom));
  const topLight = Math.round(lerp(10, 48, dayShare) * (1 - gloom * 0.25));
  const bottomLight = Math.round(lerp(24, 78, dayShare) * (1 - gloom * 0.15));
  const coolHue = lerp(228, 200, clamp((temperature + 10) / 30));
  const warmth = clamp((temperature - 14) / 18); // 0 at 14°C and below, 1 at 32°C
  const skyColor = (light: number) =>
    mixRgb(
      hslToRgb(coolHue, saturation, light),
      hslToRgb(28, Math.min(saturation + 15, 90), light),
      warmth,
    );

  // Everything moves faster in more wind
  const driftSeconds = clamp(140 - wind * 2.5, 30, 140);

  const clouds = Array.from({
    length: Math.round(
      clamp(
        shares.cloudy +
          shares.partly * 0.6 +
          shares.rain +
          shares.storm +
          shares.snow * 0.8 +
          shares.fog * 0.3,
      ) * 8,
    ),
  }).map(() => {
    const duration = driftSeconds * (0.8 + random() * 0.4);
    return {
      y: 40 + random() * 150,
      scale: 0.8 + random() * 1.1,
      duration,
      delay: -random() * duration,
      x: random() * W,
    };
  });
  const cloudLight = Math.round(lerp(96, 52, wet) * lerp(0.45, 1, dayShare));

  const slant = clamp(wind / 6, 0, 10);
  const drops = Array.from({ length: Math.round(wet * 110) }).map(() => ({
    x: random() * W,
    y: random() * H,
    duration: 0.6 + random() * 0.5,
    delay: -random() * 1.1,
  }));

  const flakes = Array.from({ length: Math.round(shares.snow * 80) }).map(() => ({
    x: random() * W,
    y: random() * H,
    r: 1.5 + random() * 2.5,
    duration: 7 + random() * 7,
    delay: -random() * 14,
  }));

  const stars = Array.from({ length: Math.round((1 - dayShare) * 50) }).map(() => ({
    x: random() * W,
    y: random() * H * 0.6,
    r: 0.8 + random() * 1,
    duration: 2 + random() * 3,
    delay: -random() * 5,
  }));

  const streaks = Array.from({
    length: Math.round(clamp(wind, 0, 70) / 7),
  }).map(() => ({
    y: 60 + random() * 270,
    length: 60 + random() * 80,
    duration: lerp(7, 2.5, clamp(wind / 70)),
    delay: -random() * 7,
    x: random() * W,
  }));

  // Snow lies on the ground when it is snowy, grass colours otherwise
  const snowy = shares.snow > 0.3;
  const groundHue = Math.round(lerp(200, 105, clamp((temperature + 5) / 25)));
  const groundSat = snowy ? 20 : 28;
  const groundLight = snowy
    ? Math.round(lerp(55, 92, dayShare))
    : Math.round(lerp(13, 34, dayShare));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${blend.title}: ${Math.round(temperature)} degrees`}
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="wb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyColor(topLight)} />
          <stop offset="1" stopColor={skyColor(bottomLight)} />
        </linearGradient>
        <radialGradient id="wb-glow">
          <stop offset="0" stopColor={isDay ? "#fff3b0" : "#e8eeff"} stopOpacity="0.9" />
          <stop offset="1" stopColor={isDay ? "#fff3b0" : "#e8eeff"} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="url(#wb-sky)" />

      {stars.map((s, i) => (
        <circle
          key={`star-${i}`}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#fff"
          className="wb-anim wb-twinkle"
          style={{
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {/* Sun by day, moon by night. Fainter the less clear sky there is. */}
      {sunny > 0.05 && (
        <g opacity={0.3 + 0.7 * sunny}>
          <circle cx={600} cy={110} r={150} fill="url(#wb-glow)" />
          <circle
            cx={600}
            cy={110}
            r={46}
            fill={isDay ? "hsl(45 100% 62%)" : "hsl(220 40% 92%)"}
          />
        </g>
      )}

      {shares.fog > 0 &&
        [0, 1, 2, 3].map((i) => (
          <rect
            key={`fog-${i}`}
            x={-50}
            y={210 + i * 42}
            width={W + 100}
            height={56}
            rx={28}
            fill="#fff"
            opacity={0.1 + 0.25 * shares.fog}
          />
        ))}

      {clouds.map((c, i) => (
        <g key={`cloud-${i}`} transform={`translate(${c.x} ${c.y}) scale(${c.scale})`}>
          <g
            className="wb-anim wb-drift"
            style={{
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
            }}
          >
            {CLOUD.map(([cx, cy, rx, ry], j) => (
              <ellipse
                key={j}
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill={`hsl(220 14% ${cloudLight}%)`}
                opacity={0.88}
              />
            ))}
          </g>
        </g>
      ))}

      {streaks.map((s, i) => (
        <g key={`streak-${i}`} transform={`translate(${s.x} ${s.y})`}>
          <line
            x1={0}
            y1={0}
            x2={s.length}
            y2={0}
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.3}
            className="wb-anim wb-drift"
            style={{
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        </g>
      ))}

      {shares.storm > 0 && (
        <>
          {/* A sheet of light across the whole sky, then the bolt itself */}
          <rect
            width={W}
            height={H}
            fill="#fff"
            opacity={0}
            className="wb-anim wb-flash"
            style={{ animationDuration: "6s", animationDelay: "-2s" }}
          />
          <polygon
            points="360,60 330,160 366,160 336,262 404,140 368,140 398,60"
            fill="hsl(55 100% 86%)"
            opacity={0}
            className="wb-anim wb-flash"
            style={{ animationDuration: "6s", animationDelay: "-2s" }}
          />
        </>
      )}

      {drops.map((d, i) => (
        <line
          key={`drop-${i}`}
          x1={d.x}
          y1={d.y}
          x2={d.x - slant}
          y2={d.y + 16}
          stroke="#cfe3ff"
          strokeWidth={1.4}
          strokeLinecap="round"
          opacity={0.6}
          className="wb-anim wb-fall"
          style={{
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}

      {flakes.map((f, i) => (
        <circle
          key={`flake-${i}`}
          cx={f.x}
          cy={f.y}
          r={f.r}
          fill="#fff"
          opacity={0.85}
          className="wb-anim wb-snow"
          style={{
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
          }}
        />
      ))}

      <path
        d={`M0 ${H} L0 330 Q150 280 300 322 T600 310 T${W} 332 L${W} ${H} Z`}
        fill={`hsl(${groundHue} ${groundSat}% ${groundLight}%)`}
        opacity={0.9}
      />
      <path
        d={`M0 ${H} L0 385 Q200 345 420 380 T${W} 372 L${W} ${H} Z`}
        fill={`hsl(${groundHue} ${groundSat}% ${Math.max(groundLight - 7, 4)}%)`}
      />
    </svg>
  );
}
