import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Header from "../components/Header";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Icon,
  Modal,
  PageTitle,
  Spinner,
  type IconName
} from "../components/ui";
import { getRole, pb } from "../lib/pocketbase";
import { esExpirado, textoPendiente } from "../lib/fechas";
import type { Estado, Estructura, EstructuraNivel, Municipio } from "../lib/types";

const CARGOS = [
  "Coordinador/a",
  "Organización",
  "Finanzas",
  "Formación",
  "Comunicación y Propaganda",
  "Electoral",
  "Juventud",
  "Mujer",
  "Profesionales y Técnicos",
  "Sindical",
  "Educadores",
  "Movimientos Sociales",
  "Asuntos Indígenas",
  "Derechos Humanos"
];

interface FormState {
  nivel: EstructuraNivel;
  estado: string;
  municipio: string;
  cargo: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  email: string;
  activo: boolean;
  fecha_designacion: string;
}

const EMPTY: FormState = {
  nivel: "CPR",
  estado: "",
  municipio: "",
  cargo: "",
  nombres: "",
  apellidos: "",
  cedula: "",
  telefono: "",
  email: "",
  activo: true,
  fecha_designacion: ""
};

export default function EstructuraPage() {
  const role = getRole();
  const me = pb.authStore.model as Record<string, any> | null;
  const myEstadoId = (me?.estado ?? "") as string;
  const myMunicipioId = (me?.municipio ?? "") as string;

  const esAdmin = role === "admin" || role === "nacional";

  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [records, setRecords] = useState<Estructura[]>([]);
  const [loading, setLoading] = useState(true);

  const [selEstado, setSelEstado] = useState<string>(myEstadoId);
  const [selMunicipio, setSelMunicipio] = useState<string>(myMunicipioId);

  const [modal, setModal] = useState<{ modo: "crear" | "editar"; nivel: EstructuraNivel; editando?: Estructura } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [detalle, setDetalle] = useState<Estructura | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await pb.collection("estructura").getFullList<Estructura>({ sort: "nivel,cargo", perPage: 500 });
      setRecords(r);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    pb.collection("estados").getFullList<Estado>({ sort: "nombre" }).then(setEstados).catch(() => {});
    pb.collection("municipios").getFullList<Municipio>({ sort: "nombre", perPage: 500 }).then(setMunicipios).catch(() => {});
    cargar();
  }, [cargar]);

  // Suscripción en tiempo real
  useEffect(() => {
    let unsub: (() => void) | null = null;
    pb.collection("estructura")
      .subscribe("*", () => cargar())
      .then((fn) => {
        unsub = fn;
      });
    return () => unsub?.();
  }, [cargar]);

  const nombreEstado = (id: string) => estados.find((e) => e.id === id)?.nombre ?? "";
  const nombreMunicipio = (id: string) => municipios.find((m) => m.id === id)?.nombre ?? "";

  const estadosVisibles = useMemo(() => {
    if (esAdmin) return estados;
    return estados.filter((e) => e.id === myEstadoId);
  }, [estados, esAdmin, myEstadoId]);

  const municipiosDelEstado = useMemo(
    () => municipios.filter((m) => m.estado === selEstado),
    [municipios, selEstado]
  );

  // Solo se muestran como estructura "oficial" los aprobados.
  const aprobados = useMemo(() => records.filter((r) => r.estado_registro === "aprobado"), [records]);
  const porAprobar = useMemo(() => records.filter((r) => r.estado_registro !== "aprobado"), [records]);

  // CPR del estado seleccionado
  const cprRecords = useMemo(
    () => aprobados.filter((r) => r.nivel === "CPR" && r.estado === selEstado),
    [aprobados, selEstado]
  );

  // CPM del municipio seleccionado
  const cpmRecords = useMemo(
    () => aprobados.filter((r) => r.nivel === "CPM" && r.municipio === selMunicipio),
    [aprobados, selMunicipio]
  );

  const esMunicipal = role === "municipal";

  function puedeEditar(r: Estructura): boolean {
    if (esAdmin) return true;
    const esMio = r.creado_por === me?.id;
    if (!esMio || r.estado_registro !== "pendiente") return false;
    if (role === "regional") return r.estado === myEstadoId;
    if (role === "municipal") return r.nivel === "CPM" && r.municipio === myMunicipioId;
    return false;
  }

  function abrirCrear(nivel: EstructuraNivel) {
    setForm({
      ...EMPTY,
      nivel,
      estado: selEstado || myEstadoId,
      municipio: nivel === "CPM" ? selMunicipio || myMunicipioId : ""
    });
    setError("");
    setModal({ modo: "crear", nivel });
  }

  function abrirEditar(r: Estructura) {
    setForm({
      nivel: r.nivel,
      estado: r.estado || "",
      municipio: r.municipio || "",
      cargo: r.cargo || "",
      nombres: r.nombres || "",
      apellidos: r.apellidos || "",
      cedula: r.cedula || "",
      telefono: r.telefono || "",
      email: r.email || "",
      activo: r.activo !== false,
      fecha_designacion: r.fecha_designacion || ""
    });
    setError("");
    setModal({ modo: "editar", nivel: r.nivel, editando: r });
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setMunicipioConEstado(id: string) {
    const m = municipios.find((x) => x.id === id);
    setForm((f) => ({ ...f, municipio: id, estado: m?.estado ?? f.estado }));
  }

  async function guardar() {
    if (!form.nivel || !form.cargo || !form.nombres || !form.apellidos) {
      setError("Completa nivel, cargo, nombres y apellidos.");
      return;
    }
    if (form.nivel === "CPR" && !form.estado) {
      setError("Selecciona el estado (seccional).");
      return;
    }
    if (form.nivel === "CPM" && !form.municipio) {
      setError("Selecciona el municipio.");
      return;
    }
    if (!form.cedula.trim()) {
      setError("La cédula es obligatoria.");
      return;
    }
    if (!form.telefono.trim()) {
      setError("El número de teléfono es obligatorio.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const payload: Record<string, any> = {
        nivel: form.nivel,
        estado: form.nivel === "CPR" ? form.estado : form.estado || municipios.find((m) => m.id === form.municipio)?.estado || "",
        municipio: form.nivel === "CPM" ? form.municipio : "",
        cargo: form.cargo,
        nombres: form.nombres,
        apellidos: form.apellidos,
        cedula: form.cedula || null,
        telefono: form.telefono || null,
        email: form.email || null,
        activo: form.activo,
        fecha_designacion: form.fecha_designacion || null
      };

      if (modal?.modo === "editar" && modal.editando) {
        await pb.collection("estructura").update(modal.editando.id, payload);
        setMsg("Cargo actualizado correctamente.");
      } else {
        payload.creado_por = me?.id ?? null;
        if (esAdmin) {
          // El admin/nacional aprueba al registrar directamente.
          payload.estado_registro = "aprobado";
          payload.aprobado_por = me?.id ?? null;
          payload.fecha_aprobacion = new Date().toISOString();
        } else {
          payload.estado_registro = "pendiente";
          payload.fecha_pendiente = new Date().toISOString();
        }
        await pb.collection("estructura").create(payload);
        setMsg(esAdmin ? "Cargo agregado a la estructura." : "Cargo enviado para aprobación.");
      }
      setModal(null);
      cargar();
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar el cargo.");
    } finally {
      setGuardando(false);
    }
  }

  async function aprobar(r: Estructura) {
    try {
      await pb.collection("estructura").update(r.id, {
        estado_registro: "aprobado",
        aprobado_por: me?.id ?? null,
        fecha_aprobacion: new Date().toISOString(),
        motivo_rechazo: ""
      });
      setMsg("Cargo aprobado.");
      cargar();
    } catch (e: any) {
      setMsg(e?.message || "No se pudo aprobar.");
    }
  }

  async function rechazar(r: Estructura) {
    const motivo = window.prompt("Motivo del rechazo:") || "";
    try {
      await pb.collection("estructura").update(r.id, {
        estado_registro: "rechazado",
        motivo_rechazo: motivo
      });
      setMsg("Cargo rechazado.");
      cargar();
    } catch (e: any) {
      setMsg(e?.message || "No se pudo rechazar.");
    }
  }

  async function eliminar(r: Estructura) {
    if (!window.confirm(`¿Eliminar el cargo "${r.cargo}" de ${r.nombres} ${r.apellidos}?`)) return;
    try {
      await pb.collection("estructura").delete(r.id);
      setMsg("Cargo eliminado.");
      cargar();
    } catch (e: any) {
      setMsg(e?.message || "No se pudo eliminar.");
    }
  }

  function exportarExcel() {
    const filas = records.map((r) => ({
      Nivel: r.nivel,
      Estado: nombreEstado(r.estado),
      Municipio: r.nivel === "CPM" ? nombreMunicipio(r.municipio || "") : "—",
      Cargo: r.cargo,
      Nombres: r.nombres,
      Apellidos: r.apellidos,
      "C.I.": r.cedula || "",
      Teléfono: r.telefono || "",
      Email: r.email || "",
      Activo: r.activo !== false ? "Sí" : "No",
      "Estatus": r.estado_registro || "pendiente",
      "Fecha de designación": r.fecha_designacion || ""
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estructura");
    XLSX.writeFile(wb, "estructura-partido.xlsx");
  }

  const totalCPR = aprobados.filter((r) => r.nivel === "CPR").length;
  const totalCPM = aprobados.filter((r) => r.nivel === "CPM").length;
  const totalPendientes = records.filter((r) => r.estado_registro === "pendiente").length;

  return (
    <div className="min-h-dvh pb-12">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <PageTitle
          title="Estructura del partido"
          subtitle="Cargos directivos: Comando Político Regional (CPR) y Comando Político Municipal (CPM)"
          icon="network"
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

        {msg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-mep-purple/10 px-4 py-2.5 text-sm text-mep-purple animate-fade-in">
            <Icon name="checkCircle" className="h-4 w-4" />
            {msg}
            <button onClick={() => setMsg("")} className="ml-auto text-mep-purple/60 hover:text-mep-purple">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Resumen */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          <Resumen label="Cargos CPR" value={totalCPR} icon="shield" />
          <Resumen label="Cargos CPM" value={totalCPM} icon="users" />
          <Resumen label="Pendientes" value={totalPendientes} icon="clock" />
        </div>

        {/* Pendientes de aprobación (admin/nacional) */}
        {esAdmin && porAprobar.length > 0 && (
          <Card className="mb-5 overflow-hidden">
            <CardHeader
              title="Pendientes de aprobación"
              subtitle="Revisa y aprueba los cargos propuestos por regionales y municipales"
              icon="clock"
            />
            <ul className="divide-y divide-gray-100">
              {porAprobar.map((r) => {
                const expirado = r.estado_registro === "pendiente" && esExpirado(r.fecha_pendiente || r.created);
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition hover:bg-mep-purple/[0.03]">
                    <button onClick={() => setDetalle(r)} className="min-w-0 flex-1 text-left">
                      <div className="font-semibold text-gray-800">
                        {r.cargo} <span className="text-xs font-medium text-gray-400">· {r.nivel}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {r.nombres} {r.apellidos} · {r.nivel === "CPR" ? nombreEstado(r.estado) : nombreMunicipio(r.municipio || "")}
                      </div>
                      {r.estado_registro === "pendiente" && (
                        <div className={`mt-0.5 text-xs font-medium ${expirado ? "text-orange-600" : "text-gray-400"}`}>
                          {textoPendiente(r.fecha_pendiente || r.created)}
                          {expirado && <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 font-semibold text-orange-700">Expirado</span>}
                        </div>
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <EstadoBadge r={r} />
                      <Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => setDetalle(r)}>
                        Ver
                      </Button>
                      {r.estado_registro === "pendiente" ? (
                        <>
                          <Button size="sm" variant="success" icon="check" onClick={() => aprobar(r)} disabled={expirado}>
                            Aprobar
                          </Button>
                          <Button size="sm" variant="danger" icon="x" onClick={() => rechazar(r)}>
                            Rechazar
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" icon="x" onClick={() => eliminar(r)}>
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {/* Selector de seccional */}
        {!esMunicipal && (
          <Card className="mb-4">
            <div className="flex flex-wrap items-center gap-2 px-5 py-3.5">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-600">
                <Icon name="mapPin" className="h-4 w-4 text-mep-purple" /> Seccional:
              </span>
              {estadosVisibles.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelEstado(e.id);
                    setSelMunicipio("");
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    selEstado === e.id
                      ? "bg-mep-purple text-mep-yellow shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-mep-purple/10 hover:text-mep-purple"
                  }`}
                >
                  {e.nombre}
                </button>
              ))}
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Spinner className="h-5 w-5" /> Cargando estructura…
          </div>
        ) : (
          <div className="space-y-5">
            {/* CPR */}
            {!esMunicipal && selEstado && (
              <Card className="overflow-hidden">
                <CardHeader
                  title={`CPR · ${nombreEstado(selEstado)}`}
                  subtitle="Comando Político Regional"
                  icon="shield"
                  right={
                    <Button size="sm" icon="plus" onClick={() => abrirCrear("CPR")}>
                      Agregar cargo
                    </Button>
                  }
                />
                <TablaCargos
                  items={cprRecords}
                  nombreEstado={nombreEstado}
                  nombreMunicipio={nombreMunicipio}
                  puedeEditar={puedeEditar}
                  onEditar={abrirEditar}
                  onEliminar={eliminar}
                  vacio="Aún no hay cargos aprobados en este CPR."
                />
              </Card>
            )}

            {/* CPM */}
            {!esMunicipal && selEstado && (
              <Card className="overflow-hidden">
                <CardHeader
                  title="CPM por municipio"
                  subtitle="Comando Político Municipal"
                  icon="users"
                  right={
                    <div className="flex items-center gap-2">
                      <select
                        value={selMunicipio}
                        onChange={(e) => setSelMunicipio(e.target.value)}
                        className="field-input !w-auto !py-2 text-sm"
                      >
                        <option value="">Seleccione municipio</option>
                        {municipiosDelEstado.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" icon="plus" onClick={() => abrirCrear("CPM")} disabled={!selMunicipio}>
                        Agregar cargo
                      </Button>
                    </div>
                  }
                />
                {!selMunicipio ? (
                  <div className="p-5">
                    <EmptyState icon="mapPin" title="Selecciona un municipio" description="Elige un municipio para ver y gestionar su CPM." />
                  </div>
                ) : (
                  <TablaCargos
                    items={cpmRecords}
                    nombreEstado={nombreEstado}
                    nombreMunicipio={nombreMunicipio}
                    puedeEditar={puedeEditar}
                    onEditar={abrirEditar}
                    onEliminar={eliminar}
                    vacio={`Aún no hay cargos aprobados en el CPM de ${nombreMunicipio(selMunicipio)}.`}
                  />
                )}
              </Card>
            )}

            {/* Vista municipal: solo su CPM */}
            {esMunicipal && (
              <Card className="overflow-hidden">
                <CardHeader
                  title={`CPM · ${nombreMunicipio(myMunicipioId)}`}
                  subtitle={`${nombreEstado(myEstadoId)} · Comando Político Municipal`}
                  icon="users"
                  right={
                    <Button size="sm" icon="plus" onClick={() => abrirCrear("CPM")}>
                      Agregar cargo
                    </Button>
                  }
                />
                <TablaCargos
                  items={aprobados.filter((r) => r.nivel === "CPM" && r.municipio === myMunicipioId)}
                  nombreEstado={nombreEstado}
                  nombreMunicipio={nombreMunicipio}
                  puedeEditar={puedeEditar}
                  onEditar={abrirEditar}
                  onEliminar={eliminar}
                  vacio="Aún no hay cargos aprobados en tu CPM."
                />
              </Card>
            )}
          </div>
        )}

        {/* Modal crear/editar */}
        <Modal open={!!modal} onClose={() => setModal(null)} className="max-w-lg">
          <h2 className="mb-1 pr-8 text-lg font-extrabold text-gray-900">
            {modal?.modo === "editar" ? "Editar cargo" : `Agregar cargo · ${modal?.nivel ?? ""}`}
          </h2>
          <p className="mb-4 text-xs text-gray-500">
            {modal?.nivel === "CPR" ? "Comando Político Regional" : "Comando Político Municipal"}
            {!esAdmin && modal?.modo === "crear" ? " · quedará pendiente de aprobación" : ""}
          </p>

          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {form.nivel === "CPR" ? (
              <Campo label="Estado (seccional)">
                <select
                  className="field-input"
                  value={form.estado}
                  onChange={(e) => set("estado", e.target.value)}
                  disabled={!esAdmin}
                >
                  <option value="">Seleccione estado</option>
                  {estadosVisibles.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            ) : (
              <Campo label="Municipio">
                <select
                  className="field-input"
                  value={form.municipio}
                  onChange={(e) => setMunicipioConEstado(e.target.value)}
                  disabled={!esAdmin && role !== "regional"}
                >
                  <option value="">Seleccione municipio</option>
                  {(role === "municipal"
                    ? municipios.filter((m) => m.id === myMunicipioId)
                    : municipiosDelEstado
                  ).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            )}

            <Campo label="Cargo">
              <select className="field-input" value={form.cargo} onChange={(e) => set("cargo", e.target.value)}>
                <option value="">Seleccione cargo</option>
                {CARGOS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Nombres">
              <input className="field-input" value={form.nombres} onChange={(e) => set("nombres", e.target.value)} placeholder="Nombre(s)" />
            </Campo>
            <Campo label="Apellidos">
              <input className="field-input" value={form.apellidos} onChange={(e) => set("apellidos", e.target.value)} placeholder="Apellido(s)" />
            </Campo>
            <Campo label="C.I.">
              <input className="field-input" value={form.cedula} onChange={(e) => set("cedula", e.target.value)} placeholder="V-00000000" />
            </Campo>
            <Campo label="Teléfono">
              <input className="field-input" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="0412-0000000" />
            </Campo>
            <Campo label="Correo electrónico">
              <input className="field-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="correo@ejemplo.com" />
            </Campo>
            <Campo label="Fecha de designación">
              <input className="field-input" type="date" value={form.fecha_designacion} onChange={(e) => set("fecha_designacion", e.target.value)} />
            </Campo>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => set("activo", e.target.checked)}
              className="h-4 w-4 accent-mep-purple"
            />
            Cargo activo
          </label>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={guardar} loading={guardando}>
              {modal?.modo === "editar" ? "Guardar cambios" : "Agregar cargo"}
            </Button>
          </div>
        </Modal>

        {/* Modal detalle de cargo pendiente */}
        <Modal open={!!detalle} onClose={() => setDetalle(null)} className="max-w-lg">
          {detalle && (
            <>
              <div className="mb-1 flex items-center gap-2 pr-8">
                <h2 className="text-lg font-extrabold text-gray-900">{detalle.cargo}</h2>
                <Badge tone="purple">{detalle.nivel}</Badge>
              </div>
              <p className="mb-4 text-xs text-gray-500">
                {detalle.nivel === "CPR" ? "Comando Político Regional" : "Comando Político Municipal"}
              </p>
              <dl className="space-y-2.5 rounded-xl bg-gray-50 p-4 text-sm">
                <Fila label="Nombre" value={`${detalle.nombres} ${detalle.apellidos}`} />
                <Fila label="C.I." value={detalle.cedula || "—"} />
                <Fila label="Teléfono" value={detalle.telefono || "—"} />
                <Fila label="Correo" value={detalle.email || "—"} />
                <Fila label="Estado" value={nombreEstado(detalle.estado)} />
                {detalle.nivel === "CPM" && <Fila label="Municipio" value={nombreMunicipio(detalle.municipio || "")} />}
                <Fila label="Activo" value={detalle.activo !== false ? "Sí" : "No"} />
                {detalle.fecha_designacion && <Fila label="Designación" value={new Date(detalle.fecha_designacion).toLocaleDateString("es-VE")} />}
                <Fila label="Estatus" value={<EstadoBadge r={detalle} />} />
                {detalle.estado_registro === "pendiente" && (
                  <Fila label="Enviado" value={textoPendiente(detalle.fecha_pendiente || detalle.created)} />
                )}
              </dl>
              <div className="mt-5 flex justify-end gap-2">
                {detalle.estado_registro === "pendiente" ? (
                  <>
                    <Button variant="danger" icon="x" onClick={() => { rechazar(detalle); setDetalle(null); }}>
                      Rechazar
                    </Button>
                    <Button
                      variant="success"
                      icon="check"
                      disabled={esExpirado(detalle.fecha_pendiente || detalle.created)}
                      onClick={() => { aprobar(detalle); setDetalle(null); }}
                    >
                      Aprobar
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => setDetalle(null)}>
                    Cerrar
                  </Button>
                )}
              </div>
            </>
          )}
        </Modal>
      </main>
    </div>
  );
}

function Resumen({ label, value, icon }: { label: string; value: number; icon: IconName }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mep-purple/10 text-mep-purple">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="text-2xl font-extrabold tabular-nums text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function Fila({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-800">{value}</dd>
    </div>
  );
}

function EstadoBadge({ r }: { r: Estructura }) {
  if (r.estado_registro === "aprobado") return <Badge tone="green" dot>Aprobado</Badge>;
  if (r.estado_registro === "rechazado") return <Badge tone="red" dot>Rechazado</Badge>;
  return <Badge tone="yellow" dot>Pendiente</Badge>;
}

function TablaCargos({
  items,
  nombreEstado,
  nombreMunicipio,
  puedeEditar,
  onEditar,
  onEliminar,
  vacio
}: {
  items: Estructura[];
  nombreEstado: (id: string) => string;
  nombreMunicipio: (id: string) => string;
  puedeEditar: (r: Estructura) => boolean;
  onEditar: (r: Estructura) => void;
  onEliminar: (r: Estructura) => void;
  vacio: string;
}) {
  if (items.length === 0) {
    return (
      <div className="p-5">
        <EmptyState icon="users" title="Sin cargos" description={vacio} />
      </div>
    );
  }
  return (
    <>
      {/* Escritorio / tablet: tabla */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-mep-purple text-mep-yellow">
            <tr>
              <th className="th">Cargo</th>
              <th className="th">Responsable</th>
              <th className="th">Contacto</th>
              <th className="th">Ámbito</th>
              <th className="th">Estado</th>
              <th className="th text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((r) => (
              <tr key={r.id} className="transition hover:bg-mep-purple/[0.03]">
                <td className="td font-semibold text-gray-800">{r.cargo}</td>
                <td className="td">
                  <div className="flex items-center gap-2.5">
                    <Avatar nombre={`${r.nombres} ${r.apellidos}`} size="sm" />
                    <div>
                      <div className="font-medium text-gray-800">
                        {r.nombres} {r.apellidos}
                      </div>
                      {r.cedula && <div className="text-xs text-gray-400">C.I. {r.cedula}</div>}
                    </div>
                  </div>
                </td>
                <td className="td text-gray-600">
                  {r.telefono && <div>{r.telefono}</div>}
                  {r.email && <div className="text-xs text-gray-400">{r.email}</div>}
                </td>
                <td className="td text-gray-600">
                  {r.nivel === "CPR" ? nombreEstado(r.estado) : nombreMunicipio(r.municipio || "")}
                </td>
                <td className="td">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <EstadoBadge r={r} />
                    {r.activo === false && <Badge tone="gray">Inactivo</Badge>}
                  </div>
                </td>
                <td className="td">
                  {puedeEditar(r) ? (
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => onEditar(r)}>
                        Editar
                      </Button>
                      <button
                        onClick={() => onEliminar(r)}
                        title="Eliminar"
                        aria-label="Eliminar"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
                      >
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas */}
      <div className="space-y-3 p-4 md:hidden">
        {items.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-gray-800">{r.cargo}</div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {r.nombres} {r.apellidos}
                  {r.cedula ? ` · C.I. ${r.cedula}` : ""}
                </div>
              </div>
              <EstadoBadge r={r} />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {r.nivel === "CPR" ? nombreEstado(r.estado) : nombreMunicipio(r.municipio || "")}
              {r.activo === false && " · Inactivo"}
            </div>
            {(r.telefono || r.email) && (
              <div className="mt-1 text-xs text-gray-600">
                {r.telefono && <div>{r.telefono}</div>}
                {r.email && <div className="truncate">{r.email}</div>}
              </div>
            )}
            {puedeEditar(r) && (
              <div className="mt-3 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEditar(r)}>
                  Editar
                </Button>
                <button
                  onClick={() => onEliminar(r)}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-red-50 px-3 text-sm font-medium text-red-600 transition hover:bg-red-100"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
