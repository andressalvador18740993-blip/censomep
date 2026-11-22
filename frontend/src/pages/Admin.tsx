import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Header from "../components/Header";
import PlanillaForm from "../components/PlanillaForm";
import { getRole, pb } from "../lib/pocketbase";
import { generarCodigo, planillaFields } from "../lib/planilla";
import { generarYGuardarCarnet } from "../lib/carnet";
import { esExpirado, textoPendiente } from "../lib/fechas";
import type { Estado, Estructura, Militante, Municipio, User } from "../lib/types";

type Tab = "aprobaciones" | "militantes" | "estructura" | "usuarios" | "registrar";

export default function Admin() {
  const role = getRole();
  const esAdmin = role === "admin";
  const esAprueba = role === "admin" || role === "nacional";
  const me = pb.authStore.model as Record<string, any> | null;

  const [tab, setTab] = useState<Tab>(esAprueba ? "aprobaciones" : "registrar");
  const [pendientes, setPendientes] = useState<Militante[]>([]);
  const [todos, setTodos] = useState<Militante[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [msg, setMsg] = useState("");
  const [registroKey, setRegistroKey] = useState(0);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [estrucPendientes, setEstrucPendientes] = useState<Estructura[]>([]);
  const [detalleEstructura, setDetalleEstructura] = useState<Estructura | null>(null);

  const [nuevo, setNuevo] = useState({
    email: "",
    password: "",
    nombre: "",
    apellido: "",
    role: "nacional",
    estado: "",
    municipio: ""
  });

  const cargar = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([
        pb.collection("militantes").getFullList<Militante>({ filter: 'estado_registro = "pendiente"', sort: "created" }),
        pb.collection("militantes").getFullList<Militante>({ sort: "-created", perPage: 500 })
      ]);
      setPendientes(p);
      setTodos(t);
    } catch {
      setPendientes([]);
      setTodos([]);
    }
    if (esAprueba) {
      try {
        setEstrucPendientes(
          await pb.collection("estructura").getFullList<Estructura>({ filter: 'estado_registro != "aprobado"', sort: "created" })
        );
      } catch {
        setEstrucPendientes([]);
      }
    }
    if (esAdmin) {
      try {
        setStaff(await pb.collection("users").getFullList<User>({ sort: "role" }));
      } catch {
        setStaff([]);
      }
    }
  }, [esAdmin, esAprueba]);

  useEffect(() => {
    cargar();
    pb.collection("estados").getFullList<Estado>({ sort: "nombre" }).then(setEstados).catch(() => {});
    pb.collection("municipios").getFullList<Municipio>({ sort: "nombre", perPage: 500 }).then(setMunicipios).catch(() => {});
  }, [cargar]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    pb.collection("militantes")
      .subscribe("*", () => cargar())
      .then((fn) => {
        unsub = fn;
      });
    return () => unsub?.();
  }, [cargar]);

  useEffect(() => {
    if (!esAprueba) return;
    let unsub: (() => void) | null = null;
    pb.collection("estructura")
      .subscribe("*", () => cargar())
      .then((fn) => {
        unsub = fn;
      });
    return () => unsub?.();
  }, [cargar, esAprueba]);

  /** Sube el carnet PDF (generado en el navegador) y lo marca como generado. */
  async function subirCarnet(m: Militante) {
    await generarYGuardarCarnet(m.id, {
      nombres: m.nombres,
      apellidos: m.apellidos,
      cedula: m.cedula,
      codigo: m.codigo,
      estadoNombre: estadoDe(m.estado),
      municipioNombre: municipioDe(m.municipio)
    });
    await pb.collection("militantes").update(m.id, { carnet_generado: true, carnet_impreso: false });
  }

  async function aprobar(m: Militante) {
    setProcesando(m.id);
    try {
      const workerUrl = import.meta.env.VITE_WORKER_URL as string | undefined;
      if (workerUrl) {
        try {
          const apiKey = import.meta.env.VITE_WORKER_API_KEY as string | undefined;
          const res = await fetch(`${workerUrl}/aprobar`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(apiKey ? { "x-api-key": apiKey } : {})
            },
            body: JSON.stringify({ militanteId: m.id, aprobadoPor: me?.id ?? null })
          });
          const data = await res.json();
          if (res.ok) {
            setMsg(`Militante aprobado. Carnet generado: ${data.codigo}`);
            cargar();
            return;
          }
        } catch {
          /* el worker no está disponible: se genera en el navegador */
        }
      }
      // Generación local del carnet (sin depender del VPS)
      await subirCarnet(m);
      await pb.collection("militantes").update(m.id, {
        estado_registro: "aprobado",
        fecha_aprobacion: new Date().toISOString(),
        aprobado_por: me?.id ?? null,
        motivo_rechazo: ""
      });
      setMsg(`Militante aprobado. Carnet generado: ${m.codigo}`);
      cargar();
    } catch (e: any) {
      setMsg(`No se pudo aprobar: ${e?.message || e}`);
    } finally {
      setProcesando(null);
    }
  }

  async function generarCarnet(m: Militante) {
    setProcesando(m.id);
    try {
      await subirCarnet(m);
      setMsg(`Carnet generado para ${m.nombres} ${m.apellidos}.`);
      cargar();
    } catch (e: any) {
      setMsg(`No se pudo generar el carnet: ${e?.message || e}`);
    } finally {
      setProcesando(null);
    }
  }

  async function rechazar(id: string) {
    const motivo = window.prompt("Motivo del rechazo:") || "";
    await pb.collection("militantes").update(id, {
      estado_registro: "rechazado",
      motivo_rechazo: motivo
    });
    setMsg("Militante rechazado.");
    cargar();
  }

  async function bloquear(id: string) {
    await pb.collection("militantes").update(id, { estado_registro: "bloqueado" });
    setMsg("Militante bloqueado.");
    cargar();
  }

  async function desbloquear(id: string) {
    await pb.collection("militantes").update(id, { estado_registro: "aprobado" });
    setMsg("Militante desbloqueado.");
    cargar();
  }

  async function reimprimirCarnet(id: string) {
    await pb.collection("militantes").update(id, { carnet_impreso: false });
    setMsg("Carnet habilitado para reimpresión por el militante.");
    cargar();
  }

  async function aprobarEstructura(r: Estructura) {
    try {
      await pb.collection("estructura").update(r.id, {
        estado_registro: "aprobado",
        aprobado_por: me?.id ?? null,
        fecha_aprobacion: new Date().toISOString(),
        motivo_rechazo: ""
      });
      setMsg(`Cargo "${r.cargo}" aprobado.`);
      cargar();
    } catch (e: any) {
      setMsg(e?.message || "No se pudo aprobar el cargo.");
    }
  }

  async function rechazarEstructura(r: Estructura) {
    const motivo = window.prompt("Motivo del rechazo:") || "";
    try {
      await pb.collection("estructura").update(r.id, { estado_registro: "rechazado", motivo_rechazo: motivo });
      setMsg("Cargo rechazado.");
      cargar();
    } catch (e: any) {
      setMsg(e?.message || "No se pudo rechazar el cargo.");
    }
  }

  async function eliminarEstructura(r: Estructura) {
    if (!window.confirm(`¿Eliminar el cargo "${r.cargo}" de ${r.nombres} ${r.apellidos}?`)) return;
    try {
      await pb.collection("estructura").delete(r.id);
      setMsg("Cargo eliminado.");
      cargar();
    } catch (e: any) {
      setMsg(e?.message || "No se pudo eliminar el cargo.");
    }
  }

  async function crearUsuario(e: FormEvent) {
    e.preventDefault();
    try {
      await pb.collection("users").create({
        email: nuevo.email,
        password: nuevo.password,
        passwordConfirm: nuevo.password,
        nombre: nuevo.nombre,
        apellido: nuevo.apellido,
        role: nuevo.role,
        estado: nuevo.estado || null,
        municipio: nuevo.municipio || null,
        activo: true,
        verified: true
      });
      setMsg("Usuario creado.");
      setNuevo({ email: "", password: "", nombre: "", apellido: "", role: "nacional", estado: "", municipio: "" });
      cargar();
    } catch (err: any) {
      setMsg(err?.message || "No se pudo crear el usuario.");
    }
  }

  async function registrarMilitante(data: Record<string, any>) {
    const codigo = generarCodigo(data.estadoCodigo, data.municipioCodigo);
    await pb.collection("militantes").create({
      email: data.email,
      password: data.password,
      passwordConfirm: data.password,
      ...planillaFields(data),
      codigo,
      estado_registro: "pendiente",
      fecha_pendiente: new Date().toISOString(),
      tipo_registro: "inscripcion",
      responsable_registro: me?.email || "",
      version_censo: 1,
      ultimo_recenso: new Date().toISOString().slice(0, 10),
      recenso_pendiente: false
    });
    setMsg(`Militante registrado. Código: ${codigo}`);
    setRegistroKey((k) => k + 1);
    cargar();
  }

  const estadoDe = (id: string) => estados.find((e) => e.id === id)?.nombre ?? "";
  const municipioDe = (id: string) => municipios.find((m) => m.id === id)?.nombre ?? "";

  const badge = (e: string) => {
    const map: Record<string, string> = {
      pendiente: "bg-yellow-100 text-yellow-700",
      aprobado: "bg-green-100 text-green-700",
      rechazado: "bg-red-100 text-red-700",
      bloqueado: "bg-gray-200 text-gray-600"
    };
    return <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${map[e] || "bg-gray-100"}`}>{e}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-4 text-xl font-bold text-mep-purple">Panel de administración</h1>
        {msg && <p className="mb-3 rounded-lg bg-mep-purple/10 p-3 text-sm text-mep-purple">{msg}</p>}

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          {esAprueba && <TabBtn active={tab === "aprobaciones"} onClick={() => setTab("aprobaciones")}>Aprobaciones ({pendientes.length})</TabBtn>}
          {esAprueba && <TabBtn active={tab === "militantes"} onClick={() => setTab("militantes")}>Militantes ({todos.length})</TabBtn>}
          {esAprueba && <TabBtn active={tab === "estructura"} onClick={() => setTab("estructura")}>Estructura ({estrucPendientes.filter((r) => r.estado_registro === "pendiente").length})</TabBtn>}
          <TabBtn active={tab === "registrar"} onClick={() => setTab("registrar")}>Registrar militante</TabBtn>
          {esAdmin && <TabBtn active={tab === "usuarios"} onClick={() => setTab("usuarios")}>Usuarios</TabBtn>}
        </div>

        {/* APROBACIONES */}
        {tab === "aprobaciones" && esAprueba && (
          <div className="space-y-3">
            {pendientes.length === 0 && <p className="text-gray-500">No hay militantes pendientes de aprobación.</p>}
            {pendientes.map((m) => {
              const pendienteDesde = m.fecha_pendiente || m.updated;
              const expirado = esExpirado(pendienteDesde);
              return (
                <div key={m.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${expirado ? "border-orange-300 bg-orange-50/60" : "border-gray-200 bg-white"}`}>
                  <div>
                    <div className="font-medium">{m.nombres} {m.apellidos}</div>
                    <div className="text-xs text-gray-500">
                      C.I. {m.cedula || "—"} · {estadoDe(m.estado)} / {municipioDe(m.municipio)} · <span className="font-mono">{m.codigo}</span>
                    </div>
                    <div className={`mt-1 text-xs font-medium ${expirado ? "text-orange-600" : "text-gray-400"}`}>
                      {textoPendiente(pendienteDesde)}
                      {expirado && <span className="ml-2 rounded bg-orange-100 px-1.5 py-0.5 font-semibold text-orange-700">Expirado (más de 30 días)</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => aprobar(m)} disabled={procesando === m.id || expirado} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
                      {procesando === m.id ? "Generando…" : "Aprobar"}
                    </button>
                    <button onClick={() => rechazar(m.id)} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Rechazar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MILITANTES (bloquear/desbloquear) */}
        {tab === "militantes" && esAprueba && (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-mep-purple text-mep-yellow">
                <tr>
                  <th className="px-3 py-2">Militante</th>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {todos.map((m) => (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <div className="font-medium">{m.nombres} {m.apellidos}</div>
                      <div className="text-xs text-gray-500">{estadoDe(m.estado)} / {municipioDe(m.municipio)}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{m.codigo || "—"}</td>
                    <td className="px-3 py-2">{badge(m.estado_registro)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {m.estado_registro === "bloqueado" ? (
                          <button onClick={() => desbloquear(m.id)} className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Desbloquear</button>
                        ) : (
                          <button onClick={() => bloquear(m.id)} className="rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700">Bloquear</button>
                        )}
                        {m.estado_registro === "aprobado" && !m.carnet_pdf && (
                          <button onClick={() => generarCarnet(m)} disabled={procesando === m.id} className="rounded bg-mep-purple px-2 py-1 text-xs text-mep-yellow hover:bg-mep-purple-dark disabled:opacity-60">
                            {procesando === m.id ? "Generando…" : "Generar carnet"}
                          </button>
                        )}
                        {m.estado_registro === "aprobado" && m.carnet_pdf && (
                          <button onClick={() => reimprimirCarnet(m.id)} className="rounded bg-mep-purple px-2 py-1 text-xs text-mep-yellow hover:bg-mep-purple-dark">Reimprimir carnet</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ESTRUCTURA (aprobaciones CPR/CPM) */}
        {tab === "estructura" && esAprueba && (
          <div className="space-y-3">
            {estrucPendientes.length === 0 && <p className="text-gray-500">No hay cargos de estructura pendientes de aprobación.</p>}
            {estrucPendientes.map((r) => {
              const expirado = r.estado_registro === "pendiente" && esExpirado(r.fecha_pendiente || r.created);
              return (
                <div key={r.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${expirado ? "border-orange-300 bg-orange-50/60" : "border-gray-200 bg-white"}`}>
                  <button onClick={() => setDetalleEstructura(r)} className="min-w-0 flex-1 text-left">
                    <div className="font-medium">
                      {r.cargo} <span className="text-xs font-normal text-gray-400">· {r.nivel}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.nombres} {r.apellidos} · {r.nivel === "CPR" ? estadoDe(r.estado) : municipioDe(r.municipio || "")}
                    </div>
                    <div className={`mt-1 text-xs font-medium ${expirado ? "text-orange-600" : r.estado_registro === "rechazado" ? "text-red-500" : "text-gray-400"}`}>
                      {r.estado_registro === "pendiente" ? (
                        <>
                          {textoPendiente(r.fecha_pendiente || r.created)}
                          {expirado && <span className="ml-2 rounded bg-orange-100 px-1.5 py-0.5 font-semibold text-orange-700">Expirado (más de 30 días)</span>}
                        </>
                      ) : (
                        "Rechazado"
                      )}
                    </div>
                  </button>
                  <div className="flex gap-2">
                    {r.estado_registro === "pendiente" ? (
                      <>
                        <button onClick={() => aprobarEstructura(r)} disabled={expirado} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">Aprobar</button>
                        <button onClick={() => rechazarEstructura(r)} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Rechazar</button>
                      </>
                    ) : (
                      <button onClick={() => eliminarEstructura(r)} className="rounded-lg bg-gray-600 px-3 py-1.5 text-sm text-white hover:bg-gray-700">Eliminar</button>
                    )}
                    <button onClick={() => setDetalleEstructura(r)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">Ver</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REGISTRAR MILITANTE */}
        {tab === "registrar" && (
          <PlanillaForm key={registroKey} mode="staff" onSubmit={registrarMilitante} />
        )}

        {/* USUARIOS (solo admin) */}
        {tab === "usuarios" && esAdmin && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-3 font-semibold text-mep-purple">Crear usuario staff</h2>
              <form onSubmit={crearUsuario} className="space-y-2">
                <input required placeholder="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                <input required placeholder="Apellido" value={nuevo.apellido} onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                <input required type="email" placeholder="Email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                <input required type="password" placeholder="Contraseña" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                <select value={nuevo.role} onChange={(e) => setNuevo({ ...nuevo, role: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
                  <option value="nacional">Nacional</option>
                  <option value="regional">Regional</option>
                  <option value="municipal">Municipal</option>
                </select>
                {nuevo.role !== "nacional" && (
                  <select value={nuevo.estado} onChange={(e) => setNuevo({ ...nuevo, estado: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Seleccione estado</option>
                    {estados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                )}
                {nuevo.role === "municipal" && (
                  <select value={nuevo.municipio} onChange={(e) => setNuevo({ ...nuevo, municipio: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Seleccione municipio</option>
                    {municipios.filter((m) => m.estado === nuevo.estado).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                )}
                <button type="submit" className="w-full rounded-lg bg-mep-purple py-2 text-sm font-semibold text-mep-yellow hover:bg-mep-purple-dark">Crear usuario</button>
              </form>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-3 font-semibold text-mep-purple">Usuarios del staff</h2>
              <div className="space-y-2">
                {staff.map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded border border-gray-100 p-2 text-sm">
                    <div>
                      <div className="font-medium">{u.nombre} {u.apellido}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                    <span className="rounded bg-mep-purple/10 px-2 py-0.5 text-xs font-medium capitalize text-mep-purple">{u.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal detalle de cargo de estructura */}
        {detalleEstructura && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetalleEstructura(null)}>
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setDetalleEstructura(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                aria-label="Cerrar"
              >
                ✕
              </button>
              <h2 className="mb-1 pr-8 text-lg font-bold text-mep-purple">
                {detalleEstructura.cargo} <span className="text-sm font-normal text-gray-400">· {detalleEstructura.nivel}</span>
              </h2>
              <p className="mb-4 text-xs text-gray-500">
                {detalleEstructura.nivel === "CPR" ? "Comando Político Regional" : "Comando Político Municipal"}
              </p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Nombre</dt><dd>{detalleEstructura.nombres} {detalleEstructura.apellidos}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">C.I.</dt><dd>{detalleEstructura.cedula || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Teléfono</dt><dd>{detalleEstructura.telefono || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Correo</dt><dd>{detalleEstructura.email || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Estado</dt><dd>{estadoDe(detalleEstructura.estado)}</dd></div>
                {detalleEstructura.nivel === "CPM" && <div className="flex justify-between"><dt className="text-gray-500">Municipio</dt><dd>{municipioDe(detalleEstructura.municipio || "")}</dd></div>}
                <div className="flex justify-between"><dt className="text-gray-500">Estatus</dt><dd className="capitalize">{detalleEstructura.estado_registro}</dd></div>
                {detalleEstructura.fecha_designacion && <div className="flex justify-between"><dt className="text-gray-500">Designación</dt><dd>{new Date(detalleEstructura.fecha_designacion).toLocaleDateString("es-VE")}</dd></div>}
              </dl>
              <div className="mt-4 flex justify-end gap-2">
                {detalleEstructura.estado_registro === "pendiente" ? (
                  <>
                    <button onClick={() => { rechazarEstructura(detalleEstructura); setDetalleEstructura(null); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Rechazar</button>
                    <button onClick={() => { aprobarEstructura(detalleEstructura); setDetalleEstructura(null); }} disabled={esExpirado(detalleEstructura.fecha_pendiente || detalleEstructura.created)} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50">Aprobar</button>
                  </>
                ) : (
                  <button onClick={() => setDetalleEstructura(null)} className="rounded-lg bg-mep-purple px-3 py-1.5 text-sm text-mep-yellow hover:bg-mep-purple-dark">Cerrar</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        active ? "bg-mep-purple text-mep-yellow" : "bg-white text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
