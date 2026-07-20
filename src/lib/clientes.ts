import { prisma } from "@/lib/prisma";
import { resolverLocalidadCliente } from "@/lib/geo/asignacion";
import { registrarConsulta } from "@/lib/consultas";
import type { CanalContacto } from "@/generated/prisma/client";

export type CrearClienteConConsultaInput = {
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  rubro?: string | null;
  localidadIdManual?: string | null;
  canal: CanalContacto;
  motivo: string;
  marcaInteres?: string | null;
};

/**
 * Alta de un cliente potencial nuevo junto con su primera consulta:
 * geolocaliza la direccion, la matchea a una Localidad conocida y deriva
 * la consulta al distribuidor/tecnico que corresponda.
 */
export async function crearClienteConConsulta(
  input: CrearClienteConConsultaInput,
) {
  const { localidad, geocode } = await resolverLocalidadCliente({
    direccion: input.direccion,
    localidadIdManual: input.localidadIdManual,
  });

  const cliente = await prisma.cliente.create({
    data: {
      nombre: input.nombre,
      telefono: input.telefono,
      email: input.email,
      direccion: input.direccion,
      rubro: input.rubro,
      localidadId: localidad?.id,
      lat: geocode?.lat,
      lng: geocode?.lng,
    },
  });

  const consulta = await registrarConsulta({
    clienteId: cliente.id,
    canal: input.canal,
    motivo: input.motivo,
    marcaInteres: input.marcaInteres,
    resuelto: { localidad, geocode },
  });

  return { cliente, consulta };
}
