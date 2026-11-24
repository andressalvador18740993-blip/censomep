import { useMemo, useState } from "react";
import venezuelaData from "../data/venezuela.json";

const venezuela: any = venezuelaData;
const WIDTH = 800;
const HEIGHT = 640;
const PAD = 20;

interface Props {
  counts: Record<string, number>; // nombre de estado -> cantidad de militantes
  onSelect: (nombre: string) => void;
  selectedName?: string; // nombre del estado actualmente seleccionado (opcional)
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

function rings(geometry: any): number[][][] {
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

/** Área (shoelace) y centroide de un anillo ya proyectado a [x, y]. */
function polyArea(xy: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < xy.length - 1; i++) {
    a += xy[i][0] * xy[i + 1][1] - xy[i + 1][0] * xy[i][1];
  }
  return Math.abs(a) / 2;
}

function polyCentroid(xy: [number, number][]): [number, number] {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < xy.length - 1; i++) {
    const cross = xy[i][0] * xy[i + 1][1] - xy[i + 1][0] * xy[i][1];
    a += cross;
    cx += (xy[i][0] + xy[i + 1][0]) * cross;
    cy += (xy[i][1] + xy[i + 1][1]) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-6) return [xy[0][0], xy[0][1]];
  return [cx / (6 * a), cy / (6 * a)];
}

export default function MapaVenezuela({ counts, onSelect, selectedName }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const project = useMemo(buildProjection, []);

  const { paths, labels } = useMemo(() => {
    const paths = venezuela.features.map((f: any) => ({
      nombre: (f.properties?.name as string) || "",
      d: geometryToPath(f.geometry, project)
    }));

    // Etiquetas: centroide del anillo más grande de cada estado.
    const labels: { nombre: string; x: number; y: number; area: number }[] = [];
    for (const f of venezuela.features) {
      const nombre = (f.properties?.name as string) || "";
      let bestArea = -1;
      let best: [number, number] = [0, 0];
      for (const ring of rings(f.geometry)) {
        const xy: [number, number][] = ring.map(([lon, lat]) => project(lon, lat));
        const area = polyArea(xy);
        if (area > bestArea) {
          bestArea = area;
          best = polyCentroid(xy);
        }
      }
      labels.push({ nombre, x: best[0], y: best[1], area: bestArea });
    }
    return { paths, labels };
  }, [project]);

  const max = Math.max(1, ...Object.values(counts));

  function fill(nombre: string): string {
    const c = counts[nombre] || 0;
    if (c === 0) return "#e2e8f0";
    const t = c / max;
    return `rgba(99, 0, 143, ${0.35 + 0.65 * t})`;
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-[340px] w-full sm:h-[460px]"
      role="img"
      aria-label="Mapa de Venezuela"
    >
      <defs>
        <filter id="mapShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#f8fafc" />

      <g filter="url(#mapShadow)">
        {paths.map(({ nombre, d }: { nombre: string; d: string }, i: number) => {
          const count = counts[nombre] || 0;
          const selected = selectedName === nombre;
          const isHover = hovered === nombre;
          return (
            <path
              key={nombre || i}
              d={d}
              fill={isHover ? "#FFF200" : selected ? "#63008F" : fill(nombre)}
              stroke={selected || isHover ? "#FFF200" : "#ffffff"}
              strokeWidth={selected || isHover ? 2 : 1.4}
              strokeLinejoin="round"
              onClick={() => onSelect(nombre)}
              onMouseEnter={() => setHovered(nombre)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer transition-[fill,stroke-width] duration-150"
            >
              <title>{`${nombre}: ${count} militantes`}</title>
            </path>
          );
        })}
      </g>

      <g pointerEvents="none">
        {labels.map(({ nombre, x, y, area }) => {
          if (area < 260) return null; // estados/islas demasiado pequeños
          const selected = selectedName === nombre;
          const dim = counts[nombre] === 0 && !selected;
          return (
            <text
              key={nombre}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize={11}
              fontWeight={selected ? 800 : 600}
              fill={selected ? "#FFF200" : dim ? "#94a3b8" : "#1e293b"}
              stroke="#ffffff"
              strokeWidth={3}
              paintOrder="stroke"
              style={{ letterSpacing: "0.02em" }}
            >
              {nombre}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
