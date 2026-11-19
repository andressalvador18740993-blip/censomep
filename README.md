# Militante MEP

Aplicación Web Progresiva (PWA) para automatizar el **censo, re-censo y carnetización** de los militantes del partido político MEP.

- **Colores institucionales:** morado `#63008F` · amarillo `#FFF200`
- **Backend:** [PocketBase](https://pocketbase.io) autohospedado (InterServer)
- **Frontend:** React + Vite + TypeScript + Tailwind (PWA), desplegado en Cloudflare Pages
- **Worker:** Node.js (generación de carnet PDF, cron)

---

## ⚠️ SEGURIDAD — lee esto primero

El archivo `.env` de la raíz contiene **secretos reales** (clave SSH del VPS y credenciales). **NUNCA lo subas a GitHub.** Ya está excluido en `.gitignore`. Antes de subir el repo, confirma que `git status` NO muestre `.env`. Si ya lo subiste por error, **revoca la clave SSH y cambia las contraseñas** de inmediato.

---

## Estado actual

Las **colecciones de PocketBase ya están creadas** en `https://backtendcenso.andresdig.org` (ver `scripts/bootstrap.mjs`):

| Colección | Tipo | Uso |
|---|---|---|
| `estados` | base | 25 entidades federales (sembradas) |
| `municipios` | base | Catálogo de municipios (⚠️ pendiente sembrar) |
| `users` | auth | Staff: `admin`, `nacional`, `regional`, `municipal` |
| `militantes` | auth | Los militantes (registro + ficha + carnet) |
| `conexiones` | base | Histórico de conexiones (rotativo 30 días) |
| `contadores` | base | Conteos agregados para el dashboard |
| `auditoria` | base | Registro de acciones sensibles |

Usuario **admin** de la app creado: `admin@mep.org.ve` (cámbiale la contraseña tras el primer acceso).

---

## Arquitectura

```
Navegador (PWA)
   │
   ▼
Cloudflare (CDN/WAF/DNS)
   ├─ app.mep.org.ve   → Cloudflare Pages (frontend estático)
   ├─ api.mep.org.ve   → proxy → InterServer → PocketBase (:8090)
   └─ worker.mep.org.ve→ proxy → InterServer → Worker Node (:8787)
```

---

## Estructura del repo

```
mep-censo-carnet/
├─ frontend/          # React + Vite + TS + Tailwind (PWA)
│  └─ src/pages/      # Login, Registro, Planilla, MiCarnet, Dashboard, Admin, Conexiones
├─ worker/            # Node.js: carnet PDF, cron, generación de ID
├─ scripts/           # bootstrap.mjs (crea colecciones + siembra estados + admin)
├─ data/              # estados.json (✔), municipios.json (pendiente)
├─ infra/             # Caddyfile, systemd, deploy.sh
├─ .github/workflows/ # CI: build + deploy a Cloudflare Pages
└─ .env.example       # plantilla de variables (NO commitear .env)
```

---

## Puesta en marcha local

```bash
# Frontend
cd frontend
npm install
npm run dev          # requiere VITE_PB_URL apuntando al backend

# Worker
cd worker
npm install
cp ../.env.example .env   # y rellena credenciales + WORKER_API_KEY
npm run dev
```

---

## Crear / recrear colecciones en PocketBase

```bash
node scripts/bootstrap.mjs
# variables opcionales: PB_URL, PB_EMAIL, PB_PASSWORD, APP_ADMIN_EMAIL, APP_ADMIN_PASSWORD
```

> ⚠️ El script es **destructivo** para las colecciones propias (borra y recrea `estados`, `municipios`, `militantes`, `conexiones`, `contadores`, `auditoria`). No borra `users` (la extiende).

---

## Despliegue

1. **Frontend** → Cloudflare Pages (proyecto `militante-mep`). El CI de GitHub Actions hace build + deploy al hacer push a `main`. Requiere secretos: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_PB_URL`.
2. **Backend** → PocketBase ya corre en InterServer detrás de Caddy.
3. **Worker** → copiar `worker/` al VPS (`/opt/mep/worker`), crear `.env`, instalar con `npm install` y activar `systemd/worker.service`.

---

## Roles y permisos

| Rol | Dashboard | Aprobar/Rechazar | Bloquear | Gestionar usuarios | Llenar planilla |
|---|---|---|---|---|---|
| admin (1) | Global | ✅ | ✅ | ✅ | — |
| nacional | Global (conteos) | ✅ | ✅ | ❌ | — |
| regional | Su estado | ❌ | ❌ | ❌ | — |
| municipal | Su municipio | ❌ | ❌ | ❌ | — |
| militante | — | — | — | — | ✅ propia |

---

## Pendiente por construir (handoff)

1. **Sembrar `municipios`** (~335 municipios de Venezuela) en `data/municipios.json` y cargarlos.
2. **Planilla interactiva** (multi-paso): datos, estado→municipio encadenado, foto, envío → estado `pendiente`.
3. **Generación de ID único** (`ESTADO-MUNICIPIO-ALEATORIO-MEP`) — base ya en `worker/src/pb.js`.
4. **Aprobación** (admin/nacional) → worker genera el carnet PDF y lo guarda en la ficha del militante (disponible para siempre en "Mi carnet", sin correo).
5. **Carnet PDF** con el diseño real (logo + foto + QR) — base en `worker/src/carnet.js`.
6. **Dashboard** con mapa de Venezuela (react-simple-maps + GeoJSON), drill-down estado→municipio→militante, export Excel/PDF.
7. **Panel admin**: aprobaciones, bloqueo/desbloqueo, gestión de usuarios staff.
8. **Monitor de conexiones** en tiempo real + cron de purga (>30 días) — base en `worker/src/cron.js`.
9. **Re-censo**: ciclos, versiones, regeneración de carnet.
10. **Worker desplegado**: para que el botón "Aprobar" genere el carnet automáticamente, desplegar el worker y configurar `VITE_WORKER_URL`.

---

## Datos que faltan del usuario

- Lista oficial de **municipios por estado** (o confirmación para generarla de fuentes públicas).
- **URL del worker** (`VITE_WORKER_URL`) para generar el carnet al aprobar.
- **Logo** en formato usable (PNG/SVG) para el carnet y la UI.
- Confirmar **dominio** para Cloudflare Pages (`app.mep.org.ve`) y el proyecto de Pages.
