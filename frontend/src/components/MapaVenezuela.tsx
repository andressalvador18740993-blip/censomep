import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import venezuelaData from "../data/venezuela.json";

// Los nombres de `shapeName` en el GeoJSON coinciden con `estados.nombre`.
const venezuela: any = venezuelaData;

const WIDTH = 800;
const HEIGHT = 640;

interface Props {
  counts: Record<string, number>; // nombre de estado -> cantidad de militantes
  onSelect: (nombre: string) => void;
}

export default function MapaVenezuela({ counts, onSelect }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Ajusta automáticamente Venezuela al tamaño del SVG
  const projection = useMemo(() => geoMercator().fitSize([WIDTH, HEIGHT], venezuela), []);
  const path = useMemo(() => geoPath(projection), [projection]);

  const max = Math.max(1, ...Object.values(counts));

  function fill(nombre: string): string {
    const c = counts[nombre] || 0;
    if (c === 0) return "#e0e0e0"; // gris visible cuando no hay militantes
    const t = c / max; // 0..1
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
        {venezuela.features.map((feature: any, i: number) => {
          const nombre: string = feature.properties?.name || "";
          const count = counts[nombre] || 0;
          return (
            <path
              key={nombre || i}
              d={path(feature) || ""}
              fill={hovered === nombre ? "#FFF200" : fill(nombre)}
              stroke={stroke(nombre)}
              strokeWidth={1.2}
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
