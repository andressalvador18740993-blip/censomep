/**
 * Generación del carnet de militante en PDF, directamente en el navegador.
 * Se carga de forma diferida (dynamic import) para no engordar el paquete principal.
 */
import { pb } from "./pocketbase";

const PURPLE = [99 / 255, 0, 143 / 255] as const;
const PURPLE_DARK = [53 / 255, 0, 77 / 255] as const;
const PURPLE_DEEP = [36 / 255, 0, 51 / 255] as const;
const YELLOW = [1, 242 / 255, 0] as const;
const WHITE = [1, 1, 1] as const;
const GRAY = [0.72, 0.7, 0.76] as const;

const PAGE_W = 320;
const PAGE_H = 520;

export interface DatosCarnet {
  nombres?: string;
  apellidos?: string;
  cedula?: string;
  codigo?: string;
  estadoNombre?: string;
  municipioNombre?: string;
}

/** Genera el PDF del carnet y lo devuelve como Blob. */
export async function generarCarnetPDF(datos: DatosCarnet): Promise<Blob> {
  const [{ PDFDocument, StandardFonts, rgb }, qrMod] = await Promise.all([
    import("pdf-lib"),
    import("qrcode-generator")
  ]);
  const crearQR = ((qrMod as any).default ?? qrMod) as (t: number, e: string) => any;

  const doc = await PDFDocument.create();
  doc.setTitle(`Carnet MEP ${datos.codigo || ""}`.trim());
  doc.setAuthor("Movimiento Electoral del Pueblo");
  doc.setSubject("Carnet de militante");
  doc.setProducer("Militante MEP");

  const page = doc.addPage([PAGE_W, PAGE_H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // pdf-lib usa origen en la esquina inferior izquierda: helper para pensar "desde arriba".
  const Y = (y: number) => PAGE_H - y;
  const rect = (x: number, y: number, w: number, h: number, color: readonly number[]) =>
    page.drawRectangle({ x, y: Y(y + h), width: w, height: h, color: rgb(color[0], color[1], color[2]) });
  const text = (
    str: string,
    x: number,
    y: number,
    opts: { size?: number; bold?: boolean; color?: readonly number[]; maxWidth?: number; center?: boolean } = {}
  ) => {
    const size = opts.size ?? 10;
    const f = opts.bold ? bold : font;
    const c = opts.color ?? WHITE;
    const options: Parameters<typeof page.drawText>[1] = {
      x,
      y: Y(y) - size,
      size,
      font: f,
      color: rgb(c[0], c[1], c[2])
    };
    if (opts.maxWidth) {
      options.maxWidth = opts.maxWidth;
      options.lineHeight = size * 1.2;
    }
    if (opts.center) {
      const width = f.widthOfTextAtSize(str, size);
      options.x = x - width / 2;
    }
    page.drawText(str, options);
  };

  const mayus = (s?: string) => (s || "").toUpperCase();

  // ---- Fondo ----
  rect(0, 0, PAGE_W, PAGE_H, PURPLE);
  rect(0, PAGE_H - 130, PAGE_W, 130, PURPLE_DARK);
  rect(-40, PAGE_H - 176, 220, 220, PURPLE_DEEP);

  // ---- Cabecera amarilla ----
  rect(0, 0, PAGE_W, 104, YELLOW);
  text("MEP", PAGE_W / 2, 20, { size: 40, bold: true, color: PURPLE, center: true });
  text("MOVIMIENTO ELECTORAL DEL PUEBLO", PAGE_W / 2, 66, { size: 8, bold: true, color: PURPLE, center: true });
  text("CARNET DE MILITANTE", PAGE_W / 2, 82, { size: 7.5, color: PURPLE_DARK, center: true });

  // ---- Datos ----
  const L = 26;
  const R = PAGE_W - 26;
  let y = 126;

  text("NOMBRE COMPLETO", L, y, { size: 7, bold: true, color: GRAY });
  text(`${mayus(datos.nombres)} ${mayus(datos.apellidos)}`.trim() || "—", L, y + 11, {
    size: 15,
    bold: true,
    maxWidth: R - L
  });
  y += 48;

  text("CÉDULA DE IDENTIDAD", L, y, { size: 7, bold: true, color: GRAY });
  text(datos.cedula || "—", L, y + 11, { size: 12 });
  y += 36;

  text("SECCIONAL", L, y, { size: 7, bold: true, color: GRAY });
  text(datos.estadoNombre || "—", L, y + 11, { size: 12, maxWidth: 150 });
  text("MUNICIPIO", 180, y, { size: 7, bold: true, color: GRAY });
  text(datos.municipioNombre || "—", 180, y + 11, { size: 12, maxWidth: 120 });
  y += 42;

  // ---- Número de militante ----
  const codigo = datos.codigo || "—";
  rect(L, y, R - L, 58, YELLOW);
  text("N° DE MILITANTE", L + 12, y + 9, { size: 7, bold: true, color: PURPLE_DARK });
  text(codigo, L + 12, y + 21, { size: 17, bold: true, color: PURPLE });
  y += 78;

  // ---- QR de verificación ----
  const qrSize = 96;
  const qrX = L;
  const qrY = y;
  rect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, WHITE);

  try {
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://censomep.andresdig.org"}/verificar/${codigo}`;
    const qr = crearQR(0, "M");
    qr.addData(url);
    qr.make();
    const count = qr.getModuleCount();
    const cell = qrSize / (count + 2);
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          page.drawRectangle({
            x: qrX + (c + 1) * cell,
            y: Y(qrY + (r + 1) * cell) - cell,
            width: cell + 0.15,
            height: cell + 0.15,
            color: rgb(PURPLE_DEEP[0], PURPLE_DEEP[1], PURPLE_DEEP[2])
          });
        }
      }
    }
  } catch {
    text("Verificación digital", qrX, qrY + 20, { size: 8, color: PURPLE });
  }

  text("VERIFICACIÓN DIGITAL", qrX + qrSize + 18, qrY + 12, { size: 7, bold: true, color: GRAY });
  text("Escanea el código QR", qrX + qrSize + 18, qrY + 25, { size: 10, bold: true });
  text("para validar este carnet", qrX + qrSize + 18, qrY + 39, { size: 10, bold: true });
  text(
    `Emitido: ${new Date().toLocaleDateString("es-VE")}`,
    qrX + qrSize + 18,
    qrY + 62,
    { size: 8, color: GRAY }
  );

  // ---- Pie ----
  rect(0, PAGE_H - 34, PAGE_W, 34, PURPLE_DARK);
  rect(0, PAGE_H - 34, PAGE_W, 3, YELLOW);
  text("LIBERACIÓN NACIONAL Y DEMOCRACIA SOCIALISTA", PAGE_W / 2, PAGE_H - 24, {
    size: 6.5,
    bold: true,
    color: YELLOW,
    center: true
  });
  text("PARTIDO MEP · VENEZUELA", PAGE_W / 2, PAGE_H - 14, { size: 5.5, color: GRAY, center: true });

  const bytes = await doc.save();
  return new Blob([bytes] as unknown as BlobPart[], { type: "application/pdf" });
}

/** Genera el carnet y lo guarda permanentemente en la ficha del militante. */
export async function generarYGuardarCarnet(
  militanteId: string,
  datos: DatosCarnet
): Promise<{ blob: Blob; codigo: string }> {
  const blob = await generarCarnetPDF(datos);
  const codigo = datos.codigo || "mep";
  const file = new File([blob], `carnet-${codigo}.pdf`, { type: "application/pdf" });
  const fd = new FormData();
  fd.append("carnet_pdf", file);
  await pb.collection("militantes").update(militanteId, fd);
  return { blob, codigo };
}

/** Abre/descarga el PDF en una pestaña nueva. */
export function abrirPDF(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre.endsWith(".pdf") ? nombre : `${nombre}.pdf`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
