import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import PlanillaForm from "../components/PlanillaForm";
import { pb } from "../lib/pocketbase";
import { generarCodigo, planillaFields } from "../lib/planilla";

export default function Planilla() {
  const navigate = useNavigate();
  const [guardado, setGuardado] = useState<string | null>(null);

  async function onSubmit(data: Record<string, any>) {
    const me = pb.authStore.model as Record<string, any> | null;
    if (!me) throw new Error("No hay sesión activa");

    const esRecenso = Boolean(me.codigo);
    const codigo = me.codigo || generarCodigo(data.estadoCodigo, data.municipioCodigo);

    await pb.collection("militantes").update(me.id, {
      ...planillaFields(data),
      codigo,
      estado_registro: "pendiente",
      tipo_registro: esRecenso ? "recenso" : "inscripcion",
      responsable_registro: me.email,
      version_censo: (Number(me.version_censo) || 0) + 1,
      ultimo_recenso: new Date().toISOString().slice(0, 10),
      recenso_pendiente: false
    });

    setGuardado(codigo);
  }

  if (guardado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-mep-purple text-lg font-black text-mep-yellow">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-mep-purple">¡Inscripción enviada!</h1>
          <p className="mt-2 text-sm text-gray-600">Tu planilla quedó registrada y está pendiente de aprobación.</p>
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
      <div className="py-8">
        <PlanillaForm mode="self" onSubmit={onSubmit} />
      </div>
    </div>
  );
}
