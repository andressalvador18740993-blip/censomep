import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Header from "../components/Header";
import MapaVenezuela from "../components/MapaVenezuela";
import { getRole, pb } from "../lib/pocketbase";
import type { Estado, Militante, Municipio } from "../lib/types";

type Vista = "estados" | "municipios" | "militantes";

export default function Dashboard() {
  const role = getRole();
  const me = pb.authStore.model as Record<string, any> | null;
  const myEstadoId = me?.estado ?? null;
  const myMunicipioId = me?.municipio ?? null;

  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [militantes, setMilitantes] = useState<Militante[]>([]);
  const [vista, setVista] = useState<Vista>("estados");
  const [selEstado, setSelEstado] = useState<string | null>(null);
  const [selMunicipio, setSelMunicipio] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Militante | null>(null);

  const cargarMilitantes = useCallback(async () => {
    try {
      const r = await pb.collection("militantes").getFullList<Militante>({
        fields: "id,nombres,apellidos,cedula,codigo,estado,municipio,estado_registro,telefono,created",
        perPage: 500
      });
      setMilitantes(r);
    } catch {
      setMilitantes([]);
    }
  }, []);

  useEffect(() => {
    pb.collection("estados").getFullList<Estado>({ sort: "nombre" }).then(setEstados).catch(() => {});
    pb.collection("municipios").getFullList<Municipio>({ sort: "nombre", perPage: 500 }).then(setMunicipios).catch(() => {});
    cargarMilitantes();
  }, [cargarMilitantes]);

  // tiempo real
  useEffect(() => {
    let unsub: (() => void) | null = null;
    pb.collection("militantes")
      .subscribe("*", () => {
        cargarMilitantes();
      })
      .then((fn) => {
        unsub = fn;
      });
    return () => unsub?.();
  }, [cargarMilitantes]);

  // alcance según rol
  useEffect(() => {
    if (role === "regional" && myEstadoId) {
      setSelEstado(myEstadoId);
      setVista("municipios");
    } else if (role === "municipal" && myEstadoId && myMunicipioId) {
      setSelEstado(myEstadoId);
      setSelMunicipio(myMunicipioId);
      setVista("militantes");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estadosVisibles = useMemo(() => {
    if (role === "regional" || role === "municipal") {
      return estados.filter((e) => e.id === myEstadoId);
    }
    return estados;
  }, [estados, role, myEstadoId]);

  const municipiosDelEstado = useMemo(
    () => municipios.filter((m) => m.estado === selEstado),
    [municipios, selEstado]
  );

  const militantesDeMunicipio = useMemo(
    () => militantes.filter((m) => m.municipio === selMunicipio),
    [militantes, selMunicipio]
  );

  const conteo = (col: "estado" | "municipio") => {
    const map = new Map<string, number>();
    for (const m of militantes) map.set(m[col], (map.get(m[col]) || 0) + 1);
    return map;
  };
  const porEstado = useMemo(() => conteo("estado"), [militantes]);
  const porMunicipio = useMemo(() => conteo("municipio"), [militantes]);

  const nombreEstado = (id: string) => estados.find((e) => e.id === id)?.nombre ?? "";
  const nombreMunicipio = (id: string) => municipios.find((m) => m.id === id)?.nombre ?? "";

  const countsPorNombre = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of estados) m[e.nombre] = porEstado.get(e.id) || 0;
    return m;
  }, [estados, porEstado]);

  function seleccionarEstadoPorNombre(nombre: string) {
    const e = estados.find((x) => x.nombre === nombre);
    if (e) {
      setSelEstado(e.id);
      setVista("municipios");
    }
  }

  function exportarExcel() {
    let filas: Record<string, any>[] = [];
    let nombre = "dashboard";
    if (vista === "estados") {
      filas = estadosVisibles.map((e) => ({ Estado: e.nombre, Militantes: porEstado.get(e.id) || 0 }));
      nombre = "militantes-por-estado";
    } else if (vista === "municipios") {
      filas = municipiosDelEstado.map((m) => ({
        Estado: nombreEstado(selEstado || ""),
        Municipio: m.nombre,
        Militantes: porMunicipio.get(m.id) || 0
      }));
      nombre = `militantes-${nombreEstado(selEstado || "").replace(/\s+/g, "-")}`;
    } else {
      filas = militantesDeMunicipio.map((m) => ({
        Nombres: m.nombres,
        Apellidos: m.apellidos,
        Cédula: m.cedula,
        Código: m.codigo,
        Estado: m.estado_registro,
        Teléfono: m.telefono
      }));
      nombre = `militantes-${nombreMunicipio(selMunicipio || "").replace(/\s+/g, "-")}`;
    }
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, `${nombre}.xlsx`);
  }

  const totalGeneral = militantes.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-mep-purple">Dashboard de militantes</h1>
          <div className="flex gap-2">
            <button onClick={exportarExcel} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700">
              Exportar Excel
            </button>
            <button onClick={() => window.print()} className="rounded-lg bg-mep-purple px-3 py-1.5 text-sm text-mep-yellow hover:bg-mep-purple-dark">
              Imprimir (PDF)
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-mep-purple p-4 text-mep-yellow">
          <span className="text-3xl font-bold">{totalGeneral}</span>
          <span className="ml-2 text-sm">militantes en tu alcance</span>
        </div>

        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <button onClick={() => { setVista("estados"); setSelEstado(null); setSelMunicipio(null); }}
            className={vista === "estados" ? "font-semibold text-mep-purple" : "hover:text-mep-purple"}>
            Estados
          </button>
          {selEstado && (
            <>
              <span>›</span>
              <button onClick={() => { setVista("municipios"); setSelMunicipio(null); }}
                className={vista === "municipios" ? "font-semibold text-mep-purple" : "hover:text-mep-purple"}>
                {nombreEstado(selEstado)}
              </button>
            </>
          )}
          {selMunicipio && (
            <>
              <span>›</span>
              <span className="font-semibold text-mep-purple">{nombreMunicipio(selMunicipio)}</span>
            </>
          )}
        </div>

        {/* VISTA: ESTADOS */}
        {vista === "estados" && (
          <div className="space-y-2">
            {(role === "admin" || role === "nacional") && (
              <div className="mb-3 rounded-xl border border-gray-200 bg-white p-2">
                <MapaVenezuela counts={countsPorNombre} onSelect={seleccionarEstadoPorNombre} />
                <p className="px-1 pb-1 text-xs text-gray-400">
                  Haz clic en un estado para ver sus municipios.
                </p>
              </div>
            )}
            {estadosVisibles.map((e) => {
              const total = porEstado.get(e.id) || 0;
              return (
                <button
                  key={e.id}
                  onClick={() => { setSelEstado(e.id); setVista("municipios"); }}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-mep-purple"
                >
                  <span className="font-medium text-gray-800">{e.nombre}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 overflow-hidden rounded bg-gray-100">
                      <div className="h-full bg-mep-purple" style={{ width: `${Math.min(100, total * 2)}%` }} />
                    </div>
                    <span className="w-8 text-right font-bold text-mep-purple">{total}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* VISTA: MUNICIPIOS */}
        {vista === "municipios" && (
          <div className="space-y-2">
            {municipiosDelEstado.map((m) => {
              const total = porMunicipio.get(m.id) || 0;
              return (
                <button
                  key={m.id}
                  onClick={() => { setSelMunicipio(m.id); setVista("militantes"); }}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-mep-purple"
                >
                  <span className="font-medium text-gray-800">{m.nombre}</span>
                  <span className="font-bold text-mep-purple">{total}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* VISTA: MILITANTES */}
        {vista === "militantes" && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-mep-purple text-mep-yellow">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">C.I.</th>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {militantesDeMunicipio.map((m) => (
                  <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">{m.nombres} {m.apellidos}</td>
                    <td className="px-3 py-2">{m.cedula || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{m.codigo || "—"}</td>
                    <td className="px-3 py-2 capitalize">{m.estado_registro || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => setDetalle(m)} className="rounded bg-mep-purple/10 px-2 py-1 text-xs text-mep-purple hover:bg-mep-purple/20">
                        Ver ficha
                      </button>
                    </td>
                  </tr>
                ))}
                {militantesDeMunicipio.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                      No hay militantes en este municipio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal detalle de militante */}
        {detalle && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetalle(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-3 text-lg font-bold text-mep-purple">
                {detalle.nombres} {detalle.apellidos}
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">C.I.</dt><dd>{detalle.cedula || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Código</dt><dd className="font-mono">{detalle.codigo || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Estado</dt><dd>{nombreEstado(detalle.estado)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Municipio</dt><dd>{nombreMunicipio(detalle.municipio)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Estado registro</dt><dd className="capitalize">{detalle.estado_registro || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Teléfono</dt><dd>{detalle.telefono || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Registrado</dt><dd>{new Date(detalle.created).toLocaleDateString("es-VE")}</dd></div>
              </dl>
              <button onClick={() => setDetalle(null)} className="mt-4 w-full rounded-lg bg-mep-purple py-2 font-semibold text-mep-yellow hover:bg-mep-purple-dark">
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
