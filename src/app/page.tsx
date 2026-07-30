import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [clientes, consultasNuevas, sinCobertura, distribuidores, tecnicos] =
    await Promise.all([
      prisma.cliente.count(),
      prisma.consulta.count({ where: { estado: "NUEVA" } }),
      prisma.consulta.count({ where: { estado: "SIN_COBERTURA" } }),
      prisma.distribuidor.count({ where: { activo: true } }),
      prisma.tecnico.count({ where: { activo: true } }),
    ]);

  const ultimasConsultas = await prisma.consulta.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      cliente: true,
      asignaciones: { include: { distribuidor: true, tecnico: true } },
    },
  });

  const stats = [
    { label: "Clientes potenciales", value: clientes },
    { label: "Consultas sin gestionar", value: consultasNuevas },
    { label: "Consultas sin cobertura", value: sinCobertura },
    { label: "Distribuidores activos", value: distribuidores },
    { label: "Tecnicos activos", value: tecnicos },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link
          href="/clientes/nuevo"
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
        >
          + Nueva consulta
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded border border-black/10 p-4 dark:border-white/10"
          >
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-sm text-black/60 dark:text-white/60">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Ultimas consultas</h2>
        <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-black/5 text-left dark:bg-white/5">
              <tr>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Canal</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Asignado a</th>
                <th className="px-3 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {ultimasConsultas.map((c) => (
                <tr key={c.id} className="border-t border-black/10 dark:border-white/10">
                  <td className="px-3 py-2">
                    <Link href={`/clientes/${c.clienteId}`} className="hover:underline">
                      {c.cliente.nombre}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{c.canal}</td>
                  <td className="px-3 py-2">{c.estado}</td>
                  <td className="px-3 py-2">
                    {c.asignaciones.length === 0
                      ? "-"
                      : c.asignaciones
                          .map((a) => a.distribuidor?.nombre ?? a.tecnico?.nombre)
                          .join(", ")}
                  </td>
                  <td className="px-3 py-2">
                    {c.createdAt.toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))}
              {ultimasConsultas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-black/50 dark:text-white/50">
                    Todavia no hay consultas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
