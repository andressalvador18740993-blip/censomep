import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import venezuelaData from "../data/venezuela.json";

// Los nombres de `shapeName` en el GeoJSON coinciden con `estados.nombre`.
const venezuela: any = venezuelaData;

interface Props {
  counts: Record<string, number>; // nombre de estado -> cantidad de militantes
  onSelect: (nombre: string) => void;
}

export default function MapaVenezuela({ counts, onSelect }: Props) {
  const max = Math.max(1, ...Object.values(counts));

  function fill(nombre: string): string {
    const c = counts[nombre] || 0;
    if (c === 0) return "#e9d5f2";
    const t = c / max; // 0..1
    return `rgba(99, 0, 143, ${0.2 + 0.8 * t})`;
  }

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ center: [-66.5, 7.5], scale: 700 }}
      style={{ width: "100%", height: "auto" }}
    >
      <Geographies geography={venezuela}>
        {({ geographies }: { geographies: any[] }) =>
          geographies.map((geo: any) => {
            const nombre: string = geo.properties?.name || "";
            const count = counts[nombre] || 0;
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={fill(nombre)}
                stroke="#ffffff"
                strokeWidth={0.6}
                onClick={() => onSelect(nombre)}
                style={{
                  default: { outline: "none", cursor: "pointer" },
                  hover: { fill: "#FFF200", outline: "none" },
                  pressed: { outline: "none" }
                }}
              >
                <title>{`${nombre}: ${count} militantes`}</title>
              </Geography>
            );
          })
        }
      </Geographies>
    </ComposableMap>
  );
}
