import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function LocalidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sinCobertura?: string }>;
}) {
  const { q, sinCobertura } = await searchParams;

  const localidades = await prisma.localidad.findMany({
    where: q
      ? { nombre: { contains: q, mode: "insensitive" } }
      : undefined,
    orderBy: [{ region: "asc" }, { nombre: "asc" }],
    include: {
      tecnico: true,
      distribuidores: { include: { distribuidor: true } },
    },
  });

  const filtradas = sinCobertura
    ? localidades.filter((l) => l.distribuidores.length === 0)
    : localidades;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Localidades</h1>

      <form className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar localidad..."
          className="w-full max-w-sm rounded border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="sinCobertura"
            value="1"
            defaultChecked={!!sinCobertura}
          />
          Solo sin distribuidor asignado
        </label>
        <button className="rounded border border-black/15 px-3 py-2 text-sm dark:border-white/15">
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-black/5 text-left dark:bg-white/5">
            <tr>
              <th className="px-3 py-2">Localidad</th>
              <th className="px-3 py-2">Region</th>
              <th className="px-3 py-2">Tecnico</th>
              <th className="px-3 py-2">Distribuidores</th>
              <th className="px-3 py-2">Coordenadas</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => (
              <tr key={l.id} className="border-t border-black/10 dark:border-white/10">
                <td className="px-3 py-2">
                  <Link href={`/localidades/${l.id}`} className="hover:underline">
                    {l.nombre}
                  </Link>
                </td>
                <td className="px-3 py-2">{l.region}</td>
                <td className="px-3 py-2">{l.tecnico?.nombre ?? "-"}</td>
                <td className="px-3 py-2">
                  {l.distribuidores.length === 0 ? (
                    <span className="text-amber-700 dark:text-amber-400">sin asignar</span>
                  ) : (
                    l.distribuidores.map((d) => d.distribuidor.nombre).join(", ")
                  )}
                </td>
                <td className="px-3 py-2">
                  {l.lat != null && l.lng != null ? `${l.lat.toFixed(2)}, ${l.lng.toFixed(2)}` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
