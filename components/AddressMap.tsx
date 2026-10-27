import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import detailedTopology from "world-atlas/countries-50m.json";
import coarseTopology from "world-atlas/countries-110m.json";

// The backdrop of the addresses section: country outlines as plain shapes, and a
// pulsing dot per address joined by a line. No map tiles and no map service. It
// is a server component, so the browser receives plain SVG and no JavaScript.
// It sits behind the page (fixed, -z-10), ignores clicks, and fades toward the
// edges so it never competes with the content on top of it.

type MapPoint = {
  id: number;
  label: string;
  latitude: number;
  longitude: number;
};

// Windows are wide (desktop) or tall (phone), and one picture cannot fit both.
// So two are drawn, and CSS shows the one that matches the window's orientation.
// `unit` scales dots and text so they look the same size on both.
type Canvas = {
  width: number;
  height: number;
  padX: number; // keeps the dots (and their labels) away from the edges
  padY: number;
  unit: number;
};
const LANDSCAPE: Canvas = { width: 1600, height: 900, padX: 220, padY: 160, unit: 1 };
const PORTRAIT: Canvas = { width: 900, height: 1600, padX: 170, padY: 300, unit: 2.2 };

// Never zoom in closer than this, or two addresses in one city would zoom to street level
const MIN_LON_SPAN = 3; // degrees
const MIN_LAT_SPAN = 2;
// What to show when there are no addresses yet: most of the inhabited world
const WORLD = { west: -170, east: 170, south: -55, north: 75 };

// Parsed once per server process, not per request
function toCountries(data: unknown) {
  const topology = data as Topology;
  return feature(
    topology,
    topology.objects.countries,
  ) as unknown as FeatureCollection<Geometry>;
}
const detailedCountries = toCountries(detailedTopology); // 740 KB, for zoomed-in maps
const coarseCountries = toCountries(coarseTopology); // 108 KB, for wide maps

// Beyond this many degrees across, detailed outlines only add page weight
const COARSE_ABOVE_LON_SPAN = 25;

function area(points: MapPoint[]) {
  if (points.length === 0) return WORLD;

  const lons = points.map((p) => p.longitude);
  const lats = points.map((p) => p.latitude);
  const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const halfLon = Math.max(Math.max(...lons) - Math.min(...lons), MIN_LON_SPAN) / 2;
  const halfLat = Math.max(Math.max(...lats) - Math.min(...lats), MIN_LAT_SPAN) / 2;
  return {
    west: centerLon - halfLon,
    east: centerLon + halfLon,
    south: Math.max(centerLat - halfLat, -80), // Mercator stretches the poles
    north: Math.min(centerLat + halfLat, 80),
  };
}

function MapSvg({
  points,
  canvas,
  className,
}: {
  points: MapPoint[];
  canvas: Canvas;
  className: string;
}) {
  const { width, height, padX, padY, unit: u } = canvas;
  const { west, east, south, north } = area(points);

  // Zoom and position the world so that area fills the canvas
  const projection = geoMercator().fitExtent(
    [
      [padX, padY],
      [width - padX, height - padY],
    ],
    {
      type: "MultiPoint",
      coordinates: [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
      ],
    },
  );
  // The picture is fitted with "meet", so a window shaped differently from the
  // canvas shows empty bars. Drawing shapes beyond the canvas fills those bars,
  // so the map never seems to end in a straight cut.
  projection.clipExtent([
    [-width * 0.25, -height * 0.25],
    [width * 1.25, height * 1.25],
  ]);

  // Few decimals keep the SVG small: whole pixels are enough for a wide view
  const isWide = east - west > COARSE_ABOVE_LON_SPAN;
  const toPath = geoPath(projection).digits(isWide ? 0 : 1);
  const countries = isWide ? coarseCountries : detailedCountries;
  const shapes = countries.features
    .map((country, i) => ({ key: country.id ?? i, d: toPath(country) }))
    .filter((shape) => shape.d);

  // Dots in the order the addresses were saved, joined by one line
  const dots = points
    .map((p) => {
      const xy = projection([p.longitude, p.latitude]);
      return xy ? { ...p, x: xy[0], y: xy[1] } : null;
    })
    .filter((d): d is MapPoint & { x: number; y: number } => d !== null);
  const line = dots.map((d, i) => `${i === 0 ? "M" : "L"}${d.x},${d.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      // Decorative: the list already says everything the map shows
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
      className={`pointer-events-none fixed inset-0 -z-10 h-full w-full [mask-image:radial-gradient(ellipse_85%_85%_at_center,#000_60%,transparent_100%)] ${className}`}
    >
      <g className="fill-zinc-500/15 stroke-zinc-500/25 dark:fill-zinc-400/10 dark:stroke-zinc-400/20">
        {shapes.map((shape) => (
          <path key={shape.key} d={shape.d!} strokeWidth={1} />
        ))}
      </g>

      {dots.length > 1 && (
        <path
          d={line}
          fill="none"
          strokeWidth={3 * u}
          strokeDasharray={`${10 * u} ${8 * u}`}
          className="stroke-sky-500/50"
        />
      )}

      {dots.map((d, i) => {
        const nearRightEdge = d.x > width * 0.7;
        return (
          <g key={d.id}>
            {/* Soft glow, then two rings that spread out and fade. Staggered per
                dot so they do not all pulse in step. Hidden for visitors who
                asked their system for less motion. */}
            <circle cx={d.x} cy={d.y} r={30 * u} className="fill-sky-500/15" />
            {[0, 1.8].map((offset) => (
              <circle
                key={offset}
                cx={d.x}
                cy={d.y}
                r={14 * u}
                fill="none"
                strokeWidth={2.5 * u}
                className="stroke-sky-500/60 motion-reduce:hidden"
              >
                <animate
                  attributeName="r"
                  from={14 * u}
                  to={110 * u}
                  dur="3.6s"
                  begin={`${offset + i * 0.7}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.9"
                  to="0"
                  dur="3.6s"
                  begin={`${offset + i * 0.7}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
            <circle
              cx={d.x}
              cy={d.y}
              r={14 * u}
              strokeWidth={3 * u}
              className="fill-sky-600/80 stroke-white/70 dark:stroke-black/50"
            />
            <text
              x={nearRightEdge ? d.x - 26 * u : d.x + 26 * u}
              y={d.y - 20 * u}
              textAnchor={nearRightEdge ? "end" : "start"}
              fontSize={24 * u}
              strokeWidth={5 * u}
              paintOrder="stroke"
              className="fill-zinc-700/70 stroke-white/60 dark:fill-zinc-200/70 dark:stroke-black/60"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AddressMap({ points }: { points: MapPoint[] }) {
  return (
    <>
      <MapSvg points={points} canvas={LANDSCAPE} className="portrait:hidden" />
      <MapSvg points={points} canvas={PORTRAIT} className="hidden portrait:block" />
    </>
  );
}
