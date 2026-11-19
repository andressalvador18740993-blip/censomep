# PLAN DE DESARROLLO — "Militante MEP"

> Aplicación Web Progresiva (PWA) para la automatización del censo, re-censo y carnetización de los militantes del partido político MEP.
>
> **Colores institucionales:** Morado `#63008F` · Amarillo `#FFF200`
>
> **Backend:** PocketBase (autohospedado en InterServer) · **Frontend:** PWA desplegada en subdominio de Cloudflare.

---

## 1. Resumen ejecutivo

Construir desde cero una plataforma web que automatice de punta a punta el ciclo de vida del militante:

**Registro → Planilla interactiva → ID único → Aprobación → Carnet automático → Envío por correo → Control y analítica en tiempo real.**

Con un control de acceso basado en **5 roles** (`admin`, `nacional`, `regional`, `municipal`, `militante`), un **dashboard geográfico interactivo** (estado → municipio → militante), exportación a **Excel/PDF**, panel de administración con bloqueo/desbloqueo, y un **monitor de conexiones en tiempo real** con histórico rotativo de 1 mes.

---

## 2. Alcance funcional (requerimientos)

| # | Requerimiento | Descripción |
|---|---|---|
| 1 | Login seguro | Autenticación por email/contraseña con hash seguro, tokens JWT, MFA (TOTP) para roles privilegiados, protección anti fuerza bruta. |
| 2 | Planilla automatizada | Formulario interactivo multi-paso (wizard) con validación, autocompletado de estado→municipio, guardado de borrador y foto. |
| 3 | ID único + carnet automático | Generación de código único (`ESTADO-MUNICIPIO-RANDOM-MEP`) y carnet PDF con foto, QR de verificación y colores institucionales. |
| 4 | Panel de administración | Acceso exclusivo con credenciales de admin (un solo admin). |
| 5 | Dashboard interactivo | Mapa de Venezuela en tiempo real: estado → municipio → detalle de militantes → planilla/carnet. Exportar a Excel e imprimir PDF. |
| 6 | Panel admin + flujo de aprobación + control de conexiones | Bloquear/desbloquear militantes, aprobación previa de planilla y carnet, monitor en tiempo real de usuarios conectados con histórico de 1 mes. |

**Roles y permisos (matriz resumida):**

| Rol | Dashboard | Aprobar/Rechazar | Bloquear/Desbloquear | Gestión usuarios | Llenar planilla |
|---|---|---|---|---|---|
| **admin** (1 solo) | Global | ✅ | ✅ | ✅ | — |
| **nacional** | Global (solo conteos) | ✅ | ✅ | ❌ | — |
| **regional** | Solo su estado + municipios | ❌ | ❌ | ❌ | — |
| **municipal** | Solo su municipio | ❌ | ❌ | ❌ | — |
| **militante** | — | — | — | — | ✅ (propia) |

---

## 3. Arquitectura general

```
                          ┌─────────────────────────── Cloudflare ───────────────────────────┐
 Usuario / Militante      │  DNS + Proxy (CDN, WAF, DDoS, TLS)                                │
        │                 │                                                                    │
        ▼                 │  app.mep.org.ve (Cloudflare Pages — Frontend PWA estático)         │
 ┌──────────────┐         │  api.mep.org.ve  ──(proxy)──►  InterServer (origen)               │
 │  Navegador   │────────►│  pdf.mep.org.ve ──(proxy)──►  Worker PDF                          │
 │  (PWA/SW)    │         └─────────────────────────────────────────────────────────────────────┘
 └──────────────┘                                    │
                                                     ▼
                                    ┌────────────────────────────────────┐
                                    │  InterServer (VPS Linux)           │
                                    │  ┌──────────────────────────────┐  │
                                    │  │ Caddy (reverse proxy + TLS)  │  │
                                    │  └──────────────┬───────────────┘  │
                                    │     ┌───────────┴───────────┐       │
                                    │     ▼                       ▼       │
                                    │  PocketBase            Worker Node │
                                    │  (API + Auth +         (PDF + email │
                                    │   Realtime SSE +        + cron +   │
                                    │   SQLite + archivos)    geolocaliz.)│
                                    │  pb_data/  (backups)                │
                                    └────────────────────────────────────┘
```

**Principio clave:** Frontend (SPA/PWA) se comunica con PocketBase vía **REST + Realtime (SSE)**. Un pequeño servicio *worker* en Node.js complementa a PocketBase para lo que no puede hacer nativamente: **generar PDFs de carnet**, **enviar correos con adjuntos** y **tareas programadas**.

---

## 4. Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Backend | **PocketBase** (última estable) | Auth, base de datos, API REST, tiempo real (SSE), archivos y reglas de acceso en un solo binario. |
| Worker | **Node.js + TypeScript** | Generación de PDF (`pdf-lib` / `@react-pdf/renderer` o `puppeteer`), envío SMTP (`nodemailer` o `Resend`), cron. |
| Frontend | **React 18 + Vite + TypeScript** | SPA rápida y mantenible. |
| Estilos | **Tailwind CSS** | Tema con los colores `#63008F` y `#FFF200`. |
| Estado/datos | **TanStack Query + PocketBase JS SDK** | Caché, suscripciones en tiempo real y manejo de sesión. |
| Mapa | **react-simple-maps + GeoJSON de Venezuela** | Coropletas interactivas por estado. |
| Exportación | **SheetJS (xlsx)** y **vista de impresión (print→PDF)** | Exportar a Excel e imprimir. |
| PWA | **vite-plugin-pwa** | Manifiesto, service worker, instalable, shell offline. |
| Proxy | **Caddy** (autocertificados) en InterServer | TLS automático y reverse proxy. |
| Edge/CDN | **Cloudflare** (Pages + Proxy + WAF) | Frontend estático, seguridad, DDoS, geolocalización por cabeceras. |
| CI/CD | **GitHub Actions** | Build y despliegue a Cloudflare Pages + InterServer. |

---

## 5. Modelo de datos (colecciones de PocketBase)

### 5.1 `estados` (catálogo)
- `id`, `codigo` (2–3 letras, único, ej. `ZUL`, `MIR`), `nombre`, `geojson_id` (clave del mapa).

### 5.2 `municipios` (catálogo)
- `id`, `codigo` (numérico, ej. `005`), `nombre`, `estado_id` (relación a `estados`).

> Venezuela: **24 entidades federales** (23 estados + Distrito Capital + Dependencias Federales) y **~335 municipios**. Este catálogo se carga como **semilla** (ver §12).

### 5.3 `users` — colección de autenticación (personal / staff)
- Campos base de PocketBase (`email`, `password`, `verified`, `created`, `updated`).
- `nombre`, `apellido`, `role` (`admin` | `nacional` | `regional` | `municipal`).
- `estado_id`, `municipio_id` (definen el **alcance** del regional/municipal; nulos en admin/nacional).
- `activo` (bool), `ultimo_acceso` (fecha).
- `mfa_enabled` (bool) — MFA TOTP.

### 5.4 `militantes` — colección de autenticación (los militantes)
> El militante **se registra e inicia sesión** con su email/contraseña; su propio registro ES su ficha.

- Base de auth (`email`, `password`, `verified`).
- **Datos personales:** `nombres`, `apellidos`, `cedula` (único), `fecha_nacimiento`, `sexo`, `telefono`, `direccion`, `foto` (archivo).
- **Ubicación:** `estado_id`, `municipio_id`, `parroquia`.
- **Código único:** `codigo` (único, formato `ESTADO-MUNICIPIO-RANDOM-MEP`).
- **Estado del proceso:** `estado_registro` = `borrador` | `pendiente` | `aprobado` | `rechazado` | `bloqueado`.
- **Aprobación:** `aprobado_por` (relación a `users`), `fecha_aprobacion`, `motivo_rechazo`.
- **Carnet:** `carnet_pdf` (archivo), `carnet_generado` (bool), `carnet_enviado` (bool), `fecha_envio`.
- **Re-censo:** `version_censo` (int), `ultimo_recenso` (fecha), `recenso_pendiente` (bool).
- `created`, `updated`.

### 5.5 `conexiones` — histórico de conexiones (rotativo 1 mes)
- `usuario_id` (relación genérica a `users` o `militantes`), `tipo_usuario` (`staff` | `militante`).
- `nombre`, `email`, `rol`.
- `estado`, `municipio` (**del perfil del usuario** — "desde dónde se conectó").
- `ip`, `pais` (auditoría opcional), `user_agent`, `dispositivo`.
- `evento` (`login` | `logout` | `sesion_activa`), `fecha` (timestamp).
- **Retención:** se purgan automáticamente registros con más de 30 días (cron en PocketBase).

### 5.6 `contadores` — estadísticas agregadas (para dashboard en tiempo real)
> Para que el dashboard sea instantáneo incluso con decenas de miles de militantes, mantenemos contadores precalculados que se actualizan con *hooks* en cada alta/baja/cambio de estado.

- `estado_id`, `municipio_id`, `total`, `aprobados`, `pendientes`, `rechazados`, `bloqueados`.
- Índices por `estado_id` y `municipio_id`.

### 5.7 `auditoria` (opcional pero recomendado)
- Registro inmutable de acciones sensibles: aprobaciones, rechazos, bloqueos, cambios de rol, accesos de admin. `quien`, `que`, `cuando`, `ip`.

---

## 6. Reglas de seguridad y RBAC (reglas de PocketBase)

PocketBase permite definir reglas de acceso por colección y por acción (`list`, `view`, `create`, `update`, `delete`) usando el usuario autenticado. La matriz resultante:

| Colección | admin | nacional | regional | municipal | militante |
|---|---|---|---|---|---|
| `estados` / `municipios` | CRUD | Lectura | Lectura | Lectura | Lectura |
| `users` | CRUD | — | — | — | — |
| `militantes` (listar) | Todos | Todos | Solo su estado | Solo su municipio | Solo sí mismo |
| `militantes` (ver) | Todos | Todos | Solo su estado | Solo su municipio | Solo sí mismo |
| `militantes` (crear/editar) | Todos | Aprobar (solo cambio de estado) | — | — | Solo su propia ficha |
| `militantes` (bloquear) | ✅ | ✅ | ❌ | ❌ | ❌ |
| `conexiones` | Lectura total | Lectura total* | — | — | — |
| `contadores` | Lectura | Lectura | Solo su estado | Solo su municipio | — |
| `auditoria` | Lectura | — | — | — | — |

> \* El rol `nacional` puede ver el histórico de conexiones para fines de control; `regional`/`municipal` solo ven las suyas (opcional). Este punto se confirma contigo (§14).

**Refuerzos adicionales:**
- Un **único** usuario `admin` (validado por regla + registro único en semilla).
- Doble validación: reglas en **PocketBase** (servidor) **+ guards de rutas** en el frontend (UX).
- Tokens JWT de corta duración + refresh. MFA TOTP obligatorio para `admin` y `nacional`.

---

## 7. Flujos de negocio

### 7.1 Censo (alta de militante)
1. El ciudadano **se registra** (email + contraseña + verificación por correo).
2. Completa la **planilla interactiva** multi-paso (datos personales → ubicación estado/municipio → foto **subida desde el dispositivo del registrante**).
3. Al enviar, el sistema:
   - Valida datos y **C.I. única**.
   - Genera el **ID único** (ver §8).
   - Crea el registro con `estado_registro = pendiente`.
4. El militante ve su código y su estado "en revisión".

### 7.2 Aprobación
1. `nacional` **o** `admin` revisan la bandeja de **pendientes**.
2. **Aprueba** → se dispara la **generación del carnet** + **envío por correo** (§9), `estado_registro = aprobado`.
3. **Rechaza** → `estado_registro = rechazado` con `motivo_rechazo`; el militante puede corregir y reenviar.

### 7.3 Re-censo
1. Se abre un **ciclo de re-censo** (periodicidad configurable).
2. Los militantes pasan a `recenso_pendiente = true`; deben **actualizar su planilla**.
3. Al confirmar, `version_censo` se incrementa y se **regenera el carnet** con la nueva versión.
4. Historial de versiones conservado para auditoría.

### 7.4 Carnetización y envío
- Aprobación → worker genera PDF → se guarda en PocketBase → se envía por correo al militante con el carnet adjunto + enlace de descarga y verificación.

---

## 8. Generación del ID único

**Formato propuesto:**

```
{COD_ESTADO}-{COD_MUNICIPIO}-{ALEATORIO}-MEP
   ZUL     -     021      -   742913  - MEP   →  ZUL-021-742913-MEP
```

- **`COD_ESTADO`**: código alfabético de 3 letras del estado (ej. `ZUL`, `MIR`, `CAR`).
- **`COD_MUNICIPIO`**: código numérico de 3 dígitos del municipio (catálogo oficial).
- **`ALEATORIO`**: 6 dígitos aleatorios (con opción a dígito verificador para evitar errores de tipeo).
- **Sufijo `MEP`**: identidad del partido (requerido).

**Garantía de unicidad:**
1. Campo `codigo` con **índice único** en PocketBase.
2. Generación con **reintento por colisión** (si ya existe, regenera el aleatorio).
3. El código se emite **al enviar la planilla** (el militante lo ve de inmediato).

**Verificación pública:** el carnet incluye un **QR** que apunta a `https://app.mep.org.ve/verificar/{codigo}`; cualquier persona puede validar la autenticidad del carnet.

---

## 9. Generación y envío del carnet

**Diseño del carnet (formato tarjeta ID, orientación horizontal o vertical):**

- **Anverso:** logo del partido, foto del militante, nombre completo, C.I., **código único**, estado/municipio, **QR de verificación**, franjas con morado `#63008F` y amarillo `#FFF200`.
- **Reverso:** firma, vigencia, "Militante MEP", datos de contacto.

**Técnica de generación:**
- Plantilla diseñada (HTML/CSS o SVG) → renderizada a **PDF de alta calidad** por el worker Node (`@react-pdf/renderer` o `puppeteer`).
- El PDF se sube al campo `carnet_pdf` del militante.
- Se genera también una **vista descargable** en la app.

**Envío por correo:**
- Proveedor SMTP (InterServer) o API transaccional (Resend/SendGrid/Postmark).
- Plantilla de correo con marca (morado/amarillo), mensaje de bienvenida/aprobación y **carnet adjunto en PDF**.
- Registro de envío (`carnet_enviado`, `fecha_envio`) y reintentos ante fallo.

---

## 10. Dashboard interactivo y exportación

**Vista por roles:**
- **nacional/admin:** mapa completo de Venezuela con coropletas coloreadas por cantidad de militantes.
- **regional:** su estado resaltado → lista de municipios con conteos.
- **municipal:** su municipio → detalle directo.

**Interacción (drill-down):**
1. **Estado** (mapa) → clic → se despliegan sus **municipios** con la cantidad de militantes.
2. **Municipio** → clic → **cuadro/tabla interactiva** con el detalle de los militantes (nombre, C.I., código, estado del registro, fecha).
3. **Militante** (fila) → clic → se abre su **planilla** y su **carnet** (vista/descarga).

**Tiempo real:** el dashboard se suscribe por SSE a las colecciones `militantes` y `contadores`, actualizándose sin recargar.

**Exportación:**
- **Excel:** botón que descarga un `.xlsx` (SheetJS) con los datos visibles (estado/municipio o detalle).
- **PDF/imprimir:** vista de impresión optimizada (CSS `@media print`) → `window.print()` → "Guardar como PDF".

---

## 11. Monitor de conexiones en tiempo real

- Al iniciar/cerrar sesión, el frontend (o un hook) registra una entrada en `conexiones`.
- **Panel en vivo:** tabla de sesiones activas (quién, rol, estado/municipio, IP, dispositivo, hora).
- **Ubicación ("desde dónde se conectó"):** se toma del **estado y municipio del perfil** del usuario (no por IP). Opcionalmente se registra la IP y el país para auditoría.
- **Histórico rotativo:** un **cron diario en PocketBase** elimina registros con más de **30 días**, cumpliendo el requisito de "dura un mes y luego se reinicia".

---

## 12. Infraestructura y despliegue

### InterServer (origen)
- VPS Linux (Ubuntu) con **PocketBase** como servicio `systemd`.
- **Caddy** como reverse proxy (TLS automático vía Let's Encrypt / o cert de Cloudflare).
- **Worker Node.js** (PDF + email + cron) como servicio `systemd` o contenedor Docker.
- **Backups automáticos** de `pb_data/` (SQLite + archivos) diarios (rotación 7–30 días, copia offsite).

### Cloudflare (edge)
- **Frontend PWA** en **Cloudflare Pages** (subdominio `app.mep.org.ve`), con build automático desde Git.
- **API** en subdominio `api.mep.org.ve` con **proxy de Cloudflare** hacia InterServer (oculta el origen, WAF, DDoS, TLS).
- **Worker PDF** en `pdf.mep.org.ve` (o ruta interna de la API).
- **WAF y rate limiting** configurados para el login (anti fuerza bruta).
- Opcional: **Cloudflare Access / Zero Trust** como segunda barrera para el panel admin.

### Datos iniciales (semilla)
- Catálogo completo de **estados y municipios de Venezuela** (~335 municipios).
- **GeoJSON/TopoJSON** de Venezuela con las fronteras de los 24 estados para el mapa.
- Usuario **admin único** inicial.

---

## 13. Seguridad (checklist)

- [ ] HTTPS de extremo a extremo (Cloudflare ↔ InterServer).
- [ ] Hash seguro de contraseñas (nativo de PocketBase) + políticas de fortaleza.
- [ ] JWT de corta duración + refresh + revocación.
- [ ] **MFA TOTP** para `admin` y `nacional`.
- [ ] Verificación de email en el registro.
- [ ] Rate limiting y protección anti fuerza bruta (Cloudflare WAF + PocketBase).
- [ ] RBAC aplicado en **servidor** (reglas de PocketBase) y **cliente** (guards).
- [ ] Un único admin + auditoría de acciones sensibles.
- [ ] Validación de entradas y restricción de tipos/tamaños de archivos (foto, PDF).
- [ ] Backups cifrados y plan de recuperación.
- [ ] Aislamiento del worker (solo puertos internos expuestos vía proxy).

---

## 14. PWA

- Manifiesto con nombre "Militante MEP", iconos, colores `#63008F`/`#FFF200`, tema claro/oscuro.
- **Service worker** para shell offline y caché de assets.
- **Instalable** en móvil/escritorio (Add to Home Screen).
- Notificaciones push (opcional, para avisar aprobación de carnet o apertura de re-censo).

---

## 15. Plan de fases (roadmap)

| Fase | Entregable | Estimación |
|---|---|---|
| **F0** | Confirmación de requerimientos, catálogo estados/municipios, GeoJSON, decisión de proveedor de correo. | 2–3 días |
| **F1** | Infraestructura: VPS InterServer, PocketBase + Caddy, subdominios Cloudflare, CI/CD. | 2–3 días |
| **F2** | Modelo de datos + reglas RBAC + semilla (catálogos + admin). | 3–4 días |
| **F3** | Autenticación: registro, login, verificación, MFA, roles, guards. | 3–4 días |
| **F4** | Planilla interactiva + generación de ID único + envío (estado `pendiente`). | 4–5 días |
| **F5** | Flujo de aprobación/rechazo (nacional/admin). | 2–3 días |
| **F6** | Worker PDF + generación de carnet + envío por correo. | 4–5 días |
| **F7** | Dashboard + mapa interactivo + drill-down + export Excel/PDF. | 5–7 días |
| **F8** | Panel admin (bloqueo/desbloqueo, usuarios, monitor de conexiones + histórico 1 mes). | 4–5 días |
| **F9** | Re-censo (ciclos, versiones, regeneración de carnet). | 3–4 días |
| **F10** | PWA, endurecimiento, backups, pruebas integrales, carga, despliegue final. | 4–5 días |

> **Estimación total aproximada:** 6–8 semanas (depende del tamaño del equipo y de la aprobación de alcances).

---

## 16. Entregables y datos que necesitaré de ti

1. **Acceso a InterServer** (VPS/panel, SSH) para instalar PocketBase y el worker.
2. **Dominio y cuenta de Cloudflare** (para Pages y proxy de subdominios).
3. **Credenciales SMTP** o cuenta de servicio de correo transaccional (para enviar carnets).
4. **Logo y elementos de marca** del MEP (para el carnet y la UI).
5. **Catálogo de estados/municipios** (puedo generarlo yo con fuentes públicas, confirmar).
6. **Formato exacto del carnet** deseado (campos, orientación) si ya tienen un modelo.
7. Confirmar **campos de la planilla** (¿hay más datos que los listados en §5.4?).

---

## 17. Decisiones confirmadas

1. **"Desde dónde se conectó"** → **estado y municipio del perfil** del usuario (no por IP).
2. **Aprobación** → pueden aprobar **admin y nacional**.
3. **Bloqueo/desbloqueo** → **admin y nacional**.
4. **Foto** → sí, el carnet lleva foto **subida desde el dispositivo** del registrante.
5. **PWA instalable** → sí (service worker + offline + Add to Home Screen).
6. **Escala** → **entre 1.000 y 5.000 militantes**. Con este volumen, SQLite + contadores es más que suficiente (sin optimizaciones extra).

**Pendiente por recibir:** el diseño del carnet (se subirá a la carpeta del proyecto).

---

## 18. Estructura del repositorio (propuesta)

```
mep-censo-carnet/
├─ frontend/            # React + Vite + TS + Tailwind (PWA)
│  ├─ src/
│  │  ├─ pages/         # login, planilla, dashboard, admin, carnet, conexiones
│  │  ├─ components/    # mapa, tabla, formulario, carnet, ui
│  │  ├─ lib/           # cliente PocketBase, RBAC guards, helpers
│  │  └─ theme/         # colores #63008F / #FFF200
├─ worker/              # Node.js: PDF carnet, email, cron
├─ pb/                  # PocketBase (pb_hooks, migraciones, semillas)
└─ infra/               # Caddyfile, systemd, docker, scripts de deploy
```
