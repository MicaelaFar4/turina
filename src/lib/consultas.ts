import { prisma } from "@/lib/prisma";
import {
  resolverLocalidadCliente,
  resolverAsignacion,
  type ResolverLocalidadResultado,
} from "@/lib/geo/asignacion";
import { enviarEmail } from "@/lib/email";
import type { CanalContacto } from "@/generated/prisma/client";

export type RegistrarConsultaInput = {
  clienteId: string;
  canal: CanalContacto;
  motivo: string;
  marcaInteres?: string | null;
  /** Si ya se resolvio la localidad/geocode (p.ej. al crear el cliente), se reutiliza en vez de volver a geocodificar. */
  resuelto?: ResolverLocalidadResultado;
};

/**
 * Registra una nueva consulta para un cliente ya existente: vuelve a
 * resolver su localidad/asignacion (por si cambio de direccion o de
 * distribuidor asignado) y notifica por email a quien corresponda.
 */
export async function registrarConsulta(input: RegistrarConsultaInput) {
  const cliente = await prisma.cliente.findUniqueOrThrow({
    where: { id: input.clienteId },
  });

  const { localidad, geocode } =
    input.resuelto ??
    (await resolverLocalidadCliente({
      direccion: cliente.direccion,
      localidadIdManual: cliente.localidadId,
    }));

  if (localidad && localidad.id !== cliente.localidadId) {
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        localidadId: localidad.id,
        lat: geocode?.lat ?? cliente.lat,
        lng: geocode?.lng ?? cliente.lng,
      },
    });
  }

  const asignacion = await resolverAsignacion({
    localidad,
    geocode,
    marcaInteres: input.marcaInteres,
  });

  const estado =
    asignacion.distribuidores.length > 0 || asignacion.tecnico
      ? "ASIGNADA"
      : "SIN_COBERTURA";

  const consulta = await prisma.consulta.create({
    data: {
      clienteId: cliente.id,
      canal: input.canal,
      motivo: input.motivo,
      marcaInteres: input.marcaInteres,
      metodoAsignacion: asignacion.metodo,
      estado,
    },
  });

  const asignaciones = [];
  if (asignacion.distribuidores.length > 0) {
    for (const distribuidor of asignacion.distribuidores) {
      asignaciones.push({ tipo: "DISTRIBUIDOR" as const, distribuidor });
    }
  } else if (asignacion.tecnico) {
    asignaciones.push({ tipo: "TECNICO" as const, tecnico: asignacion.tecnico });
  }

  for (const a of asignaciones) {
    const destinatario = a.tipo === "DISTRIBUIDOR" ? a.distribuidor : a.tecnico;
    const email = destinatario.email;

    let notificado = false;
    let error: string | null = null;
    if (email) {
      const resultado = await enviarEmail({
        to: email,
        subject: `Nueva consulta derivada: ${cliente.nombre}`,
        html: consultaEmailHtml({ cliente, motivo: input.motivo, canal: input.canal }),
      });
      notificado = resultado.enviado;
      error = resultado.error ?? null;
    } else {
      error = "Sin email cargado para este destinatario";
    }

    await prisma.consultaAsignacion.create({
      data: {
        consultaId: consulta.id,
        tipo: a.tipo,
        distribuidorId: a.tipo === "DISTRIBUIDOR" ? a.distribuidor.id : null,
        tecnicoId: a.tipo === "TECNICO" ? a.tecnico.id : null,
        notificado,
        notificadoAt: notificado ? new Date() : null,
        error,
      },
    });
  }

  return prisma.consulta.findUniqueOrThrow({
    where: { id: consulta.id },
    include: {
      asignaciones: { include: { distribuidor: true, tecnico: true } },
      cliente: true,
    },
  });
}

function consultaEmailHtml(params: {
  cliente: { nombre: string; telefono: string | null; email: string | null; direccion: string | null };
  motivo: string;
  canal: string;
}): string {
  const { cliente, motivo, canal } = params;
  return `
    <h2>Nueva consulta derivada</h2>
    <p>Se te asigno una nueva consulta de un potencial cliente:</p>
    <ul>
      <li><strong>Cliente:</strong> ${escapeHtml(cliente.nombre)}</li>
      <li><strong>Telefono:</strong> ${escapeHtml(cliente.telefono ?? "-")}</li>
      <li><strong>Email:</strong> ${escapeHtml(cliente.email ?? "-")}</li>
      <li><strong>Direccion:</strong> ${escapeHtml(cliente.direccion ?? "-")}</li>
      <li><strong>Canal de contacto:</strong> ${escapeHtml(canal)}</li>
      <li><strong>Consulta:</strong> ${escapeHtml(motivo)}</li>
    </ul>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
