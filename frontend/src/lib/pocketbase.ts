import PocketBase from "pocketbase";
import type { Role } from "./types";

const url = import.meta.env.VITE_PB_URL ?? "https://backtendcenso.andresdig.org";

export const pb = new PocketBase(url);
pb.autoCancellation(false);

/**
 * Devuelve el rol del usuario autenticado.
 * - Staff (colección `users`) tiene campo `role`.
 * - Militante (colección `militantes`) no tiene `role` -> se asume "militante".
 */
export function getRole(): Role | null {
  const model = pb.authStore.model as Record<string, unknown> | null;
  if (!model) return null;
  if (typeof model.role === "string") return model.role as Role;
  return "militante";
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}

/** Página de inicio del militante: carnet si está aprobado, si no la planilla. */
export function militantHome(): string {
  const model = pb.authStore.model as Record<string, unknown> | null;
  return model?.estado_registro === "aprobado" ? "/mi-carnet" : "/planilla";
}

/** Inicia sesión probando primero staff (`users`) y luego militante (`militantes`). */
export async function login(email: string, password: string): Promise<Role> {
  try {
    await pb.collection("users").authWithPassword(email, password);
  } catch {
    // intentar como militante
    await pb.collection("militantes").authWithPassword(email, password);
  }
  registrarConexion("login").catch(() => {});
  return getRole()!;
}

export async function logout(): Promise<void> {
  await registrarConexion("logout").catch(() => {});
  pb.authStore.clear();
}

function detectDevice(ua: string): string {
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux";
  return "Desconocido";
}

/** Registra un evento de conexión (login/logout) en la colección `conexiones`. */
export async function registrarConexion(evento: "login" | "logout" | "sesion_activa"): Promise<void> {
  const model = pb.authStore.model as Record<string, any> | null;
  if (!model) return;
  const role = getRole();
  const esMilitante = role === "militante";

  let estadoNombre = "";
  let municipioNombre = "";
  try {
    if (model.estado) estadoNombre = (await pb.collection("estados").getOne(model.estado)).nombre;
    if (model.municipio) municipioNombre = (await pb.collection("municipios").getOne(model.municipio)).nombre;
  } catch {
    /* ignore */
  }

  const ua = navigator.userAgent;
  const nombre = [model.nombres || model.nombre, model.apellidos || model.apellido]
    .filter(Boolean)
    .join(" ")
    .trim();

  await pb.collection("conexiones").create({
    usuario: esMilitante ? null : model.id,
    militante: esMilitante ? model.id : null,
    tipo_usuario: esMilitante ? "militante" : "staff",
    nombre: nombre || model.email,
    email: model.email,
    rol: role,
    estado: estadoNombre,
    municipio: municipioNombre,
    user_agent: ua,
    dispositivo: detectDevice(ua),
    evento
  });
}

/** Registro público de un militante (crea el registro con estado borrador). */
export async function registrarMilitante(data: {
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
}) {
  return pb.collection("militantes").create({
    email: data.email,
    password: data.password,
    passwordConfirm: data.password,
    nombres: data.nombres,
    apellidos: data.apellidos,
    estado_registro: "borrador"
  });
}
