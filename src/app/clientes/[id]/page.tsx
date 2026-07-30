import { prisma } from "@/lib/prisma";
import { registrarConsultaAction } from "@/app/actions";
import { notFound } from "next/navigation";

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      localidad: { include: { tecnico: true } },
      consultas: {
        orderBy: { createdAt: "desc" },
        include: { asignaciones: { include: { distribuidor: true, tecnico: true } } },
      },
    },
  });

  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{cliente.nombre}</h1>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-black/70 dark:text-white/70 sm:grid-cols-4">
          <Info label="Telefono" value={cliente.telefono} />
          <Info label="Email" value={cliente.email} />
          <Info label="Rubro" value={cliente.rubro} />
          <Info
            label="Localidad"
            value={cliente.localidad ? `${cliente.localidad.nombre} (${cliente.localidad.region})` : null}
          />
          <Info label="Direccion" value={cliente.direccion} />
          <Info label="Tecnico de zona" value={cliente.localidad?.tecnico?.nombre ?? null} />
          <Info label="Veces contactado" value={String(cliente.consultas.length)} />
        </dl>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Registrar nueva consulta</h2>
        <form
          action={registrarConsultaAction}
          className="flex max-w-xl flex-col gap-3 rounded border border-black/10 p-4 dark:border-white/10"
        >
          <input type="hidden" name="clienteId" value={cliente.id} />
          <label className="flex flex-col gap-1 text-sm">
            Canal de contacto
            <select
              name="canal"
              required
              defaultValue="LLAMADA"
              className="rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
            >
              <option value="LLAMADA">Llamada</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="FORMULARIO_WEB">Formulario web</option>
              <option value="OTRO">Otro</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Que consulto
            <textarea
              name="motivo"
              required
              rows={2}
              className="rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Marca de interes (opcional)
            <input
              name="marcaInteres"
              className="rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
            />
          </label>
          <button
            type="submit"
            className="w-fit rounded bg-black px-4 py-2 text-sm text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
          >
            Registrar y derivar
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">
          Historial de consultas ({cliente.consultas.length})
        </h2>
        <div className="flex flex-col gap-3">
          {cliente.consultas.map((consulta) => (
            <div
              key={consulta.id}
              className="rounded border border-black/10 p-3 text-sm dark:border-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{consulta.canal}</span>
                <span className="text-black/60 dark:text-white/60">
                  {consulta.createdAt.toLocaleString("es-AR")}
                </span>
              </div>
              <p className="mt-1">{consulta.motivo}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-black/5 px-2 py-1 dark:bg-white/10">
                  Estado: {consulta.estado}
                </span>
                <span className="rounded bg-black/5 px-2 py-1 dark:bg-white/10">
                  Metodo: {consulta.metodoAsignacion ?? "-"}
                </span>
              </div>
              {consulta.asignaciones.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-xs">
                  {consulta.asignaciones.map((a) => (
                    <li key={a.id}>
                      {a.tipo === "DISTRIBUIDOR" ? "Distribuidor" : "Tecnico"}:{" "}
                      <strong>{a.distribuidor?.nombre ?? a.tecnico?.nombre}</strong>{" "}
                      {a.notificado ? (
                        <span className="text-green-700 dark:text-green-400">
                          (email enviado)
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400">
                          (sin notificar{a.error ? `: ${a.error}` : ""})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {cliente.consultas.length === 0 && (
            <p className="text-sm text-black/50 dark:text-white/50">
              Todavia no hay consultas registradas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase text-black/40 dark:text-white/40">{label}</dt>
      <dd>{value ?? "-"}</dd>
    </div>
  );
}
