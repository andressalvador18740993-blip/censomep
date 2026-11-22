import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, militantHome } from "../lib/pocketbase";
import { Icon } from "../components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const role = await login(email, password);
      navigate(role === "militante" ? militantHome() : "/dashboard", { replace: true });
    } catch {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-mep-purple-deep lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca */}
      <div className="relative hidden overflow-hidden bg-brand-gradient bg-brand-radial p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mep-yellow/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center rounded-2xl bg-white px-4 py-2 shadow-lg">
            <img src="/logo.svg" alt="MEP" className="h-9 w-auto" />
          </span>
        </div>
        <div className="relative max-w-md">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-mep-yellow ring-1 ring-inset ring-white/15">
            <Icon name="sparkle" className="h-3.5 w-3.5" /> Censo 2026
          </p>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
            Militante MEP
            <span className="mt-1 block text-lg font-medium text-white/70">
              Censo, re-censo y carnetización digital
            </span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Registra tu planilla, da seguimiento a tu estatus y descarga tu carnet de militante del Movimiento
            Electoral del Pueblo.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            {[
              "Planilla digital en 3 pasos",
              "Carnet con código único y QR",
              "Panel de control por estado y municipio"
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mep-yellow/20 text-mep-yellow">
                  <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs font-medium uppercase tracking-[0.2em] text-white/40">
          Liberación Nacional y Democracia Socialista
        </p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center bg-[#F5F3F7] p-6 sm:p-10">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8 text-center lg:hidden">
            <span className="mx-auto mb-4 inline-flex items-center rounded-2xl bg-white px-4 py-2 shadow-soft">
              <img src="/logo.svg" alt="MEP" className="h-8 w-auto" />
            </span>
            <h1 className="text-2xl font-extrabold text-mep-purple">Militante MEP</h1>
            <p className="text-sm text-gray-500">Censo y carnetización digital</p>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-7 shadow-card">
            <div className="mb-6">
              <h2 className="text-lg font-extrabold text-gray-900">Inicia sesión</h2>
              <p className="text-sm text-gray-500">Accede con tu correo y contraseña.</p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-600/10 animate-fade-in">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="field-label">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Icon name="mail" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="field-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="field-label">
                  Contraseña
                </label>
                <div className="relative">
                  <Icon name="lock" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={verClave ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="field-input pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setVerClave((v) => !v)}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                    aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <Icon name={verClave ? "eyeOff" : "eye"} className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-mep-purple font-semibold text-mep-yellow shadow-sm transition hover:bg-mep-purple-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mep-purple/25 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Entrando…
                  </>
                ) : (
                  <>
                    Entrar
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-gray-100 pt-5 text-center text-sm text-gray-500">
              ¿Eres militante y aún no tienes cuenta?{" "}
              <Link to="/registro" className="font-semibold text-mep-purple hover:underline">
                Regístrate
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            Movimiento Electoral del Pueblo · Secretaría de Organización
          </p>
        </div>
      </div>
    </div>
  );
}
