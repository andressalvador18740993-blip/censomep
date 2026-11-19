// Tareas programadas (cron).
import cron from "node-cron";
import { ensureAuth, pb } from "./pb.js";

/**
 * Purga de conexiones con más de 30 días (histórico rotativo mensual).
 * Se ejecuta diariamente a las 03:00.
 */
export function iniciarCron() {
  cron.schedule("0 3 * * *", async () => {
    try {
      await ensureAuth();
      const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const antiguas = await pb.collection("conexiones").getFullList({
        filter: `created < "${hace30}"`,
        fields: "id"
      });
      for (const c of antiguas) {
        await pb.collection("conexiones").delete(c.id);
      }
      console.log(`[cron] purgadas ${antiguas.length} conexiones antiguas`);
    } catch (e) {
      console.error("[cron] error al purgar conexiones:", e.message);
    }
  });
}
