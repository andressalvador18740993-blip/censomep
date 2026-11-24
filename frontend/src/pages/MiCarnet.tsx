import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { pb } from "../lib/pocketbase";
import { generarYGuardarCarnet } from "../lib/carnet";

export default function MiCarnet() {
  const me = pb.authStore.model as Record<string, any> | null;
  const [record, setRecord] = useState<Record<string, any> | null>(me);
  const [descargando, setDescargando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!me?.id) return;
    (async () => {
      try {
        const r = await pb.collection("militantes").getOne(me.id, { expand: "estado,municipio" });
        setRecord(r);

        // Si está aprobado pero aún no tiene PDF, se genera en el navegador.
        if (r.estado_registro === "aprobado" && !r.carnet_pdf && r.codigo) {
          setGenerando(true);
          await generarYGuardarCarnet(me.id, {
            nombres: r.nombres,
            apellidos: r.apellidos,
            cedula: r.cedula,
            codigo: r.codigo,
            estadoNombre: r.expand?.estado?.nombre || "",
            municipioNombre: r.expand?.municipio?.nombre || ""
          });
          await pb.collection("militantes").update(me.id, { carnet_generado: true, carnet_impreso: false });
          const r2 = await pb.collection("militantes").getOne(me.id, { expand: "estado,municipio" });
          setRecord(r2);
        }
      } catch {
        setError("No se pudo preparar tu carnet. Intenta recargar la página.");
      } finally {
        setGenerando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carnetUrl = record?.carnet_pdf
    ? pb.files.getUrl(record, record.carnet_pdf, { token: pb.authStore.token })
    : null;
  const estado = record?.expand?.estado?.nombre;
  const municipio = record?.expand?.municipio?.nombre;
  const yaImpreso = Boolean(record?.carnet_impreso);

  async function descargarCarnet() {
    if (!me?.id || !carnetUrl) return;
    setDescargando(true);
    try {
      await pb.collection("militantes").update(me.id, { carnet_impreso: true });
      window.open(carnetUrl, "_blank");
      setRecord((r) => (r ? { ...r, carnet_impreso: true } : r));
    } catch {
      /* ignore */
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <Header />
      <div className="mx-auto max-w-md px-4 py-6 pb-safe sm:p-6">
        <h1 className="mb-4 text-xl font-bold text-mep-purple">Mi carnet</h1>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow">
          {generando && (
            <p className="mb-3 rounded-lg bg-mep-purple/10 p-3 text-sm font-medium text-mep-purple">
              Generando tu carnet…
            </p>
          )}
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          )}
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-mep-purple text-xl font-black text-mep-yellow">
            MEP
          </div>

          {record?.codigo ? (
            <>
              <p className="text-sm text-gray-500">N° de militante</p>
              <p className="mb-4 font-mono text-lg font-bold text-mep-purple">{record.codigo}</p>
            </>
          ) : (
            <p className="mb-4 text-sm text-gray-500">Aún no tienes código asignado.</p>
          )}

          <div className="mb-4 space-y-1 text-sm text-gray-700">
            <p><span className="font-medium">Nombre:</span> {record?.nombres} {record?.apellidos}</p>
            {record?.cedula && <p><span className="font-medium">C.I.:</span> {record.cedula}</p>}
            {estado && <p><span className="font-medium">Seccional:</span> {estado}</p>}
            {municipio && <p><span className="font-medium">Municipio:</span> {municipio}</p>}
          </div>

          <div className="mb-4">
            <span className={`rounded px-3 py-1 text-sm font-medium capitalize ${
              record?.estado_registro === "aprobado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}>
              {record?.estado_registro || "borrador"}
            </span>
          </div>

          {record?.estado_registro !== "aprobado" && (
            <p className="mb-4 text-xs text-gray-500">
              Tu inscripción está pendiente de aprobación. Cuando sea aprobada podrás ver y descargar tu carnet aquí.
            </p>
          )}

          {carnetUrl && !yaImpreso && (
            <>
              <iframe
                src={carnetUrl}
                title="Carnet"
                className="mb-3 h-[65dvh] w-full rounded border border-gray-200 bg-white sm:h-96"
              />
              <button
                onClick={descargarCarnet}
                disabled={descargando}
                className="mb-2 block w-full rounded-lg bg-mep-purple py-2 text-sm font-semibold text-mep-yellow hover:bg-mep-purple-dark disabled:opacity-60"
              >
                {descargando ? "Preparando..." : "Descargar / Imprimir carnet (PDF)"}
              </button>
              <p className="mb-2 text-xs text-gray-400">Solo puedes descargarlo una vez.</p>
            </>
          )}

          {carnetUrl && yaImpreso && (
            <p className="mb-3 rounded-lg bg-gray-100 p-3 text-sm text-gray-600">
              Ya descargaste tu carnet. Si necesitas imprimirlo nuevamente, solicita una reimpresión al administrador o a un usuario nacional.
            </p>
          )}

          <Link
            to="/planilla"
            className="block w-full rounded-lg border border-mep-purple py-2 text-sm font-semibold text-mep-purple hover:bg-mep-purple/5"
          >
            Actualizar mi planilla (re-censo)
          </Link>
        </div>
      </div>
    </div>
  );
}
