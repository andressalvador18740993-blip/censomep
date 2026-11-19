// Cliente de PocketBase del worker (autentica como superusuario para automatizar).
import PocketBase from "pocketbase";
import "dotenv/config";

const url = process.env.PB_URL || "https://backtendcenso.andresdig.org";
const email = process.env.PB_EMAIL || "admin@mep.com";
const password = process.env.PB_PASSWORD || "";

export const pb = new PocketBase(url);
pb.autoCancellation(false);

let authenticated = false;

export async function ensureAuth() {
  if (authenticated && pb.authStore.isValid) return;
  await pb.collection("_superusers").authWithPassword(email, password);
  authenticated = true;
}

/** Genera el ID único del militante: ESTADO-MUNICIPIO-ALEATORIO-MEP */
export async function generarCodigo(estadoCodigo, municipioCodigo) {
  const aleatorio = String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
  const codigo = `${estadoCodigo}-${municipioCodigo}-${aleatorio}-MEP`;
  // verificar unicidad (reintentar en caso de colisión)
  const existente = await pb.collection("militantes").getFirstListItem(`codigo = "${codigo}"`).catch(() => null);
  if (existente) return generarCodigo(estadoCodigo, municipioCodigo);
  return codigo;
}
