import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, militantHome } from "../lib/pocketbase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex items-center justify-center bg-mep-purple">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src="/logo.svg" alt="MEP" className="mx-auto mb-3 h-16" />
          <h1 className="text-2xl font-bold text-mep-purple">Militante MEP</h1>
          <p className="text-sm text-gray-500">Inicia sesión para continuar</p>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <label className="block text-sm font-medium text-gray-700">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mep-purple"
        />

        <label className="block text-sm font-medium text-gray-700">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 mb-5 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mep-purple"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-mep-purple py-2 font-semibold text-mep-yellow hover:bg-mep-purple-dark disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          ¿Eres militante y aún no tienes cuenta?{" "}
          <Link to="/registro" className="font-semibold text-mep-purple">Regístrate</Link>
        </p>
      </form>
    </div>
  );
}
