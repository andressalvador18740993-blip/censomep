import { useMemo, useState } from "react";
import venezuelaData from "../data/venezuela.json";

const venezuela: any = venezuelaData;
const WIDTH = 800;
const HEIGHT = 640;
const PAD = 20;

interface Props {
  counts: Record<string, number>; // nombre de estado -> cantidad de militantes
  onSelect: (nombre: string) => void;
}

/** Proyección Mercator manual (sin depender de d3-geo, que aquí falla). */
function buildProjection() {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const walk = (c: any) => {
    if (typeof c[0] === "number") {
      minLon = Math.min(minLon, c[0]); maxLon = Math.max(maxLon, c[0]);
      minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1]);
    } else for (const x of c) walk(x);
  };
  venezuela.features.forEach((f: any) => walk(f.geometry.coordinates));

  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const lonHalf = ((maxLon - minLon) / 2) * (Math.PI / 180);
  const latHalf = Math.max(
    Math.abs(mercY(maxLat) - mercY(centerLat)),
    Math.abs(mercY(minLat) - mercY(centerLat))
  );
  const scale = Math.min((WIDTH / 2 - PAD) / lonHalf, (HEIGHT / 2 - PAD) / latHalf);

  return (lon: number, lat: number): [number, number] => {
    const x = WIDTH / 2 + scale * (lon - centerLon) * (Math.PI / 180);
    const y = HEIGHT / 2 - scale * (mercY(lat) - mercY(centerLat));
    return [x, y];
  };
}

function ringToPath(ring: number[][], project: (lon: number, lat: number) => [number, number]): string {
  return (
    ring
      .map(([lon, lat], i) => {
        const [x, y] = project(lon, lat);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join("") + "Z"
  );
}

function geometryToPath(geometry: any, project: (lon: number, lat: number) => [number, number]): string {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((ring: number[][]) => ringToPath(ring, project)).join("");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .map((poly: number[][][]) => poly.map((ring) => ringToPath(ring, project)).join(""))
      .join("");
  }
  return "";
}

export default function MapaVenezuela({ counts, onSelect }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const project = useMemo(buildProjection, []);
  const paths = useMemo<{ nombre: string; d: string }[]>(
    () =>
      venezuela.features.map((f: any) => ({
        nombre: (f.properties?.name as string) || "",
        d: geometryToPath(f.geometry, project)
      })),
    [project]
  );

  const max = Math.max(1, ...Object.values(counts));

  function fill(nombre: string): string {
    const c = counts[nombre] || 0;
    if (c === 0) return "#e0e0e0";
    const t = c / max;
    return `rgba(99, 0, 143, ${0.35 + 0.65 * t})`;
  }

  function stroke(nombre: string): string {
    return (counts[nombre] || 0) > 0 ? "#ffffff" : "#9ca3af";
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-[340px] w-full sm:h-[460px]"
      role="img"
      aria-label="Mapa de Venezuela"
    >
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#f8fafc" />
      <g>
        {paths.map(({ nombre, d }, i) => {
          const count = counts[nombre] || 0;
          return (
            <path
              key={nombre || i}
              d={d}
              fill={hovered === nombre ? "#FFF200" : fill(nombre)}
              stroke={stroke(nombre)}
              strokeWidth={1.2}
              strokeLinejoin="round"
              onClick={() => onSelect(nombre)}
              onMouseEnter={() => setHovered(nombre)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer transition-colors"
            >
              <title>{`${nombre}: ${count} militantes`}</title>
            </path>
          );
        })}
      </g>
    </svg>
  );
}
