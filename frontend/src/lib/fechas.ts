// Utilidades de fechas para la ventana de aprobación.

const DIA_MS = 86_400_000;

/** Días transcurridos desde la fecha dada (o null si no hay fecha válida). */
export function diasDesde(fecha?: string | null): number | null {
  if (!fecha) return null;
  const t = new Date(fecha).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / DIA_MS);
}

/** Indica si una fecha supera el límite de días (por defecto 30). */
export function esExpirado(fecha?: string | null, diasMax = 30): boolean {
  const d = diasDesde(fecha);
  return d !== null && d > diasMax;
}

/** Texto legible: "Pendiente hace 5 días" / "Pendiente hoy". */
export function textoPendiente(fecha?: string | null): string {
  const d = diasDesde(fecha);
  if (d === null) return "Pendiente";
  if (d <= 0) return "Pendiente hoy";
  return `Pendiente hace ${d} ${d === 1 ? "día" : "días"}`;
}
