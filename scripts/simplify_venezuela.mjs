// Simplifica el GeoJSON de Venezuela (geoBoundaries ADM1) para el mapa del dashboard.
// Uso: node scripts/simplify_venezuela.mjs <input.geojson> <output.geojson> [tolerancia]
import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
const output = process.argv[3];
const tolerance = Number(process.argv[4] || 0.03);

function perpDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const tt = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + tt * dx), p[1] - (a[1] + tt * dy));
}

function simplifyRing(ring, tol) {
  if (ring.length < 3) return ring;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < ring.length - 1; i++) {
    const d = perpDist(ring[i], ring[0], ring[ring.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > tol) {
    const left = simplifyRing(ring.slice(0, index + 1), tol);
    const right = simplifyRing(ring.slice(index), tol);
    return left.slice(0, -1).concat(right);
  }
  return [ring[0], ring[ring.length - 1]];
}

function simplifyPolygon(coords, tol) {
  return coords.map((ring) => simplifyRing(ring, tol));
}

function simplifyGeometry(geom, tol) {
  if (geom.type === "Polygon") {
    return { type: "Polygon", coordinates: simplifyPolygon(geom.coordinates, tol) };
  }
  if (geom.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: geom.coordinates.map((p) => simplifyPolygon(p, tol)) };
  }
  return geom;
}

const g = JSON.parse(readFileSync(input, "utf8"));

const out = {
  type: "FeatureCollection",
  features: g.features.map((f) => ({
    type: "Feature",
    properties: { name: f.properties.shapeName },
    geometry: simplifyGeometry(f.geometry, tolerance)
  }))
};

writeFileSync(output, JSON.stringify(out));
console.log(`✔ simplificado -> ${output}`);
console.log(`  features: ${out.features.length}, tolerancia: ${tolerance}`);
