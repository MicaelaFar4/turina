import { prisma } from "@/lib/prisma";
import { actualizarTecnicoAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function TecnicosPage() {
  const tecnicos = await prisma.tecnico.findMany({
    orderBy: { numero: "asc" },
    include: { _count: { select: { localidades: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Tecnicos</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        Empleados que recorren talleres y pinturerias de su zona. Cargá el
        email de cada uno para que reciban la notificacion cuando una
        consulta caiga en una localidad sin distribuidor asignado.
      </p>

      <div className="flex flex-col gap-4">
        {tecnicos.map((t) => (
          <form
            key={t.id}
            action={actualizarTecnicoAction}
            className="flex flex-wrap items-end gap-3 rounded border border-black/10 p-4 dark:border-white/10"
          >
            <input type="hidden" name="id" value={t.id} />
            <div className="min-w-[180px]">
              <div className="font-medium">{t.nombre}</div>
              <div className="text-xs text-black/50 dark:text-white/50">
                Zona {t.zona} ({t._count.localidades} localidades)
              </div>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              Email
              <input
                type="email"
                name="email"
                defaultValue={t.email ?? ""}
                className="rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Telefono
              <input
                name="telefono"
                defaultValue={t.telefono ?? ""}
                className="rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
              />
            </label>
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
            >
              Guardar
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
