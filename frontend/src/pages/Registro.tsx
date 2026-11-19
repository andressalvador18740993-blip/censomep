import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registrarMilitante } from "../lib/pocketbase";

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
    <div className="min-h-screen flex items-center justify-center bg-mep-purple">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-mep-purple">Registro de militante</h1>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <input required placeholder="Nombres" value={form.nombres} onChange={(e) => set("nombres", e.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mep-purple" />
        <input required placeholder="Apellidos" value={form.apellidos} onChange={(e) => set("apellidos", e.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mep-purple" />
        <input required type="email" placeholder="Correo electrónico" value={form.email} onChange={(e) => set("email", e.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mep-purple" />
        <input required type="password" minLength={8} placeholder="Contraseña (mín. 8)" value={form.password} onChange={(e) => set("password", e.target.value)}
          className="mb-5 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mep-purple" />

        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-mep-purple py-2 font-semibold text-mep-yellow hover:bg-mep-purple-dark disabled:opacity-60">
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-mep-purple">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
