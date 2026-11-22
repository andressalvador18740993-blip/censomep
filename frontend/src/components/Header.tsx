import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getRole, logout, militantHome, pb } from "../lib/pocketbase";
import { ROLE_LABELS } from "../lib/roles";
import { Avatar, Icon, type IconName } from "./ui";

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

  const home = esMilitante ? militantHome() : "/dashboard";
  const esAprueba = role === "admin" || role === "nacional";

  const navItems: { path: string; label: string; icon: IconName; badge?: number }[] = [];
  if (!esMilitante) {
    navItems.push(
      { path: "/dashboard", label: "Dashboard", icon: "grid" },
      { path: "/estructura", label: "Estructura", icon: "network" },
      { path: "/admin", label: esAprueba ? "Panel" : "Registrar", icon: esAprueba ? "shield" : "userPlus", badge: esAprueba ? pendientes : 0 },
      ...(esAprueba ? [{ path: "/conexiones", label: "Conexiones", icon: "wifi" as IconName }] : [])
    );
  } else {
    navItems.push(
      { path: "/mi-carnet", label: "Mi carnet", icon: "idCard" },
      { path: "/planilla", label: "Mi planilla", icon: "fileText" }
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-gradient bg-brand-radial text-white shadow-soft no-print">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        {/* Marca */}
        <button onClick={() => navigate(home)} className="group flex items-center gap-2.5" title="Inicio">
          <span className="flex h-9 items-center justify-center rounded-xl bg-white px-2 shadow-sm transition group-hover:shadow-md">
            <img src="/logo.svg" alt="MEP" className="h-6 w-auto" />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-extrabold tracking-tight">Militante MEP</span>
            <span className="block text-[0.68rem] font-medium text-white/60">Censo y carnetización</span>
          </span>
        </button>

        {/* Navegación */}
        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto pb-0.5 sm:order-none sm:w-auto sm:pb-0">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`group inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[0.82rem] font-semibold transition ${
                  active ? "bg-white/15 text-mep-yellow shadow-inner" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon name={item.icon} className="h-4 w-4" />
                {item.label}
                {!!item.badge && item.badge > 0 && (
                  <span className="ml-0.5 rounded-full bg-mep-yellow px-1.5 py-px text-[0.65rem] font-extrabold leading-tight text-mep-purple-deep">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Usuario */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-white/10 py-1 pl-1 pr-2.5 ring-1 ring-inset ring-white/10">
            <Avatar nombre={nombre || model?.email} size="sm" />
            <div className="hidden leading-tight md:block">
              <p className="max-w-[13rem] truncate text-[0.8rem] font-semibold text-white">{nombre || model?.email}</p>
              <p className="text-[0.68rem] font-medium text-mep-yellow/90">
                {role ? ROLE_LABELS[role] : "Invitado"}
              </p>
            </div>
          </div>
          <button
            onClick={cerrar}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-2.5 py-2 text-[0.8rem] font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <Icon name="logout" className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
