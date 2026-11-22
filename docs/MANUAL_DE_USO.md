# MANUAL DE USO — MILITANTE MEP

Sistema de Censo, Re-censo y Carnetización de Militantes del Partido Movimiento Electoral del Pueblo

| Dato | Valor |
|---|---|
| Plataforma | Aplicación Web Progresiva (PWA) |
| URL | https://militante-mep.pages.dev |
| Backend | PocketBase (autohospedado) |
| Colores institucionales | Morado #63008F · Amarillo #FFF200 |

---

## 1. Características de la aplicación

### 1.1 General

- **PWA**: instalable en móvil y escritorio, funciona en el navegador.
- **Acceso seguro** con correo y contraseña, por roles.
- **Datos en tiempo real** (suscripciones automáticas).
- **Diseño responsivo** con la identidad visual del partido.

### 1.2 Módulos

| Módulo | Descripción |
|---|---|
| Registro de militante | Inscripción pública con planilla digital en 3 pasos. |
| Planilla interactiva | Replica la planilla oficial MEP (datos personales, localización, declaración). |
| Código único | Formato ESTADO-MUNICIPIO-ALEATORIO-MEP (ej. CAR-VAL-123456-MEP). |
| Carnet digital | PDF con logo, datos, código y QR; se genera al aprobar y se guarda en la ficha. |
| Re-censo | El militante actualiza su planilla (nuevas versiones). |
| Dashboard | Mapa de Venezuela → estado → municipio → militante (drill-down). |
| Reportes | Exportación a Excel e impresión en PDF (blanco y negro). |
| Panel de administración | Aprobaciones, bloqueo/desbloqueo, gestión de usuarios. |
| Monitor de conexiones | Sesiones en tiempo real con histórico rotativo de 30 días. |
| Estructura del partido | Cargos directivos CPR (regional) y CPM (municipal) con aprobación. |

### 1.3 Roles y permisos

| Acción | admin | nacional | regional | municipal | militante |
|---|---|---|---|---|---|
| Ver dashboard global | Sí | Sí | Su estado | Su municipio | — |
| Registrar militantes | Sí | Sí | Sí | Sí | — |
| Llenar planilla propia | — | — | — | — | Sí |
| Aprobar / rechazar militantes | Sí | Sí | — | — | — |
| Bloquear / desbloquear | Sí | Sí | — | — | — |
| Gestionar usuarios staff | Sí | — | — | — | — |
| Cargar estructura CPR/CPM | Sí | Sí | Sí | Sí | — |
| Aprobar estructura | Sí | Sí | — | — | — |
| Monitor de conexiones | Sí | Sí | — | — | — |
| Descargar / imprimir carnet | — | — | — | — | Sí (1 vez) |

## 2. Manual de uso (por rol)

### 2.1 Militante

1. **Registro**: entra a la opción de registro y crea tu cuenta (nombres, apellidos, correo y contraseña).
2. **Planilla (3 pasos)**: Paso 1 — Datos personales · Paso 2 — Localización (Seccional → Municipio → Parroquia) · Paso 3 — Declaración de militancia.
3. **Estado de la inscripción**: queda en pendiente hasta que admin/nacional la apruebe.
4. **Carnet**: una vez aprobado, entra a **Mi carnet** y descarga/imprime el PDF una sola vez.
5. **Re-censo**: usa **Actualizar mi planilla** para registrar cambios (genera una nueva versión).

### 2.2 Regional / Municipal

1. **Registrar militantes**: Panel → pestaña **Registrar militante** (planilla completa).
2. **Dashboard**: verás solo el alcance de tu **estado** (regional) o **municipio** (municipal).
3. **Estructura**: carga los cargos de tu **CPR** (regional) o **CPM** (municipal). Quedarán pendientes de aprobación.

### 2.3 Admin / Nacional

1. **Aprobar militantes**: Panel → **Aprobaciones** → **Aprobar** (genera el carnet) o **Rechazar**.
2. **Bloquear / desbloquear**: Panel → **Militantes**.
3. **Estructura**: aprueba o rechaza los cargos en **Estructura → Pendientes de aprobación**.
4. **Usuarios staff** (solo admin): Panel → **Usuarios**.
5. **Conexiones**: monitor de sesiones en tiempo real.

## 3. Guía paso a paso

### 3.1 Inscribir un militante

1. El militante se registra desde la opción de registro.
2. Completa la planilla (3 pasos) y la envía → estado pendiente.
3. (Alternativa) Un staff lo registra desde **Panel → Registrar militante**.

### 3.2 Aprobar y generar el carnet

1. admin/nacional → **Panel → Aprobaciones**.
2. Pulsa **Aprobar** → se genera automáticamente el carnet PDF (con logo, datos y QR) y queda guardado en la ficha.
3. Para rechazar: **Rechazar** e indica el motivo.

### 3.3 Descargar el carnet (militante)

1. El militante entra a **Mi carnet**.
2. Si está aprobado, aparece el botón **Descargar / Imprimir carnet (PDF)**.
3. Solo puede descargarlo una vez. Para reimpresión, admin/nacional usa Panel → Militantes → **Reimprimir carnet**.

### 3.4 Cargar estructura del partido (CPR/CPM)

1. Entra a **Estructura** (menú superior).
2. Elige la **seccional** (estado) y, para CPM, el **municipio**.
3. **Agregar cargo** → selecciona el cargo, nombre, cédula, teléfono y correo.
4. Regional/municipal: queda **pendiente**. admin/nacional: aprueba en **Pendientes de aprobación**.

### 3.5 Exportar reportes

- **Dashboard**: botones **Exportar Excel** e **Imprimir PDF**.
- **Estructura**: botones **Exportar Excel** e **Imprimir PDF**.

## 4. Notas importantes

- El **carnet se genera en el navegador** (no depende de un servidor externo).
- El **QR del carnet** enlaza a una página de verificación (subdominio pendiente de activar).
- El **historial de conexiones** se rota automáticamente cada 30 días.
- El **login de la app** usa el correo; el **panel de PocketBase** (/_/) usa el superusuario.
