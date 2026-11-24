import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Header from "../components/Header";
import MapaVenezuela from "../components/MapaVenezuela";
import { Badge, Button, Card, EmptyState, Icon, Modal, PageTitle, estadoTone } from "../components/ui";
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
  const pendientes = useMemo(() => militantes.filter((m) => m.estado_registro === "pendiente").length, [militantes]);
  const aprobados = useMemo(() => militantes.filter((m) => m.estado_registro === "aprobado").length, [militantes]);
  const cobertura = estadosVisibles.length
    ? Math.round((estadosVisibles.filter((e) => (porEstado.get(e.id) || 0) > 0).length / estadosVisibles.length) * 100)
    : 0;
  const esAprueba = role === "admin" || role === "nacional";

  return (
    <div className="min-h-screen pb-12">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <PageTitle
          title="Dashboard de militantes"
          subtitle={`Alcance ${role === "nacional" ? "nacional" : role === "regional" ? "regional" : role === "municipal" ? "municipal" : "general"} · actualización en tiempo real`}
          icon="chart"
          actions={
            <>
              <Button variant="secondary" icon="download" onClick={exportarExcel}>
                Exportar Excel
              </Button>
              <Button variant="primary" icon="printer" onClick={() => window.print()}>
                Imprimir PDF
              </Button>
            </>
          }
        />

        {/* Métricas */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <MetricCard label="Militantes" value={totalGeneral} icon="users" tone="purple" hint="en tu alcance" />
          <MetricCard label="Aprobados" value={aprobados} icon="checkCircle" tone="green" hint="con carnet" />
          <MetricCard label="Pendientes" value={pendientes} icon="clock" tone="yellow" hint="por revisar" />
          <MetricCard label="Cobertura" value={`${cobertura}%`} icon="mapPin" tone="blue" hint="estados con registros" />
        </div>

        {/* Breadcrumb */}
        <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
          <button
            onClick={() => {
              setVista("estados");
              setSelEstado(null);
              setSelMunicipio(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition ${
              vista === "estados" ? "bg-mep-purple/10 font-semibold text-mep-purple" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Icon name="grid" className="h-3.5 w-3.5" /> Estados
          </button>
          {selEstado && (
            <>
              <Icon name="chevronRight" className="h-4 w-4 text-gray-300" />
              <button
                onClick={() => {
                  setVista("municipios");
                  setSelMunicipio(null);
                }}
                className={`rounded-lg px-2 py-1 transition ${
                  vista === "municipios" ? "bg-mep-purple/10 font-semibold text-mep-purple" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {nombreEstado(selEstado)}
              </button>
            </>
          )}
          {selMunicipio && (
            <>
              <Icon name="chevronRight" className="h-4 w-4 text-gray-300" />
              <span className="rounded-lg bg-mep-purple/10 px-2 py-1 font-semibold text-mep-purple">
                {nombreMunicipio(selMunicipio)}
              </span>
            </>
          )}
        </nav>

        {/* VISTA: ESTADOS */}
        {vista === "estados" && (
          <div className="space-y-4">
            {esAprueba && (
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mep-purple/10 text-mep-purple">
                      <Icon name="mapPin" className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Mapa de Venezuela</p>
                      <p className="text-xs text-gray-500">Haz clic en un estado para ver sus municipios</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[0.7rem] font-medium text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <i className="h-2.5 w-2.5 rounded-sm bg-mep-purple" /> Con militantes
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <i className="h-2.5 w-2.5 rounded-sm border border-gray-300 bg-gray-100" /> Sin registros
                    </span>
                  </div>
                </div>
                <div className="p-3 sm:p-4">
                  <MapaVenezuela
                    counts={countsPorNombre}
                    onSelect={seleccionarEstadoPorNombre}
                    selectedName={selEstado ? nombreEstado(selEstado) : undefined}
                  />
                </div>
              </Card>
            )}

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <p className="text-sm font-bold text-gray-800">Estados</p>
                <Badge tone="purple">{estadosVisibles.length} estados</Badge>
              </div>
              <ul className="divide-y divide-gray-100">
                {estadosVisibles.map((e) => {
                  const total = porEstado.get(e.id) || 0;
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => {
                          setSelEstado(e.id);
                          setVista("municipios");
                        }}
                        className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-mep-purple/[0.035] sm:px-5"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition group-hover:bg-mep-purple/10 group-hover:text-mep-purple">
                          <Icon name="mapPin" className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-800">{e.nombre}</span>
                          <span className="mt-1 block h-1.5 w-full max-w-[18rem] overflow-hidden rounded-full bg-gray-100">
                            <span
                              className="block h-full rounded-full bg-mep-purple transition-all"
                              style={{ width: `${Math.min(100, total * 2)}%` }}
                            />
                          </span>
                        </span>
                        <span className="w-10 text-right text-sm font-extrabold text-mep-purple">{total}</span>
                        <Icon name="chevronRight" className="h-4 w-4 text-gray-300 transition group-hover:text-mep-purple" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        )}

        {/* VISTA: MUNICIPIOS */}
        {vista === "municipios" && (
          <div className="space-y-4">
            <Button
              variant="secondary"
              size="sm"
              icon="chevronLeft"
              onClick={() => {
                setVista("estados");
                setSelEstado(null);
              }}
            >
              Volver a estados
            </Button>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <div>
                  <p className="text-sm font-bold text-gray-800">{nombreEstado(selEstado || "")}</p>
                  <p className="text-xs text-gray-500">Municipios de la seccional</p>
                </div>
                <Badge tone="purple">{municipiosDelEstado.length} municipios</Badge>
              </div>
              {municipiosDelEstado.length === 0 ? (
                <div className="p-5">
                  <EmptyState icon="mapPin" title="Sin municipios" description="No hay municipios cargados para este estado." />
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {municipiosDelEstado.map((m) => {
                    const total = porMunicipio.get(m.id) || 0;
                    return (
                      <li key={m.id}>
                        <button
                          onClick={() => {
                            setSelMunicipio(m.id);
                            setVista("militantes");
                          }}
                          className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-mep-purple/[0.035] sm:px-5"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition group-hover:bg-mep-purple/10 group-hover:text-mep-purple">
                            <Icon name="mapPin" className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{m.nombre}</span>
                          <Badge tone={total > 0 ? "purple" : "gray"}>{total} militantes</Badge>
                          <Icon name="chevronRight" className="h-4 w-4 text-gray-300 transition group-hover:text-mep-purple" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        )}

        {/* VISTA: MILITANTES */}
        {vista === "militantes" && (
          <div className="space-y-4">
            <Button
              variant="secondary"
              size="sm"
              icon="chevronLeft"
              onClick={() => {
                setVista("municipios");
                setSelMunicipio(null);
              }}
            >
              Volver a municipios
            </Button>

            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3.5">
                <div>
                  <p className="text-sm font-bold text-gray-800">{nombreMunicipio(selMunicipio || "")}</p>
                  <p className="text-xs text-gray-500">{nombreEstado(selEstado || "")}</p>
                </div>
                <Badge tone="purple">{militantesDeMunicipio.length} militantes</Badge>
              </div>

              {militantesDeMunicipio.length === 0 ? (
                <div className="p-5">
                  <EmptyState icon="users" title="Sin militantes" description="Todavía no hay militantes registrados en este municipio." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-mep-purple text-mep-yellow">
                      <tr>
                        <th className="th">Nombre</th>
                        <th className="th">C.I.</th>
                        <th className="th">Código</th>
                        <th className="th">Estatus</th>
                        <th className="th text-right">Ficha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {militantesDeMunicipio.map((m) => (
                        <tr key={m.id} className="transition hover:bg-mep-purple/[0.03]">
                          <td className="td font-semibold text-gray-800">
                            {m.nombres} {m.apellidos}
                          </td>
                          <td className="td tabular-nums text-gray-600">{m.cedula || "—"}</td>
                          <td className="td font-mono text-xs text-gray-600">{m.codigo || "—"}</td>
                          <td className="td">
                            <Badge tone={estadoTone(m.estado_registro)} dot className="capitalize">
                              {m.estado_registro || "—"}
                            </Badge>
                          </td>
                          <td className="td text-right">
                            <Button variant="ghost" size="sm" iconRight="chevronRight" onClick={() => setDetalle(m)}>
                              Ver ficha
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Modal detalle de militante */}
        <Modal open={!!detalle} onClose={() => setDetalle(null)}>
          {detalle && (
            <>
              <h2 className="mb-1 pr-8 text-lg font-extrabold text-gray-900">
                {detalle.nombres} {detalle.apellidos}
              </h2>
              <p className="mb-4 text-xs text-gray-500">Ficha del militante</p>
              <dl className="space-y-2.5 rounded-xl bg-gray-50 p-4 text-sm">
                <Row label="C.I." value={detalle.cedula || "—"} />
                <Row label="Código" value={<span className="font-mono">{detalle.codigo || "—"}</span>} />
                <Row label="Estado" value={nombreEstado(detalle.estado)} />
                <Row label="Municipio" value={nombreMunicipio(detalle.municipio)} />
                <Row
                  label="Estatus"
                  value={
                    <Badge tone={estadoTone(detalle.estado_registro)} dot className="capitalize">
                      {detalle.estado_registro || "—"}
                    </Badge>
                  }
                />
                <Row label="Teléfono" value={detalle.telefono || "—"} />
                <Row label="Registrado" value={new Date(detalle.created).toLocaleDateString("es-VE")} />
              </dl>
              <Button block className="mt-4" onClick={() => setDetalle(null)}>
                Cerrar
              </Button>
            </>
          )}
        </Modal>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-800">{value}</dd>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
  hint
}: {
  label: string;
  value: number | string;
  icon: "users" | "checkCircle" | "clock" | "mapPin";
  tone: "purple" | "green" | "yellow" | "blue";
  hint: string;
}) {
  const tones: Record<string, string> = {
    purple: "bg-mep-purple/10 text-mep-purple",
    green: "bg-emerald-50 text-emerald-600",
    yellow: "bg-amber-50 text-amber-600",
    blue: "bg-sky-50 text-sky-600"
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[0.7rem] font-bold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-gray-900">{value}</p>
          <p className="mt-0.5 truncate text-[0.7rem] text-gray-400">{hint}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}
