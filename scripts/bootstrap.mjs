// scripts/bootstrap.mjs
// Crea/configura las colecciones de PocketBase para "Militante MEP".
// Uso:  node scripts/bootstrap.mjs   (lee PB_URL, PB_EMAIL, PB_PASSWORD del entorno o usa defaults)
// Idempotente y NO destructivo: añade campos faltantes y siembra solo si está vacío.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const PB_URL = (process.env.PB_URL || "https://backtendcenso.andresdig.org").replace(/\/$/, "");
const PB_EMAIL = process.env.PB_EMAIL || "admin@mep.com";
const PB_PASSWORD = process.env.PB_PASSWORD || "Mepgil2026";

const APP_ADMIN_EMAIL = process.env.APP_ADMIN_EMAIL || "admin@mep.org.ve";
const APP_ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD || "MepAdmin2026!";

let token = "";

async function api(path, method = "GET", body) {
  const res = await fetch(PB_URL + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data.message || data.data || data)}`);
  }
  return data;
}

async function auth() {
  const data = await api("/api/collections/_superusers/auth-with-password", "POST", {
    identity: PB_EMAIL,
    password: PB_PASSWORD,
  });
  token = data.token;
  console.log("✔ Autenticado como superusuario");
}

async function listCollections() {
  const data = await api("/api/collections?perPage=200");
  return data.items || [];
}

async function upsertCollection(name, definition) {
  const items = await listCollections();
  const existing = items.find((c) => c.name === name);

  if (!existing) {
    const data = await api("/api/collections", "POST", definition);
    console.log(`  + colección creada: ${name} (${data.type})`);
    return data;
  }

  // existe -> añadir solo los campos que faltan (no tocar reglas ni índices existentes)
  const existingNames = new Set(existing.fields.map((f) => f.name));
  const missing = definition.fields.filter((f) => !existingNames.has(f.name));
  if (missing.length === 0) {
    console.log(`  = colección ya configurada: ${name}`);
    return existing;
  }
  await api(`/api/collections/${existing.id}`, "PATCH", {
    fields: [...existing.fields, ...missing],
  });
  console.log(`  = colección actualizada: ${name} (+${missing.length} campos)`);
  return { ...existing, fields: [...existing.fields, ...missing] };
}

function autodates() {
  return [
    { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
  ];
}

async function seedEstados() {
  const existing = await api("/api/collections/estados/records?perPage=1");
  if (existing.totalItems > 0) {
    console.log(`  = estados ya sembrados (${existing.totalItems > 0 ? "sí" : "no"})`);
    return;
  }
  const estados = JSON.parse(readFileSync(join(ROOT, "data", "estados.json"), "utf8"));
  for (const e of estados) {
    await api(`/api/collections/estados/records`, "POST", { codigo: e.codigo, nombre: e.nombre });
  }
  console.log(`  ✔ sembrados ${estados.length} estados`);
}

async function seedMunicipios() {
  const existing = await api("/api/collections/municipios/records?perPage=1");
  if (existing.totalItems > 0) {
    console.log("  = municipios ya sembrados");
    return;
  }
  const municipios = JSON.parse(readFileSync(join(ROOT, "data", "municipios.json"), "utf8"));
  const estadosRecords = await api("/api/collections/estados/records?perPage=200");
  const codigoToId = {};
  for (const e of estadosRecords.items) codigoToId[e.codigo] = e.id;

  let count = 0;
  const CHUNK = 25;
  for (let i = 0; i < municipios.length; i += CHUNK) {
    const chunk = municipios.slice(i, i + CHUNK);
    await Promise.all(chunk.map(async (m) => {
      const estadoId = codigoToId[m.estado];
      if (!estadoId) {
        console.warn(`  ! estado no encontrado: ${m.estado} (${m.nombre})`);
        return;
      }
      await api(`/api/collections/municipios/records`, "POST", { codigo: m.codigo, nombre: m.nombre, estado: estadoId });
      count++;
    }));
  }
  console.log(`  ✔ sembrados ${count} municipios`);
}

async function ensureAdminUser() {
  const existing = await api(`/api/collections/users/records?perPage=1&filter=(email='${APP_ADMIN_EMAIL}')`);
  if (existing.totalItems > 0) {
    console.log(`  = usuario admin ya existe: ${APP_ADMIN_EMAIL}`);
    return;
  }
  await api(`/api/collections/users/records`, "POST", {
    email: APP_ADMIN_EMAIL,
    password: APP_ADMIN_PASSWORD,
    passwordConfirm: APP_ADMIN_PASSWORD,
    nombre: "Administrador",
    apellido: "MEP",
    role: "admin",
    activo: true,
    verified: true,
  });
  console.log(`  ✔ usuario admin creado: ${APP_ADMIN_EMAIL}`);
}

async function main() {
  await auth();

  // 1) estados
  const estados = await upsertCollection("estados", {
    name: "estados",
    type: "base",
    fields: [
      { name: "codigo", type: "text", required: true, max: 5, unique: true },
      { name: "nombre", type: "text", required: true, max: 100 },
      ...autodates(),
    ],
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });

  // 2) municipios
  const municipios = await upsertCollection("municipios", {
    name: "municipios",
    type: "base",
    fields: [
      { name: "codigo", type: "text", required: true, max: 6 },
      { name: "nombre", type: "text", required: true, max: 150 },
      { name: "estado", type: "relation", required: true, collectionId: estados.id, maxSelect: 1 },
      ...autodates(),
    ],
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });

  // 3) users (extender la colección por defecto)
  const items = await listCollections();
  const users = items.find((c) => c.name === "users");
  const existingNames = new Set(users.fields.map((f) => f.name));
  const newFields = [
    { name: "nombre", type: "text", max: 100 },
    { name: "apellido", type: "text", max: 100 },
    { name: "role", type: "select", required: true, maxSelect: 1, values: ["admin", "nacional", "regional", "municipal"] },
    { name: "estado", type: "relation", collectionId: estados.id, maxSelect: 1 },
    { name: "municipio", type: "relation", collectionId: municipios.id, maxSelect: 1 },
    { name: "activo", type: "bool" },
  ];
  const fieldsToAdd = newFields.filter((f) => !existingNames.has(f.name));
  if (fieldsToAdd.length) {
    await api(`/api/collections/${users.id}`, "PATCH", {
      fields: [...users.fields, ...fieldsToAdd],
      listRule: '@request.auth.role = "admin"',
      viewRule: '@request.auth.role = "admin" || @request.auth.id = id',
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin" || @request.auth.id = id',
      deleteRule: '@request.auth.role = "admin"',
      manageRule: '@request.auth.role = "admin"',
    });
    console.log("  + campos de staff añadidos a users");
  } else {
    console.log("  = users ya configurada");
  }

  // 4) militantes (auth)
  const militantes = await upsertCollection("militantes", {
    name: "militantes",
    type: "auth",
    fields: [
      { name: "nombres", type: "text", max: 120 },
      { name: "apellidos", type: "text", max: 120 },
      { name: "cedula", type: "text", max: 15, unique: true },
      { name: "fecha_nacimiento", type: "date" },
      { name: "sexo", type: "select", maxSelect: 1, values: ["Masculino", "Femenino", "Otro"] },
      { name: "lugar_nacimiento", type: "text", max: 150 },
      { name: "estado_civil", type: "select", maxSelect: 1, values: ["Soltero(a)", "Casado(a)", "Divorciado(a)", "Viudo(a)", "Unión libre"] },
      { name: "profesion", type: "text", max: 150 },
      { name: "oficio", type: "text", max: 150 },
      { name: "telefono", type: "text", max: 20 },
      { name: "direccion", type: "text", max: 255 },
      { name: "parroquia", type: "text", max: 120 },
      { name: "sector", type: "text", max: 120 },
      { name: "punto_referencia", type: "text", max: 255 },
      { name: "facebook", type: "text", max: 150 },
      { name: "instagram", type: "text", max: 150 },
      { name: "trabajo", type: "bool" },
      { name: "nombre_empresa", type: "text", max: 150 },
      { name: "nivel_instruccion", type: "select", maxSelect: 1, values: ["Ninguno", "Primaria", "Secundaria", "Técnico Medio", "Universitario", "Postgrado"] },
      { name: "area", type: "text", max: 150 },
      { name: "especializacion", type: "text", max: 150 },
      { name: "sector_activa", type: "select", maxSelect: 1, values: ["Juventud", "Mujer", "Profesionales y Técnicos", "Sindical", "Educador"] },
      { name: "centro_votacion", type: "text", max: 150 },
      { name: "codigo_centro", type: "text", max: 50 },
      { name: "mesa", type: "text", max: 50 },
      { name: "aporte_voluntario", type: "text", max: 255 },
      { name: "estado", type: "relation", collectionId: estados.id, maxSelect: 1 },
      { name: "municipio", type: "relation", collectionId: municipios.id, maxSelect: 1 },
      { name: "foto", type: "file", maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp"] },
      { name: "codigo", type: "text", max: 30, unique: true },
      { name: "estado_registro", type: "select", maxSelect: 1, values: ["borrador", "pendiente", "aprobado", "rechazado", "bloqueado"] },
      { name: "aprobado_por", type: "relation", collectionId: users.id, maxSelect: 1 },
      { name: "fecha_aprobacion", type: "date" },
      { name: "motivo_rechazo", type: "text", max: 255 },
      { name: "carnet_pdf", type: "file", maxSelect: 1, maxSize: 10485760, mimeTypes: ["application/pdf"] },
      { name: "carnet_generado", type: "bool" },
      { name: "carnet_enviado", type: "bool" },
      { name: "carnet_impreso", type: "bool" },
      { name: "fecha_envio", type: "date" },
      { name: "version_censo", type: "number", onlyInt: true },
      { name: "ultimo_recenso", type: "date" },
      { name: "recenso_pendiente", type: "bool" },
      { name: "tipo_registro", type: "select", maxSelect: 1, values: ["inscripcion", "recenso"] },
      { name: "responsable_registro", type: "text", max: 200 },
      { name: "acepto_declaracion", type: "bool" },
      ...autodates(),
    ],
    authRule: "",
    manageRule: '@request.auth.id = id || @request.auth.role = "admin"',
    passwordAuth: { enabled: true, identityFields: ["email"] },
    listRule: '@request.auth.id = id || @request.auth.role = "admin" || @request.auth.role = "nacional" || (@request.auth.role = "regional" && estado = @request.auth.estado) || (@request.auth.role = "municipal" && municipio = @request.auth.municipio)',
    viewRule: '@request.auth.id = id || @request.auth.role = "admin" || @request.auth.role = "nacional" || (@request.auth.role = "regional" && estado = @request.auth.estado) || (@request.auth.role = "municipal" && municipio = @request.auth.municipio)',
    createRule: "",
    updateRule: '@request.auth.id = id || @request.auth.role = "admin" || @request.auth.role = "nacional"',
    deleteRule: '@request.auth.role = "admin"',
  });

  // 5) conexiones
  await upsertCollection("conexiones", {
    name: "conexiones",
    type: "base",
    fields: [
      { name: "usuario", type: "relation", collectionId: users.id, maxSelect: 1 },
      { name: "militante", type: "relation", collectionId: militantes.id, maxSelect: 1 },
      { name: "tipo_usuario", type: "select", maxSelect: 1, values: ["staff", "militante"] },
      { name: "nombre", type: "text", max: 200 },
      { name: "email", type: "text", max: 200 },
      { name: "rol", type: "text", max: 50 },
      { name: "estado", type: "text", max: 100 },
      { name: "municipio", type: "text", max: 150 },
      { name: "ip", type: "text", max: 50 },
      { name: "pais", type: "text", max: 100 },
      { name: "user_agent", type: "text", max: 500 },
      { name: "dispositivo", type: "text", max: 100 },
      { name: "evento", type: "select", maxSelect: 1, values: ["login", "logout", "sesion_activa"] },
      ...autodates(),
    ],
    listRule: '@request.auth.role = "admin" || @request.auth.role = "nacional"',
    viewRule: '@request.auth.role = "admin" || @request.auth.role = "nacional"',
    createRule: '@request.auth.id != ""',
    updateRule: null,
    deleteRule: null,
  });

  // 6) contadores
  await upsertCollection("contadores", {
    name: "contadores",
    type: "base",
    fields: [
      { name: "estado", type: "relation", required: true, collectionId: estados.id, maxSelect: 1 },
      { name: "municipio", type: "relation", collectionId: municipios.id, maxSelect: 1 },
      { name: "total", type: "number", onlyInt: true },
      { name: "aprobados", type: "number", onlyInt: true },
      { name: "pendientes", type: "number", onlyInt: true },
      { name: "rechazados", type: "number", onlyInt: true },
      { name: "bloqueados", type: "number", onlyInt: true },
      ...autodates(),
    ],
    listRule: '@request.auth.role = "admin" || @request.auth.role = "nacional" || (@request.auth.role = "regional" && estado = @request.auth.estado) || (@request.auth.role = "municipal" && municipio = @request.auth.municipio)',
    viewRule: '@request.auth.role = "admin" || @request.auth.role = "nacional" || (@request.auth.role = "regional" && estado = @request.auth.estado) || (@request.auth.role = "municipal" && municipio = @request.auth.municipio)',
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });

  // 7) auditoria
  await upsertCollection("auditoria", {
    name: "auditoria",
    type: "base",
    fields: [
      { name: "usuario", type: "relation", collectionId: users.id, maxSelect: 1 },
      { name: "accion", type: "text", max: 200 },
      { name: "detalle", type: "text", max: 1000 },
      { name: "ip", type: "text", max: 50 },
      ...autodates(),
    ],
    listRule: '@request.auth.role = "admin"',
    viewRule: '@request.auth.role = "admin"',
    createRule: '@request.auth.id != ""',
    updateRule: null,
    deleteRule: null,
  });

  // 8) estructura (cargos directivos CPR / CPM)
  await upsertCollection("estructura", {
    name: "estructura",
    type: "base",
    fields: [
      { name: "nivel", type: "select", required: true, maxSelect: 1, values: ["CPR", "CPM"] },
      { name: "estado", type: "relation", required: true, collectionId: estados.id, maxSelect: 1 },
      { name: "municipio", type: "relation", collectionId: municipios.id, maxSelect: 1 },
      { name: "cargo", type: "select", required: true, maxSelect: 1, values: [
        "Coordinador/a",
        "Organización",
        "Finanzas",
        "Formación",
        "Comunicación y Propaganda",
        "Electoral",
        "Juventud",
        "Mujer",
        "Profesionales y Técnicos",
        "Sindical",
        "Educadores",
        "Movimientos Sociales",
        "Asuntos Indígenas",
        "Derechos Humanos"
      ] },
      { name: "nombres", type: "text", required: true, max: 120 },
      { name: "apellidos", type: "text", required: true, max: 120 },
      { name: "cedula", type: "text", max: 15 },
      { name: "telefono", type: "text", max: 20 },
      { name: "email", type: "text", max: 200 },
      { name: "activo", type: "bool" },
      { name: "fecha_designacion", type: "date" },
      { name: "creado_por", type: "relation", collectionId: users.id, maxSelect: 1 },
      ...autodates(),
    ],
    listRule: '@request.auth.role = "admin" || @request.auth.role = "nacional" || (@request.auth.role = "regional" && estado = @request.auth.estado) || (@request.auth.role = "municipal" && nivel = "CPM" && municipio = @request.auth.municipio)',
    viewRule: '@request.auth.role = "admin" || @request.auth.role = "nacional" || (@request.auth.role = "regional" && estado = @request.auth.estado) || (@request.auth.role = "municipal" && nivel = "CPM" && municipio = @request.auth.municipio)',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "nacional" || @request.auth.role = "regional" || @request.auth.role = "municipal"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "nacional" || (@request.auth.role = "regional" && estado = @request.auth.estado) || (@request.auth.role = "municipal" && nivel = "CPM" && municipio = @request.auth.municipio)',
    deleteRule: '@request.auth.role = "admin" || @request.auth.role = "nacional" || (@request.auth.role = "regional" && estado = @request.auth.estado) || (@request.auth.role = "municipal" && nivel = "CPM" && municipio = @request.auth.municipio)',
  });

  // Sembrar catálogos y crear admin
  await seedEstados();
  await seedMunicipios();
  await ensureAdminUser();

  console.log("\n✔ Bootstrap completado.");
  console.log(`  Admin app: ${APP_ADMIN_EMAIL} / ${APP_ADMIN_PASSWORD}  (cámbiala tras el primer acceso)`);
}

main().catch((e) => {
  console.error("✖ Error:", e.message);
  process.exit(1);
});
