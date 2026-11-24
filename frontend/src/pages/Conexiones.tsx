import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { pb } from "../lib/pocketbase";
import type { Conexion } from "../lib/types";

export default function Conexiones() {
  const [items, setItems] = useState<Conexion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    pb.collection("conexiones")
      .getFullList<Conexion>({ sort: "-created", perPage: 500 })
      .then((r) => {
        if (!cancelled) {
          setItems(r);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    // Suscripción en tiempo real
    let unsub: (() => void) | null = null;
    pb.collection("conexiones")
      .subscribe("*", (e) => {
        if (e.action === "create") {
          setItems((prev) => [e.record as unknown as Conexion, ...prev].slice(0, 500));
        } else if (e.action === "delete") {
          setItems((prev) => prev.filter((c) => c.id !== e.record.id));
        }
      })
      .then((fn) => {
        if (!cancelled) unsub = fn;
      });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  // Última actividad por email -> sesión activa si el último evento es "login"
  const activos = useMemo(() => {
    const ultimo = new Map<string, Conexion>();
    for (const c of items) {
      if (!ultimo.has(c.email)) ultimo.set(c.email, c);
    }
    return [...ultimo.values()].filter((c) => c.evento !== "logout").length;
  }, [items]);

  const badge = (evento: string) => {
    if (evento === "login")
      return <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">login</span>;
    if (evento === "logout")
      return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">logout</span>;
    return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">activa</span>;
  };

  return (
    <div>
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6 pb-safe sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-mep-purple">Monitor de conexiones</h1>
          <div className="flex gap-4 text-sm">
            <span className="rounded bg-mep-purple/10 px-3 py-1 text-mep-purple">
              {items.length} registros
            </span>
            <span className="rounded bg-green-100 px-3 py-1 text-green-700">
              {activos} sesiones activas
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-gray-500">Aún no hay conexiones registradas.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-gray-200 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-mep-purple text-mep-yellow">
                  <tr>
                    <th className="px-3 py-2">Fecha / hora</th>
                    <th className="px-3 py-2">Usuario</th>
                    <th className="px-3 py-2">Rol</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Municipio</th>
                    <th className="px-3 py-2">Dispositivo</th>
                    <th className="px-3 py-2">Evento</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(c.created).toLocaleString("es-VE")}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{c.nombre}</div>
                        <div className="text-xs text-gray-500">{c.email}</div>
                      </td>
                      <td className="px-3 py-2 capitalize">{c.rol}</td>
                      <td className="px-3 py-2">{c.estado || "—"}</td>
                      <td className="px-3 py-2">{c.municipio || "—"}</td>
                      <td className="px-3 py-2">{c.dispositivo || "—"}</td>
                      <td className="px-3 py-2">{badge(c.evento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Móvil: tarjetas */}
            <div className="space-y-3 md:hidden">
              {items.map((c) => (
                <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-800">{c.nombre}</div>
                      <div className="truncate text-xs text-gray-500">{c.email}</div>
                    </div>
                    {badge(c.evento)}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{new Date(c.created).toLocaleString("es-VE")}</div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                    <span className="capitalize">Rol: {c.rol}</span>
                    <span>Estado: {c.estado || "—"}</span>
                    <span>Municipio: {c.municipio || "—"}</span>
                    <span>Equipo: {c.dispositivo || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
