import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getRole, isAuthenticated } from "./lib/pocketbase";
import type { Role } from "./lib/types";

import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Planilla from "./pages/Planilla";
import MiCarnet from "./pages/MiCarnet";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Conexiones from "./pages/Conexiones";

/** Protege una ruta exigiendo autenticación y (opcionalmente) roles permitidos. */
function RequireAuth({ allowed, children }: { allowed?: Role[]; children: ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const role = getRole();
  if (allowed && role && !allowed.includes(role)) {
    // redirigir según rol
    return <Navigate to={role === "militante" ? "/planilla" : "/dashboard"} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />

      <Route path="/planilla" element={<RequireAuth allowed={["militante"]}><Planilla /></RequireAuth>} />
      <Route path="/mi-carnet" element={<RequireAuth allowed={["militante"]}><MiCarnet /></RequireAuth>} />

      <Route path="/dashboard" element={<RequireAuth allowed={["admin", "nacional", "regional", "municipal"]}><Dashboard /></RequireAuth>} />
      <Route path="/conexiones" element={<RequireAuth allowed={["admin", "nacional"]}><Conexiones /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth allowed={["admin", "nacional"]}><Admin /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
