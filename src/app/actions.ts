"use server";

import { prisma } from "@/lib/prisma";
import { crearClienteConConsulta } from "@/lib/clientes";
import { registrarConsulta } from "@/lib/consultas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CanalContacto } from "@/generated/prisma/client";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function crearClienteAction(formData: FormData) {
  const nombre = str(formData, "nombre");
  const canal = str(formData, "canal") as CanalContacto | null;
  const motivo = str(formData, "motivo");
  if (!nombre || !canal || !motivo) {
    throw new Error("Nombre, canal y motivo son obligatorios");
  }

  const { cliente } = await crearClienteConConsulta({
    nombre,
    telefono: str(formData, "telefono"),
    email: str(formData, "email"),
    direccion: str(formData, "direccion"),
    rubro: str(formData, "rubro"),
    localidadIdManual: str(formData, "localidadId"),
    canal,
    motivo,
    marcaInteres: str(formData, "marcaInteres"),
  });

  revalidatePath("/clientes");
  redirect(`/clientes/${cliente.id}`);
}

export async function registrarConsultaAction(formData: FormData) {
  const clienteId = str(formData, "clienteId");
  const canal = str(formData, "canal") as CanalContacto | null;
  const motivo = str(formData, "motivo");
  if (!clienteId || !canal || !motivo) {
    throw new Error("Canal y motivo son obligatorios");
  }

  await registrarConsulta({
    clienteId,
    canal,
    motivo,
    marcaInteres: str(formData, "marcaInteres"),
  });

  revalidatePath(`/clientes/${clienteId}`);
  redirect(`/clientes/${clienteId}`);
}

export async function crearDistribuidorAction(formData: FormData) {
  const nombre = str(formData, "nombre");
  if (!nombre) throw new Error("El nombre es obligatorio");

  await prisma.distribuidor.create({
    data: {
      nombre,
      marca: str(formData, "marca"),
      email: str(formData, "email"),
      telefono: str(formData, "telefono"),
    },
  });

  revalidatePath("/distribuidores");
  redirect("/distribuidores");
}

export async function actualizarDistribuidorAction(formData: FormData) {
  const id = str(formData, "id");
  if (!id) throw new Error("Falta el id del distribuidor");

  await prisma.distribuidor.update({
    where: { id },
    data: {
      nombre: str(formData, "nombre") ?? undefined,
      marca: str(formData, "marca"),
      email: str(formData, "email"),
      telefono: str(formData, "telefono"),
      activo: formData.get("activo") === "on",
    },
  });

  revalidatePath("/distribuidores");
  revalidatePath(`/distribuidores/${id}`);
  redirect("/distribuidores");
}

export async function actualizarTecnicoAction(formData: FormData) {
  const id = str(formData, "id");
  if (!id) throw new Error("Falta el id del tecnico");

  await prisma.tecnico.update({
    where: { id },
    data: {
      email: str(formData, "email"),
      telefono: str(formData, "telefono"),
    },
  });

  revalidatePath("/tecnicos");
}

export async function actualizarLocalidadAction(formData: FormData) {
  const id = str(formData, "id");
  if (!id) throw new Error("Falta el id de la localidad");

  const latStr = str(formData, "lat");
  const lngStr = str(formData, "lng");

  await prisma.localidad.update({
    where: { id },
    data: {
      lat: latStr ? parseFloat(latStr) : null,
      lng: lngStr ? parseFloat(lngStr) : null,
      geocodedAt: latStr && lngStr ? new Date() : null,
    },
  });

  revalidatePath(`/localidades/${id}`);
  revalidatePath("/localidades");
}

export async function asignarDistribuidorALocalidadAction(formData: FormData) {
  const localidadId = str(formData, "localidadId");
  const distribuidorId = str(formData, "distribuidorId");
  const marca = str(formData, "marca");
  if (!localidadId || !distribuidorId) {
    throw new Error("Falta localidad o distribuidor");
  }

  await prisma.localidadDistribuidor.upsert({
    where: {
      localidadId_distribuidorId_marca: {
        localidadId,
        distribuidorId,
        marca: marca ?? "",
      },
    },
    update: {},
    create: { localidadId, distribuidorId, marca },
  });

  revalidatePath(`/localidades/${localidadId}`);
}

export async function quitarDistribuidorDeLocalidadAction(formData: FormData) {
  const id = str(formData, "id");
  const localidadId = str(formData, "localidadId");
  if (!id) throw new Error("Falta el id de la asignacion");

  await prisma.localidadDistribuidor.delete({ where: { id } });

  if (localidadId) revalidatePath(`/localidades/${localidadId}`);
}
