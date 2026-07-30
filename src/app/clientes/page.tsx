import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const clientes = await prisma.cliente.findMany({
    where: q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { telefono: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      localidad: true,
      _count: { select: { consultas: true } },
      consultas: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Link
          href="/clientes/nuevo"
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
        >
          + Nueva consulta
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, telefono o email..."
          className="w-full max-w-sm rounded border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black"
        />
        <button className="rounded border border-black/15 px-3 py-2 text-sm dark:border-white/15">
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-black/5 text-left dark:bg-white/5">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Localidad</th>
              <th className="px-3 py-2">Veces contactado</th>
              <th className="px-3 py-2">Ultimo contacto</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-t border-black/10 dark:border-white/10">
                <td className="px-3 py-2">
                  <Link href={`/clientes/${c.id}`} className="hover:underline">
                    {c.nombre}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {c.localidad ? `${c.localidad.nombre} (${c.localidad.region})` : "Sin localidad"}
                </td>
                <td className="px-3 py-2">{c._count.consultas}</td>
                <td className="px-3 py-2">
                  {c.consultas[0]?.createdAt.toLocaleDateString("es-AR") ?? "-"}
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-black/50 dark:text-white/50">
                  No se encontraron clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
