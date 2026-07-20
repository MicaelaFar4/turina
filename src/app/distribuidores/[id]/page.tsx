import { prisma } from "@/lib/prisma";
import { actualizarDistribuidorAction } from "@/app/actions";
import { notFound } from "next/navigation";

export default async function DistribuidorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const distribuidor = await prisma.distribuidor.findUnique({
    where: { id },
    include: { localidades: { include: { localidad: true } } },
  });

  if (!distribuidor) notFound();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{distribuidor.nombre}</h1>

      <form
        action={actualizarDistribuidorAction}
        className="flex max-w-lg flex-col gap-3 rounded border border-black/10 p-4 dark:border-white/10"
      >
        <input type="hidden" name="id" value={distribuidor.id} />
        <Field label="Nombre" name="nombre" defaultValue={distribuidor.nombre} required />
        <Field label="Marca" name="marca" defaultValue={distribuidor.marca ?? ""} />
        <Field label="Email" name="email" type="email" defaultValue={distribuidor.email ?? ""} />
        <Field label="Telefono" name="telefono" defaultValue={distribuidor.telefono ?? ""} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="activo" defaultChecked={distribuidor.activo} />
          Activo
        </label>
        <button
          type="submit"
          className="w-fit rounded bg-black px-4 py-2 text-sm text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
        >
          Guardar
        </button>
      </form>

      <div>
        <h2 className="mb-2 text-lg font-medium">
          Localidades asignadas ({distribuidor.localidades.length})
        </h2>
        <ul className="flex flex-col gap-1 text-sm">
          {distribuidor.localidades.map((ld) => (
            <li key={ld.id}>
              {ld.localidad.nombre} ({ld.localidad.region})
              {ld.marca ? ` - ${ld.marca}` : ""}
            </li>
          ))}
          {distribuidor.localidades.length === 0 && (
            <li className="text-black/50 dark:text-white/50">
              Sin localidades asignadas todavia.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
      />
    </label>
  );
}
