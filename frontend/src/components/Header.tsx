import { useNavigate } from "react-router-dom";
import { getRole, logout, pb } from "../lib/pocketbase";
import { ROLE_LABELS } from "../lib/roles";

export default function Header() {
  const navigate = useNavigate();
  const model = pb.authStore.model as Record<string, any> | null;
  const role = getRole();
  const nombre = [model?.nombres || model?.nombre, model?.apellidos || model?.apellido]
    .filter(Boolean)
    .join(" ")
    .trim();

  async function cerrar() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex items-center justify-between bg-mep-purple px-4 py-2 text-white">
      <div className="flex items-center gap-3">
        <img src="/logo.svg" alt="MEP" className="h-9" />
        <span className="text-sm font-semibold">Militante MEP</span>
      </div>
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
