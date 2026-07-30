import { prisma } from "@/lib/prisma";
import { crearDistribuidorAction } from "@/app/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DistribuidoresPage() {
  const distribuidores = await prisma.distribuidor.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { localidades: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Distribuidores</h1>

      <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-black/5 text-left dark:bg-white/5">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Marca</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Localidades</th>
              <th className="px-3 py-2">Activo</th>
            </tr>
          </thead>
          <tbody>
            {distribuidores.map((d) => (
              <tr key={d.id} className="border-t border-black/10 dark:border-white/10">
                <td className="px-3 py-2">
                  <Link href={`/distribuidores/${d.id}`} className="hover:underline">
                    {d.nombre}
                  </Link>
                </td>
                <td className="px-3 py-2">{d.marca ?? "-"}</td>
                <td className="px-3 py-2">
                  {d.email ?? <span className="text-amber-700 dark:text-amber-400">sin cargar</span>}
                </td>
                <td className="px-3 py-2">{d._count.localidades}</td>
                <td className="px-3 py-2">{d.activo ? "Si" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Nuevo distribuidor</h2>
        <form
          action={crearDistribuidorAction}
          className="flex max-w-lg flex-col gap-3 rounded border border-black/10 p-4 dark:border-white/10"
        >
          <Field label="Nombre" name="nombre" required />
          <Field label="Marca" name="marca" placeholder="PPG, 2K, 4K..." />
          <Field label="Email" name="email" type="email" />
          <Field label="Telefono" name="telefono" />
          <button
            type="submit"
            className="w-fit rounded bg-black px-4 py-2 text-sm text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
          >
            Crear
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
      />
    </label>
  );
}
