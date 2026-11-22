import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registrarMilitante } from "../lib/pocketbase";
import { Icon } from "../components/ui";

export default function Registro() {
  const [form, setForm] = useState({ nombres: "", apellidos: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registrarMilitante(form);
      navigate("/planilla", { replace: true });
    } catch (err: any) {
      setError(err?.response?.message || "No se pudo registrar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F3F7] bg-brand-radial p-6">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 inline-flex items-center rounded-2xl bg-white px-4 py-2 shadow-soft">
            <img src="/logo.svg" alt="MEP" className="h-8 w-auto" />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Crea tu cuenta</h1>
          <p className="text-sm text-gray-500">Completa tus datos para iniciar tu inscripción al MEP.</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-7 shadow-card">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-600/10">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nombres" className="field-label">
                  Nombres
                </label>
                <input
                  id="nombres"
                  required
                  autoComplete="given-name"
                  value={form.nombres}
                  onChange={(e) => set("nombres", e.target.value)}
                  placeholder="María José"
                  className="field-input"
                />
              </div>
              <div>
                <label htmlFor="apellidos" className="field-label">
                  Apellidos
                </label>
                <input
                  id="apellidos"
                  required
                  autoComplete="family-name"
                  value={form.apellidos}
                  onChange={(e) => set("apellidos", e.target.value)}
                  placeholder="Pérez Gómez"
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="correo" className="field-label">
                Correo electrónico
              </label>
              <div className="relative">
                <Icon name="mail" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="correo"
                  required
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="field-input pl-10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="clave" className="field-label">
                Contraseña
              </label>
              <div className="relative">
                <Icon name="lock" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="clave"
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="field-input pl-10"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">Usa una contraseña de al menos 8 caracteres.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-mep-purple font-semibold text-mep-yellow shadow-sm transition hover:bg-mep-purple-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mep-purple/25 disabled:opacity-60"
            >
              {loading ? "Creando cuenta…" : "Crear cuenta"}
              {!loading && <Icon name="arrowRight" className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-semibold text-mep-purple hover:underline">
              Inicia sesión
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">Al registrarte aceptas la declaración de militancia del MEP.</p>
      </div>
    </div>
  );
}
