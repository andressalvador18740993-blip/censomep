// Generación del carnet PDF (tarjeta ID genérica con logo, foto, código, QR y colores institucionales).
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { COLORS } from "./theme.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Si existe un PNG del logo se usa; de lo contrario se dibuja la marca de texto.
const LOGO_PNG = join(__dirname, "..", "assets", "logo.png");

/**
 * Genera el carnet y devuelve un Buffer con el PDF.
 * @param {object} m - registro del militante (con estado/municipio expandidos o *_nombre).
 */
export async function generarCarnetPDF(m) {
  const estadoNombre = m.estado_nombre || m.expand?.estado?.nombre || "";
  const municipioNombre = m.municipio_nombre || m.expand?.municipio?.nombre || "";

  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: [300, 480], margin: 0 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { purple, purpleDark, yellow, yellowDark } = COLORS;

    // Fondo morado
    doc.rect(0, 0, 300, 480).fill(purple);

    // Banda superior amarilla con logo / marca
    doc.rect(0, 0, 300, 100).fill(yellow);
    if (existsSync(LOGO_PNG)) {
      doc.image(LOGO_PNG, 55, 14, { width: 190 });
    } else {
      doc.fillColor(purpleDark).font("Helvetica-Bold").fontSize(26).text("MEP", 0, 20, { width: 300, align: "center" });
      doc.fillColor(purple).fontSize(11).text("Movimiento Electoral del Pueblo", 0, 50, { width: 300, align: "center" });
      doc.fillColor(purpleDark).fontSize(9).text("Militante", 0, 70, { width: 300, align: "center" });
    }

    // Foto (marco; TODO: insertar la foto real del militante)
    doc.rect(95, 118, 110, 130).fillAndStroke("#ffffff", purpleDark).lineWidth(2);
    doc.fillColor(purple).font("Helvetica").fontSize(10).text("FOTO", 95, 175, { width: 110, align: "center" });

    // Datos
    let y = 262;
    doc.fillColor("#ffffff");
    doc.font("Helvetica-Bold").fontSize(8).text("NOMBRE", 30, y); y += 13;
    doc.font("Helvetica").fontSize(12).text(`${m.nombres || ""} ${m.apellidos || ""}`, 30, y, { width: 240 }); y += 26;

    doc.font("Helvetica-Bold").fontSize(8).text("CÉDULA", 30, y); y += 13;
    doc.font("Helvetica").fontSize(12).text(m.cedula || "", 30, y); y += 24;

    doc.font("Helvetica-Bold").fontSize(8).text("SECCIONAL / MUNICIPIO", 30, y); y += 13;
    doc.font("Helvetica").fontSize(11).text(`${estadoNombre}${municipioNombre ? " / " + municipioNombre : ""}`, 30, y, { width: 240 }); y += 24;

    // Código (N° de militante)
    doc.font("Helvetica-Bold").fontSize(9).text("N° DE MILITANTE", 30, y); y += 14;
    doc.fillColor(yellow).font("Helvetica-Bold").fontSize(14).text(m.codigo || "—", 30, y);
    doc.fillColor("#ffffff");

    // QR de verificación
    const urlVerificacion = `${process.env.PUBLIC_URL || "https://app.mep.org.ve"}/verificar/${m.codigo}`;
    const qrData = await QRCode.toDataURL(urlVerificacion, { width: 130, margin: 0, color: { dark: purpleDark, light: yellow } });
    doc.image(qrData, 185, 368, { width: 92, height: 92 });

    // Eslogan
    doc.rect(0, 452, 300, 28).fill(yellowDark);
    doc.fillColor(purpleDark).font("Helvetica-Bold").fontSize(7).text(
      "LIBERACIÓN NACIONAL Y DEMOCRACIA SOCIALISTA",
      0, 462, { width: 300, align: "center" }
    );

    doc.end();
  });
}
