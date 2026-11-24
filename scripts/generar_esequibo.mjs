// Reemplaza el contorno aproximado de "Guayana Esequiba" en
// frontend/src/data/venezuela.json por la geometría real del territorio
// en disputa (relación 16782944 de OpenStreetMap), simplificada.
//
// Uso:  node scripts/generar_esequibo.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GEO = join(ROOT, "frontend", "src", "data", "venezuela.json");
const EPS = 0.01; // grados → ~432 puntos, ~7 KB

const NOMINATIM =
  "https://nominatim.openstreetmap.org/search?q=Guayana%20Esequiba&format=json&polygon_geojson=1&limit=1";

// --- Douglas-Peucker (sobre [lon, lat]) ---
function perp(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perp(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > eps) {
    return [
      ...simplify(pts.slice(0, idx + 1), eps).slice(0, -1),
      ...simplify(pts.slice(idx), eps)
    ];
  }
  return [pts[0], pts[pts.length - 1]];
}

async function main() {
  console.log("Descargando geometría de Guayana Esequiba (OSM)…");
  const res = await fetch(NOMINATIM, {
    headers: { "User-Agent": "MEP-censo-map/1.0 (admin@mep.org.ve)" }
  });
  if (!res.ok) throw new Error("Nominatim respondió HTTP " + res.status);
  const results = await res.json();
  if (!results || !results[0] || !results[0].geojson) {
    throw new Error("No se encontró el polígono en Nominatim");
  }
  const gj = results[0].geojson;
  const ring = gj.type === "Polygon" ? gj.coordinates[0] : gj.coordinates[0][0];

  const simp = simplify(ring, EPS).map(([lon, lat]) => [
    Number(lon.toFixed(4)),
    Number(lat.toFixed(4))
  ]);

  // Cierra el anillo (primer punto == último)
  const first = simp[0];
  const last = simp[simp.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) simp.push([first[0], first[1]]);

  const feature = {
    type: "Feature",
    properties: { name: "Guayana Esequiba" },
    geometry: { type: "Polygon", coordinates: [simp] }
  };
  const featureJson = JSON.stringify(feature);

  const raw = readFileSync(GEO, "utf8");
  const marker = '"name":"Guayana Esequiba"';
  const i = raw.indexOf(marker);
  if (i === -1) throw new Error("No se encontró el feature 'Guayana Esequiba'");

  const start = raw.lastIndexOf('{"type":"Feature"', i);
  if (start === -1) throw new Error("No se pudo localizar el inicio del feature");

  // El feature es el último del array; la cola final es "]}"
  const tail = raw.slice(raw.length - 2);
  if (tail !== "]}") throw new Error("Estructura inesperada al final del archivo");

  const nuevo = raw.slice(0, start) + featureJson + tail;
  writeFileSync(GEO, nuevo, "utf8");

  console.log("✔ Guayana Esequiba reemplazada");
  console.log("  puntos originales:", ring.length, "→ simplificados:", simp.length);
  console.log(
    "  tamaño:", featureJson.length, "bytes | archivo final:",
    (nuevo.length / 1024).toFixed(1), "KB"
  );
}

main().catch((e) => {
  console.error("✖", e.message);
  process.exit(1);
});
