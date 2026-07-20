import { prisma } from "@/lib/prisma";
import {
  actualizarLocalidadAction,
  asignarDistribuidorALocalidadAction,
  quitarDistribuidorDeLocalidadAction,
} from "@/app/actions";
import { notFound } from "next/navigation";

export default async function LocalidadDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [localidad, distribuidores] = await Promise.all([
    prisma.localidad.findUnique({
      where: { id },
      include: {
        tecnico: true,
        distribuidores: { include: { distribuidor: true } },
      },
    }),
    prisma.distribuidor.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  if (!localidad) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{localidad.nombre}</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          {localidad.region} - Zona {localidad.zona ?? "-"} - Tecnico:{" "}
          {localidad.tecnico?.nombre ?? "sin asignar"}
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Coordenadas (para calculo de cercania)</h2>
        <form
          action={actualizarLocalidadAction}
          className="flex flex-wrap items-end gap-3 rounded border border-black/10 p-4 dark:border-white/10"
        >
          <input type="hidden" name="id" value={localidad.id} />
          <label className="flex flex-col gap-1 text-sm">
            Latitud
            <input
              name="lat"
              defaultValue={localidad.lat ?? ""}
              className="w-40 rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Longitud
            <input
              name="lng"
              defaultValue={localidad.lng ?? ""}
              className="w-40 rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
          >
            Guardar
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Distribuidores asignados</h2>
        <ul className="mb-4 flex flex-col gap-2 text-sm">
          {localidad.distribuidores.map((ld) => (
            <li key={ld.id} className="flex items-center justify-between rounded border border-black/10 px-3 py-2 dark:border-white/10">
              <span>
                {ld.distribuidor.nombre}
                {ld.marca ? ` - ${ld.marca}` : ""}
              </span>
              <form action={quitarDistribuidorDeLocalidadAction}>
                <input type="hidden" name="id" value={ld.id} />
                <input type="hidden" name="localidadId" value={localidad.id} />
                <button className="text-xs text-red-700 hover:underline dark:text-red-400">
                  Quitar
                </button>
              </form>
            </li>
          ))}
          {localidad.distribuidores.length === 0 && (
            <li className="text-black/50 dark:text-white/50">Sin distribuidores asignados.</li>
          )}
        </ul>

        <form
          action={asignarDistribuidorALocalidadAction}
          className="flex flex-wrap items-end gap-3 rounded border border-black/10 p-4 dark:border-white/10"
        >
          <input type="hidden" name="localidadId" value={localidad.id} />
          <label className="flex flex-col gap-1 text-sm">
            Distribuidor
            <select
              name="distribuidorId"
              required
              className="w-56 rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
            >
              {distribuidores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Marca (opcional)
            <input
              name="marca"
              className="w-40 rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
          >
            Asignar
          </button>
        </form>
      </div>
    </div>
  );
}
