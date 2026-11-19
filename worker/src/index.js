// Servidor del worker: generación de carnet + cron (sin envío de correo).
import express from "express";
import cors from "cors";
import "dotenv/config";
import { ensureAuth, pb, generarCodigo } from "./pb.js";
import { generarCarnetPDF } from "./carnet.js";
import { iniciarCron } from "./cron.js";

const app = express();
app.use(cors());
app.use(express.json());

// Protección simple del endpoint (opcional: define WORKER_API_KEY en el .env)
function autorizado(req) {
  if (!process.env.WORKER_API_KEY) return true;
  return req.headers["x-api-key"] === process.env.WORKER_API_KEY;
}

app.get("/health", (_req, res) => res.json({ ok: true }));

/**
 * Aprueba un militante: reutiliza/genera el código, genera el carnet PDF
 * y lo guarda en el campo `carnet_pdf` (queda disponible para siempre).
 * POST /aprobar  { militanteId, aprobadoPor? }
 */
app.post("/aprobar", async (req, res) => {
  if (!autorizado(req)) return res.status(401).json({ ok: false, error: "No autorizado" });

  try {
    await ensureAuth();
    const { militanteId, aprobadoPor } = req.body;
    const m = await pb.collection("militantes").getOne(militanteId, { expand: "estado,municipio" });

    const estadoCodigo = m.expand?.estado?.codigo || "MEP";
    const municipioCodigo = m.expand?.municipio?.codigo || "000";

    // Reutilizar el código si ya fue generado al enviar la planilla
    const codigo = m.codigo || (await generarCodigo(estadoCodigo, municipioCodigo));
    const pdf = await generarCarnetPDF({ ...m, codigo });

    await pb.collection("militantes").update(militanteId, {
      codigo,
      estado_registro: "aprobado",
      carnet_generado: true,
      fecha_aprobacion: new Date().toISOString(),
      aprobado_por: aprobadoPor || null,
      motivo_rechazo: "",
      carnet_pdf: new File([pdf], `carnet-${codigo}.pdf`, { type: "application/pdf" })
    });

    res.json({ ok: true, codigo });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

iniciarCron();

const PORT = Number(process.env.WORKER_PORT || 8787);
app.listen(PORT, () => console.log(`Worker escuchando en :${PORT}`));
