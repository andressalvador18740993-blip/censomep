import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getRole, logout, pb } from "../lib/pocketbase";
import { ROLE_LABELS } from "../lib/roles";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const model = pb.authStore.model as Record<string, any> | null;
  const role = getRole();
  const esMilitante = role === "militante";
  const [pendientes, setPendientes] = useState(0);

  const nombre = [model?.nombres || model?.nombre, model?.apellidos || model?.apellido]
    .filter(Boolean)
    .join(" ")
    .trim();

  useEffect(() => {
    if (esMilitante) return;
    const cargar = () =>
      pb
        .collection("militantes")
        .getList(1, 1, { filter: 'estado_registro = "pendiente"' })
        .then((r) => setPendientes(r.totalItems))
        .catch(() => {});
    cargar();
    let unsub: (() => void) | null = null;
    pb.collection("militantes")
      .subscribe("*", () => cargar())
      .then((fn) => {
        unsub = fn;
      });
    return () => unsub?.();
  }, [esMilitante]);

  async function cerrar() {
    await logout();
    navigate("/login", { replace: true });
  }

  const home = esMilitante ? "/planilla" : "/dashboard";
  const navCls = (path: string) =>
    `rounded px-3 py-1.5 text-sm font-medium ${
      location.pathname === path ? "bg-white/25 text-mep-yellow" : "text-white hover:bg-white/15"
    }`;

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 bg-mep-purple px-4 py-2 text-white">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(home)}
          title="Inicio"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg hover:bg-white/25"
        >
          🏠
        </button>
        <img src="/logo.svg" alt="MEP" className="h-9" />
        <span className="text-sm font-semibold">Militante MEP</span>
      </div>

      {!esMilitante && (
        <nav className="flex items-center gap-1">
          <button className={navCls("/dashboard")} onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>
          {(role === "admin" || role === "nacional") && (
            <button className={navCls("/admin")} onClick={() => navigate("/admin")}>
              Panel admin
              {pendientes > 0 && (
                <span className="ml-1 rounded-full bg-mep-yellow px-1.5 text-xs font-bold text-mep-purple">
                  {pendientes}
                </span>
              )}
            </button>
          )}
          {(role === "admin" || role === "nacional") && (
            <button className={navCls("/conexiones")} onClick={() => navigate("/conexiones")}>
              Conexiones
            </button>
          )}
        </nav>
      )}

      <div className="flex items-center gap-3 text-sm">
        <span className="text-mep-yellow">
          {nombre || model?.email} {role ? `· ${ROLE_LABELS[role]}` : ""}
        </span>
        <button onClick={cerrar} className="rounded bg-white/20 px-3 py-1 hover:bg-white/30">
          Salir
        </button>
      </div>
    </header>
  );
}
