import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { pb } from "../lib/pocketbase";
import type { Estado, Municipio } from "../lib/types";

const SEXO = ["Masculino", "Femenino", "Otro"];
const ESTADO_CIVIL = ["Soltero(a)", "Casado(a)", "Divorciado(a)", "Viudo(a)", "Unión libre"];
const NIVEL_INSTRUCCION = ["Ninguno", "Primaria", "Secundaria", "Técnico Medio", "Universitario", "Postgrado"];
const SECTOR_ACTIVA = ["Juventud", "Mujer", "Profesionales y Técnicos", "Sindical", "Educador"];

const DECLARACION =
  '"Por medio del presente documento, manifiesto mi voluntad de militar en las filas del Partido Movimiento Electoral Del Pueblo, y de mi compromiso de dedicar tiempo a las actividades propias de esta organización política y el esfuerzo necesario para su fortalecimiento, así como del proceso revolucionario".';

type FormState = Record<string, string>;

const INITIAL: FormState = {
  nombres: "",
  apellidos: "",
  cedula: "",
  sexo: "",
  lugar_nacimiento: "",
  fecha_nacimiento: "",
  estado_civil: "",
  profesion: "",
  oficio: "",
  estado: "",
  municipio: "",
  parroquia: "",
  sector: "",
  direccion: "",
  punto_referencia: "",
  telefono: "",
  facebook: "",
  instagram: "",
  trabajo: "",
  nombre_empresa: "",
  nivel_instruccion: "",
  area: "",
  especializacion: "",
  sector_activa: "",
  centro_votacion: "",
  codigo_centro: "",
  mesa: "",
  aporte_voluntario: ""
};

function generarCodigo(estadoCodigo: string, municipioCodigo: string): string {
  const random = String(Math.floor(100000 + Math.random() * 900000));
  return `${estadoCodigo}-${municipioCodigo}-${random}-MEP`;
}

function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mep-purple";

export default function Planilla() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [acepto, setAcepto] = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState<string | null>(null);

  const me = pb.authStore.model as Record<string, any> | null;
  const email = me?.email ?? "";

  useEffect(() => {
    pb.collection("estados")
      .getFullList<Estado>({ sort: "nombre" })
      .then(setEstados)
      .catch(() => setEstados([]));
  }, []);

  useEffect(() => {
    if (!me) return;
    setForm((f) => ({
      ...f,
      nombres: me.nombres ?? f.nombres,
      apellidos: me.apellidos ?? f.apellidos,
      cedula: me.cedula ?? "",
      sexo: me.sexo ?? "",
      lugar_nacimiento: me.lugar_nacimiento ?? "",
      fecha_nacimiento: me.fecha_nacimiento ?? "",
      estado_civil: me.estado_civil ?? "",
      profesion: me.profesion ?? "",
      oficio: me.oficio ?? "",
      estado: me.estado ?? "",
      municipio: me.municipio ?? "",
      parroquia: me.parroquia ?? "",
      sector: me.sector ?? "",
      direccion: me.direccion ?? "",
      punto_referencia: me.punto_referencia ?? "",
      telefono: me.telefono ?? "",
      facebook: me.facebook ?? "",
      instagram: me.instagram ?? "",
      trabajo: me.trabajo ? "si" : me.trabajo === false ? "no" : "",
      nombre_empresa: me.nombre_empresa ?? "",
      nivel_instruccion: me.nivel_instruccion ?? "",
      area: me.area ?? "",
      especializacion: me.especializacion ?? "",
      sector_activa: me.sector_activa ?? "",
      centro_votacion: me.centro_votacion ?? "",
      codigo_centro: me.codigo_centro ?? "",
      mesa: me.mesa ?? "",
      aporte_voluntario: me.aporte_voluntario ?? ""
    }));
    if (me.acepto_declaracion) setAcepto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!form.estado) {
      setMunicipios([]);
      return;
    }
    pb.collection("municipios")
      .getFullList<Municipio>({ filter: `estado = "${form.estado}"`, sort: "nombre" })
      .then(setMunicipios)
      .catch(() => setMunicipios([]));
  }, [form.estado]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setEstado(value: string) {
    setForm((f) => ({ ...f, estado: value, municipio: "" }));
  }

  function validarPaso(): string {
    if (paso === 1) {
      if (!form.nombres || !form.apellidos || !form.cedula || !form.sexo || !form.fecha_nacimiento)
        return "Completa los campos obligatorios (nombres, apellidos, C.I., sexo y fecha de nacimiento).";
    }
    if (paso === 2) {
      if (!form.estado || !form.municipio || !form.parroquia || !form.direccion || !form.telefono)
        return "Completa los campos obligatorios (Seccional, Municipio, Parroquia, Residencia y Teléfono).";
    }
    if (paso === 3 && !acepto)
      return "Debes aceptar la declaración para enviar tu inscripción.";
    return "";
  }

  function siguiente() {
    const err = validarPaso();
    if (err) return setError(err);
    setError("");
    setPaso((p) => Math.min(3, p + 1));
  }

  async function enviar() {
    const err = validarPaso();
    if (err) return setError(err);
    setError("");
    setLoading(true);
    try {
      if (!me) throw new Error("No hay sesión activa");

      const estadoObj = estados.find((e) => e.id === form.estado);
      const municipioObj = municipios.find((m) => m.id === form.municipio);
      const esRecenso = Boolean(me.codigo);

      const codigo =
        me.codigo ||
        generarCodigo(estadoObj?.codigo ?? "MEP", municipioObj?.codigo ?? "000");

      const payload: Record<string, any> = {
        ...form,
        trabajo: form.trabajo === "si",
        acepto_declaracion: true,
        estado: form.estado || null,
        municipio: form.municipio || null,
        codigo,
        estado_registro: "pendiente",
        tipo_registro: esRecenso ? "recenso" : "inscripcion",
        responsable_registro: email,
        version_censo: (Number(me.version_censo) || 0) + 1,
        ultimo_recenso: new Date().toISOString().slice(0, 10),
        recenso_pendiente: false
      };

      await pb.collection("militantes").update(me.id, payload);
      setGuardado(codigo);
    } catch (e: any) {
      setError(e?.message || "No se pudo enviar la planilla.");
    } finally {
      setLoading(false);
    }
  }

  if (guardado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-mep-purple text-lg font-black text-mep-yellow">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-mep-purple">¡Inscripción enviada!</h1>
          <p className="mt-2 text-sm text-gray-600">
            Tu planilla quedó registrada y está pendiente de aprobación.
          </p>
          <p className="mt-3 rounded-lg bg-gray-100 py-2 font-mono text-sm text-gray-700">N° {guardado}</p>
          <button
            onClick={() => navigate("/mi-carnet")}
            className="mt-4 w-full rounded-lg bg-mep-purple py-2 font-semibold text-mep-yellow hover:bg-mep-purple-dark"
          >
            Ir a mi carnet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header />
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 border-b border-mep-purple pb-3">
          <h1 className="text-xl font-bold text-mep-purple">Registro de Militante</h1>
          <p className="text-xs text-gray-500">
            Comando Político Nacional — Secretaría de Organización
          </p>
        </div>

        {/* Indicador de pasos */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  paso >= n ? "bg-mep-purple text-mep-yellow" : "bg-gray-200 text-gray-500"
                }`}
              >
                {n}
              </div>
              <div className={`h-1 flex-1 rounded ${paso > n ? "bg-mep-purple" : "bg-gray-200"}`} />
            </div>
          ))}
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        {paso === 1 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombres" required>
              <input className={inputCls} value={form.nombres} onChange={(e) => set("nombres", e.target.value)} />
            </Field>
            <Field label="Apellidos" required>
              <input className={inputCls} value={form.apellidos} onChange={(e) => set("apellidos", e.target.value)} />
            </Field>
            <Field label="C.I." required>
              <input className={inputCls} value={form.cedula} onChange={(e) => set("cedula", e.target.value)} />
            </Field>
            <Field label="Sexo" required>
              <select className={inputCls} value={form.sexo} onChange={(e) => set("sexo", e.target.value)}>
                <option value="">Seleccione</option>
                {SEXO.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Lugar de nacimiento">
              <input className={inputCls} value={form.lugar_nacimiento} onChange={(e) => set("lugar_nacimiento", e.target.value)} />
            </Field>
            <Field label="Fecha de nacimiento" required>
              <input type="date" className={inputCls} value={form.fecha_nacimiento} onChange={(e) => set("fecha_nacimiento", e.target.value)} />
            </Field>
            <Field label="Estado civil">
              <select className={inputCls} value={form.estado_civil} onChange={(e) => set("estado_civil", e.target.value)}>
                <option value="">Seleccione</option>
                {ESTADO_CIVIL.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Profesión">
              <input className={inputCls} value={form.profesion} onChange={(e) => set("profesion", e.target.value)} />
            </Field>
            <Field label="Oficio">
              <input className={inputCls} value={form.oficio} onChange={(e) => set("oficio", e.target.value)} />
            </Field>
          </div>
        )}

        {paso === 2 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Seccional (Estado)" required>
              <select className={inputCls} value={form.estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Seleccione estado</option>
                {estados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
            <Field label="Municipio" required>
              <select className={inputCls} value={form.municipio} disabled={!form.estado} onChange={(e) => set("municipio", e.target.value)}>
                <option value="">{form.estado ? "Seleccione municipio" : "Primero elige estado"}</option>
                {municipios.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </Field>
            <Field label="Parroquia" required>
              <input className={inputCls} value={form.parroquia} onChange={(e) => set("parroquia", e.target.value)} />
            </Field>
            <Field label="Sector">
              <input className={inputCls} value={form.sector} onChange={(e) => set("sector", e.target.value)} />
            </Field>
            <Field label="Residencia (dirección)" required>
              <input className={inputCls} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />
            </Field>
            <Field label="Punto de referencia">
              <input className={inputCls} value={form.punto_referencia} onChange={(e) => set("punto_referencia", e.target.value)} />
            </Field>
            <Field label="Teléfono" required>
              <input className={inputCls} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
            </Field>
            <Field label="E-mail">
              <input className={`${inputCls} bg-gray-100`} value={email} disabled />
            </Field>
            <Field label="Facebook">
              <input className={inputCls} value={form.facebook} onChange={(e) => set("facebook", e.target.value)} />
            </Field>
            <Field label="Instagram">
              <input className={inputCls} value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
            </Field>
            <Field label="¿Trabaja?" required>
              <select className={inputCls} value={form.trabajo} onChange={(e) => set("trabajo", e.target.value)}>
                <option value="">Seleccione</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </Field>
            {form.trabajo === "si" && (
              <Field label="Nombre de la empresa">
                <input className={inputCls} value={form.nombre_empresa} onChange={(e) => set("nombre_empresa", e.target.value)} />
              </Field>
            )}
            <Field label="Nivel de instrucción">
              <select className={inputCls} value={form.nivel_instruccion} onChange={(e) => set("nivel_instruccion", e.target.value)}>
                <option value="">Seleccione</option>
                {NIVEL_INSTRUCCION.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Área">
              <input className={inputCls} value={form.area} onChange={(e) => set("area", e.target.value)} />
            </Field>
            <Field label="Especialización">
              <input className={inputCls} value={form.especializacion} onChange={(e) => set("especializacion", e.target.value)} />
            </Field>
            <Field label="Sector donde activa">
              <select className={inputCls} value={form.sector_activa} onChange={(e) => set("sector_activa", e.target.value)}>
                <option value="">Seleccione</option>
                {SECTOR_ACTIVA.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Centro de votación">
              <input className={inputCls} value={form.centro_votacion} onChange={(e) => set("centro_votacion", e.target.value)} />
            </Field>
            <Field label="Código (centro de votación)">
              <input className={inputCls} value={form.codigo_centro} onChange={(e) => set("codigo_centro", e.target.value)} />
            </Field>
            <Field label="Mesa">
              <input className={inputCls} value={form.mesa} onChange={(e) => set("mesa", e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Aporte voluntario al Partido (conocimiento, bien o servicio)">
                <input className={inputCls} value={form.aporte_voluntario} onChange={(e) => set("aporte_voluntario", e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div>
            <div className="rounded-lg bg-mep-purple/5 p-4 text-sm italic text-gray-700">
              {DECLARACION}
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={acepto}
                onChange={(e) => setAcepto(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-mep-purple"
              />
              <span>
                Acepto y manifiesto mi voluntad de militar en el MEP, dedicando tiempo a las
                actividades de la organización política.
              </span>
            </label>
            <p className="mt-4 text-xs text-gray-500">
              Fecha de registro: {new Date().toLocaleDateString("es-VE")} · Responsable del
              registro: {email}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => setPaso((p) => Math.max(1, p - 1))}
            disabled={paso === 1}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 disabled:opacity-40"
          >
            Atrás
          </button>
          {paso < 3 ? (
            <button
              type="button"
              onClick={siguiente}
              className="rounded-lg bg-mep-purple px-5 py-2 text-sm font-semibold text-mep-yellow hover:bg-mep-purple-dark"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={enviar}
              disabled={loading}
              className="rounded-lg bg-mep-purple px-5 py-2 text-sm font-semibold text-mep-yellow hover:bg-mep-purple-dark disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar inscripción"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
