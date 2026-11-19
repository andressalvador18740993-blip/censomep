import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { pb } from "../lib/pocketbase";

export default function MiCarnet() {
  const me = pb.authStore.model as Record<string, any> | null;
  const [record, setRecord] = useState<Record<string, any> | null>(me);

  useEffect(() => {
    if (me?.id) {
      pb.collection("militantes")
        .getOne(me.id, { expand: "estado,municipio" })
        .then((r) => setRecord(r as Record<string, any>))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carnetUrl = record?.carnet_pdf
    ? pb.files.getUrl(record, record.carnet_pdf, { token: pb.authStore.token })
    : null;
  const estado = record?.expand?.estado?.nombre;
  const municipio = record?.expand?.municipio?.nombre;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-4 text-xl font-bold text-mep-purple">Mi carnet</h1>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow">
          <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-mep-purple flex items-center justify-center text-mep-yellow font-black text-xl">
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
              Tu inscripción está pendiente de aprobación. Recibirás tu carnet por correo al ser aprobado.
            </p>
          )}

          {carnetUrl && (
            <>
              <iframe
                src={carnetUrl}
                title="Carnet"
                className="mb-3 h-96 w-full rounded border border-gray-200 bg-white"
              />
              <a
                href={carnetUrl}
                target="_blank"
                rel="noreferrer"
                className="mb-2 block w-full rounded-lg bg-mep-purple py-2 text-sm font-semibold text-mep-yellow hover:bg-mep-purple-dark"
              >
                Descargar carnet (PDF)
              </a>
            </>
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
