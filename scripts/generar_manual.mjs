// Genera el manual de uso en tres formatos (Markdown, Word y PDF) desde una única fuente.
// Uso: node scripts/generar_manual.mjs
import { createRequire } from "module";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = join(__dirname, "..", "docs");

const docx = require("docx");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType } = docx;

const pdfMake = require("pdfmake");
const pdfFonts = require("pdfmake/build/vfs_fonts.js");
const PURPLE = "63008F";
const PURPLE_DARK = "4A006B";
const YELLOW = "FFF200";

/* ============================ CONTENIDO (fuente única) ============================ */
const P = (x) => ({ t: "p", x });
const H1 = (x) => ({ t: "h1", x });
const H2 = (x) => ({ t: "h2", x });
const H3 = (x) => ({ t: "h3", x });
const UL = (items) => ({ t: "ul", items });
const OL = (items) => ({ t: "ol", items });
const HR = () => ({ t: "hr" });
const T = (headers, rows, widths) => ({ t: "table", headers, rows, widths });

const DOC = [
  H1("MANUAL DE USO — MILITANTE MEP"),
  P("Sistema de Censo, Re-censo y Carnetización de Militantes del Partido Movimiento Electoral del Pueblo"),
  T(
    ["Dato", "Valor"],
    [
      ["Plataforma", "Aplicación Web Progresiva (PWA)"],
      ["URL", "https://militante-mep.pages.dev"],
      ["Backend", "PocketBase (autohospedado)"],
      ["Colores institucionales", "Morado #63008F · Amarillo #FFF200"]
    ],
    ["25%", "75%"]
  ),
  HR(),

  H2("1. Características de la aplicación"),
  H3("1.1 General"),
  UL([
    "**PWA**: instalable en móvil y escritorio, funciona en el navegador.",
    "**Acceso seguro** con correo y contraseña, por roles.",
    "**Datos en tiempo real** (suscripciones automáticas).",
    "**Diseño responsivo** con la identidad visual del partido."
  ]),
  H3("1.2 Módulos"),
  T(
    ["Módulo", "Descripción"],
    [
      ["Registro de militante", "Inscripción pública con planilla digital en 3 pasos."],
      ["Planilla interactiva", "Replica la planilla oficial MEP (datos personales, localización, declaración)."],
      ["Código único", "Formato ESTADO-MUNICIPIO-ALEATORIO-MEP (ej. CAR-VAL-123456-MEP)."],
      ["Carnet digital", "PDF con logo, datos, código y QR; se genera al aprobar y se guarda en la ficha."],
      ["Re-censo", "El militante actualiza su planilla (nuevas versiones)."],
      ["Dashboard", "Mapa de Venezuela → estado → municipio → militante (drill-down)."],
      ["Reportes", "Exportación a Excel e impresión en PDF (blanco y negro)."],
      ["Panel de administración", "Aprobaciones, bloqueo/desbloqueo, gestión de usuarios."],
      ["Monitor de conexiones", "Sesiones en tiempo real con histórico rotativo de 30 días."],
      ["Estructura del partido", "Cargos directivos CPR (regional) y CPM (municipal) con aprobación."]
    ],
    ["30%", "70%"]
  ),
  H3("1.3 Roles y permisos"),
  T(
    ["Acción", "admin", "nacional", "regional", "municipal", "militante"],
    [
      ["Ver dashboard global", "Sí", "Sí", "Su estado", "Su municipio", "—"],
      ["Registrar militantes", "Sí", "Sí", "Sí", "Sí", "—"],
      ["Llenar planilla propia", "—", "—", "—", "—", "Sí"],
      ["Aprobar / rechazar militantes", "Sí", "Sí", "—", "—", "—"],
      ["Bloquear / desbloquear", "Sí", "Sí", "—", "—", "—"],
      ["Gestionar usuarios staff", "Sí", "—", "—", "—", "—"],
      ["Cargar estructura CPR/CPM", "Sí", "Sí", "Sí", "Sí", "—"],
      ["Aprobar estructura", "Sí", "Sí", "—", "—", "—"],
      ["Monitor de conexiones", "Sí", "Sí", "—", "—", "—"],
      ["Descargar / imprimir carnet", "—", "—", "—", "—", "Sí (1 vez)"]
    ],
    ["34%", "14%", "14%", "14%", "14%", "10%"]
  ),

  H2("2. Manual de uso (por rol)"),
  H3("2.1 Militante"),
  OL([
    "**Registro**: entra a la opción de registro y crea tu cuenta (nombres, apellidos, correo y contraseña).",
    "**Planilla (3 pasos)**: Paso 1 — Datos personales · Paso 2 — Localización (Seccional → Municipio → Parroquia) · Paso 3 — Declaración de militancia.",
    "**Estado de la inscripción**: queda en pendiente hasta que admin/nacional la apruebe.",
    "**Carnet**: una vez aprobado, entra a **Mi carnet** y descarga/imprime el PDF una sola vez.",
    "**Re-censo**: usa **Actualizar mi planilla** para registrar cambios (genera una nueva versión)."
  ]),
  H3("2.2 Regional / Municipal"),
  OL([
    "**Registrar militantes**: Panel → pestaña **Registrar militante** (planilla completa).",
    "**Dashboard**: verás solo el alcance de tu **estado** (regional) o **municipio** (municipal).",
    "**Estructura**: carga los cargos de tu **CPR** (regional) o **CPM** (municipal). Quedarán pendientes de aprobación."
  ]),
  H3("2.3 Admin / Nacional"),
  OL([
    "**Aprobar militantes**: Panel → **Aprobaciones** → **Aprobar** (genera el carnet) o **Rechazar**.",
    "**Bloquear / desbloquear**: Panel → **Militantes**.",
    "**Estructura**: aprueba o rechaza los cargos en **Estructura → Pendientes de aprobación**.",
    "**Usuarios staff** (solo admin): Panel → **Usuarios**.",
    "**Conexiones**: monitor de sesiones en tiempo real."
  ]),

  H2("3. Guía paso a paso"),
  H3("3.1 Inscribir un militante"),
  OL([
    "El militante se registra desde la opción de registro.",
    "Completa la planilla (3 pasos) y la envía → estado pendiente.",
    "(Alternativa) Un staff lo registra desde **Panel → Registrar militante**."
  ]),
  H3("3.2 Aprobar y generar el carnet"),
  OL([
    "admin/nacional → **Panel → Aprobaciones**.",
    "Pulsa **Aprobar** → se genera automáticamente el carnet PDF (con logo, datos y QR) y queda guardado en la ficha.",
    "Para rechazar: **Rechazar** e indica el motivo."
  ]),
  H3("3.3 Descargar el carnet (militante)"),
  OL([
    "El militante entra a **Mi carnet**.",
    "Si está aprobado, aparece el botón **Descargar / Imprimir carnet (PDF)**.",
    "Solo puede descargarlo una vez. Para reimpresión, admin/nacional usa Panel → Militantes → **Reimprimir carnet**."
  ]),
  H3("3.4 Cargar estructura del partido (CPR/CPM)"),
  OL([
    "Entra a **Estructura** (menú superior).",
    "Elige la **seccional** (estado) y, para CPM, el **municipio**.",
    "**Agregar cargo** → selecciona el cargo, nombre, cédula, teléfono y correo.",
    "Regional/municipal: queda **pendiente**. admin/nacional: aprueba en **Pendientes de aprobación**."
  ]),
  H3("3.5 Exportar reportes"),
  UL([
    "**Dashboard**: botones **Exportar Excel** e **Imprimir PDF**.",
    "**Estructura**: botones **Exportar Excel** e **Imprimir PDF**."
  ]),

  H2("4. Notas importantes"),
  UL([
    "El **carnet se genera en el navegador** (no depende de un servidor externo).",
    "El **QR del carnet** enlaza a una página de verificación (subdominio pendiente de activar).",
    "El **historial de conexiones** se rota automáticamente cada 30 días.",
    "El **login de la app** usa el correo; el **panel de PocketBase** (/_/) usa el superusuario."
  ])
];

/* ============================ Helpers ============================ */
function parseInline(text) {
  return String(text).split("**").map((p, i) => ({ text: p, bold: i % 2 === 1 }));
}

/* ============================ 1) MARKDOWN ============================ */
function renderMarkdown() {
  const out = [];
  for (const b of DOC) {
    if (b.t === "h1") out.push(`# ${b.x}`, "");
    else if (b.t === "h2") out.push(`## ${b.x}`, "");
    else if (b.t === "h3") out.push(`### ${b.x}`, "");
    else if (b.t === "p") out.push(b.x, "");
    else if (b.t === "ul") { b.items.forEach((i) => out.push(`- ${i}`)); out.push(""); }
    else if (b.t === "ol") { b.items.forEach((i, n) => out.push(`${n + 1}. ${i}`)); out.push(""); }
    else if (b.t === "hr") out.push("---", "");
    else if (b.t === "table") {
      out.push("| " + b.headers.join(" | ") + " |");
      out.push("|" + b.headers.map(() => "---").join("|") + "|");
      b.rows.forEach((r) => out.push("| " + r.join(" | ") + " |"));
      out.push("");
    }
  }
  return out.join("\n");
}

/* ============================ 2) DOCX ============================ */
async function renderDocx() {
  const children = [];
  for (const b of DOC) {
    if (b.t === "h1") children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 120, after: 160 }, children: [new TextRun({ text: b.x, bold: true, color: PURPLE })] }));
    else if (b.t === "h2") children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 }, children: [new TextRun({ text: b.x, bold: true, color: PURPLE })] }));
    else if (b.t === "h3") children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: b.x, bold: true, color: PURPLE_DARK })] }));
    else if (b.t === "p") children.push(new Paragraph({ spacing: { after: 120 }, children: parseInline(b.x).map((s) => new TextRun({ text: s.text, bold: s.bold })) }));
    else if (b.t === "ul") b.items.forEach((i) => children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: parseInline(i).map((s) => new TextRun({ text: s.text, bold: s.bold })) })));
    else if (b.t === "ol") b.items.forEach((i, n) => children.push(new Paragraph({ spacing: { after: 60 }, indent: { left: 360 }, children: [new TextRun({ text: `${n + 1}.  `, bold: true }), ...parseInline(i).map((s) => new TextRun({ text: s.text, bold: s.bold }))] })));
    else if (b.t === "hr") children.push(new Paragraph({ spacing: { before: 120, after: 120 }, border: { bottom: { color: "999999", space: 1, style: "single", size: 6 } }, children: [] }));
    else if (b.t === "table") children.push(docxTable(b));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ properties: {}, children }]
  });
  const buffer = await Packer.toBuffer(doc);
  writeFileSync(join(DOCS, "Manual_de_Uso.docx"), buffer);
}

function docxTable(b) {
  const widths = b.widths.map((w) => ({ size: parseInt(w, 10), type: WidthType.PERCENTAGE }));
  const headerRow = new TableRow({
    tableHeader: true,
    children: b.headers.map((h, i) => new TableCell({
      width: widths[i],
      shading: { fill: PURPLE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: YELLOW })] })]
    }))
  });
  const bodyRows = b.rows.map((r) => new TableRow({
    children: r.map((cell, i) => new TableCell({
      width: widths[i],
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: parseInline(cell).map((s) => new TextRun({ text: s.text, bold: s.bold })) })]
    }))
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows]
  });
}

/* ============================ 3) PDF (pdfmake) ============================ */
async function renderPdf() {
  const content = [];
  for (const b of DOC) {
    if (b.t === "h1") content.push({ text: b.x, style: "h1", margin: [0, 0, 0, 4] });
    else if (b.t === "h2") content.push({ text: b.x, style: "h2", margin: [0, 18, 0, 6] });
    else if (b.t === "h3") content.push({ text: b.x, style: "h3", margin: [0, 12, 0, 4] });
    else if (b.t === "p") content.push({ text: parseInline(b.x), style: "p", margin: [0, 0, 0, 6] });
    else if (b.t === "ul") content.push({ ul: b.items.map((i) => parseInline(i)), style: "p", margin: [0, 0, 0, 6] });
    else if (b.t === "ol") content.push({ ol: b.items.map((i) => parseInline(i)), style: "p", margin: [0, 0, 0, 6] });
    else if (b.t === "hr") content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#999999" }], margin: [0, 10, 0, 10] });
    else if (b.t === "table") content.push(pdfTable(b));
  }

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [50, 50, 50, 55],
    footer: (currentPage, pageCount) => ({ text: `Militante MEP · Manual de uso — Página ${currentPage} de ${pageCount}`, alignment: "center", fontSize: 8, color: "#888888", margin: [0, 12, 0, 0] }),
    content,
    styles: {
      h1: { fontSize: 22, bold: true, color: PURPLE, alignment: "left" },
      h2: { fontSize: 15, bold: true, color: PURPLE },
      h3: { fontSize: 12, bold: true, color: PURPLE_DARK },
      p: { fontSize: 10, color: "#333333", lineHeight: 1.35 }
    },
    defaultStyle: { fontSize: 10, color: "#333333" }
  };

  // Registrar fuentes y políticas (evita accesos externos)
  pdfMake.setUrlAccessPolicy(() => false);
  pdfMake.setLocalAccessPolicy(() => false);
  for (const [name, b64] of Object.entries(pdfFonts)) {
    pdfMake.sharedVirtualfs.writeFileSync(name, b64, "base64");
  }
  pdfMake.setFonts({
    Roboto: {
      normal: "Roboto-Regular.ttf",
      bold: "Roboto-Medium.ttf",
      italics: "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf"
    }
  });

  const pdfDoc = pdfMake.createPdf(docDefinition);
  await pdfDoc.write(join(DOCS, "Manual_de_Uso.pdf"));
}
function pdfTable(b) {
  const widths = b.widths.map((w) => parseInt(w, 10));
  const body = [
    b.headers.map((h) => ({ text: h, bold: true, color: "#FFFFFF" })),
    ...b.rows.map((r) => r.map((cell) => ({ text: parseInline(cell) })))
  ];
  return {
    table: { headerRows: 1, widths, body },
    layout: {
      fillColor: (i) => (i === 0 ? `#${PURPLE}` : null),
      hLineColor: () => "#cccccc",
      vLineColor: () => "#cccccc",
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      paddingTop: () => 5,
      paddingBottom: () => 5,
      paddingLeft: () => 6,
      paddingRight: () => 6
    },
    margin: [0, 0, 0, 10]
  };
}

/* ============================ Main ============================ */
mkdirSync(DOCS, { recursive: true });

writeFileSync(join(DOCS, "MANUAL_DE_USO.md"), renderMarkdown());
console.log("✔ Markdown: docs/MANUAL_DE_USO.md");

await renderDocx();
console.log("✔ Word: docs/Manual_de_Uso.docx");

await renderPdf();
console.log("✔ PDF: docs/Manual_de_Uso.pdf");

console.log("\n✅ Documento generado en los tres formatos.");
