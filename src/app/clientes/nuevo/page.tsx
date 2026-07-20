import { prisma } from "@/lib/prisma";
import { crearClienteAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function NuevoClientePage() {
  const localidades = await prisma.localidad.findMany({
    orderBy: [{ region: "asc" }, { nombre: "asc" }],
  });

  const regiones = new Map<string, typeof localidades>();
  for (const l of localidades) {
    if (!regiones.has(l.region)) regiones.set(l.region, []);
    regiones.get(l.region)!.push(l);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nueva consulta / nuevo cliente</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        Al guardar, el sistema geolocaliza la direccion cargada, la matchea con
        la localidad mas cercana y deriva automaticamente la consulta al
        distribuidor (o tecnico) que corresponda.
      </p>

      <form action={crearClienteAction} className="flex max-w-xl flex-col gap-4">
        <Field label="Nombre del cliente / negocio" name="nombre" required />
        <Field label="Telefono" name="telefono" />
        <Field label="Email" name="email" type="email" />
        <Field
          label="Direccion"
          name="direccion"
          placeholder="Calle, numero, localidad, provincia"
        />
        <Field label="Rubro" name="rubro" placeholder="Taller, pintureria, concesionaria..." />

        <label className="flex flex-col gap-1 text-sm">
          Localidad (opcional - si no se detecta automaticamente por la direccion)
          <select
            name="localidadId"
            defaultValue=""
            className="rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
          >
            <option value="">Detectar automaticamente por direccion</option>
            {[...regiones.entries()].map(([region, ls]) => (
              <optgroup key={region} label={region}>
                {ls.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

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
            rows={3}
            className="rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
          />
        </label>

        <Field
          label="Marca de interes (opcional)"
          name="marcaInteres"
          placeholder="PPG, 2K, 4K..."
        />

        <button
          type="submit"
          className="mt-2 w-fit rounded bg-black px-4 py-2 text-sm text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
        >
          Guardar y derivar
        </button>
      </form>
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
