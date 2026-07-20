import { prisma } from "@/lib/prisma";
import { normalizeNombre } from "./normalize";
import { haversineKm } from "./haversine";
import { geocodeAddress, type GeocodeResult } from "./geocode";
import type {
  Distribuidor,
  Localidad,
  MetodoAsignacion,
  Tecnico,
} from "@/generated/prisma/client";

// Si la localidad asignada por cercania esta a mas de esta distancia,
// se considera que no hay cobertura real en vez de derivar a algo remoto.
const MAX_DISTANCIA_COBERTURA_KM = 400;

export type ResolverLocalidadInput = {
  direccion?: string | null;
  localidadIdManual?: string | null;
};

export type ResolverLocalidadResultado = {
  localidad: Localidad | null;
  geocode: GeocodeResult | null;
};

/** Busca una Localidad por nombre normalizado (sin acentos, minusculas). */
export async function matchLocalidadPorNombre(
  nombre: string,
): Promise<Localidad | null> {
  const target = normalizeNombre(nombre);
  const candidatas = await prisma.localidad.findMany();
  return (
    candidatas.find((l) => normalizeNombre(l.nombre) === target) ?? null
  );
}

/**
 * Resuelve la Localidad de un cliente a partir de una seleccion manual
 * (prioritaria) o de la geocodificacion de su direccion de texto libre.
 */
export async function resolverLocalidadCliente(
  input: ResolverLocalidadInput,
): Promise<ResolverLocalidadResultado> {
  if (input.localidadIdManual) {
    const localidad = await prisma.localidad.findUnique({
      where: { id: input.localidadIdManual },
    });
    if (localidad) return { localidad, geocode: null };
  }

  if (input.direccion) {
    const geocode = await geocodeAddress(input.direccion);
    if (geocode?.localidad) {
      const localidad = await matchLocalidadPorNombre(geocode.localidad);
      if (localidad) return { localidad, geocode };
    }
    return { localidad: null, geocode };
  }

  return { localidad: null, geocode: null };
}

export type ResolverAsignacionInput = {
  localidad: Localidad | null;
  geocode: GeocodeResult | null;
  marcaInteres?: string | null;
};

export type ResolverAsignacionResultado = {
  distribuidores: Distribuidor[];
  tecnico: Tecnico | null;
  metodo: MetodoAsignacion;
  localidadUsada: Localidad | null;
};

async function distribuidoresDe(
  localidadId: string,
  marcaInteres?: string | null,
): Promise<Distribuidor[]> {
  const asignaciones = await prisma.localidadDistribuidor.findMany({
    where: { localidadId },
    include: { distribuidor: true },
  });
  const activos = asignaciones
    .map((a) => a.distribuidor)
    .filter((d) => d.activo);

  if (marcaInteres) {
    const target = normalizeNombre(marcaInteres);
    const porMarca = activos.filter(
      (d) => d.marca && normalizeNombre(d.marca) === target,
    );
    if (porMarca.length > 0) return porMarca;
  }
  return activos;
}

/**
 * Dada una Localidad (posiblemente null) y/o coordenadas geocodificadas,
 * determina que distribuidor(es) y tecnico deben recibir la consulta:
 *  1. Distribuidor(es) asignados directamente a la localidad (ZONA_EXACTA).
 *  2. Si no hay, el/los distribuidor(es) de la localidad con cobertura mas
 *     cercana por distancia real (ZONA_CERCANA).
 *  3. Si no hay ninguna localidad con cobertura cerca, SIN_COBERTURA (el
 *     tecnico de zona, si existe, igual queda como respaldo).
 */
export async function resolverAsignacion(
  input: ResolverAsignacionInput,
): Promise<ResolverAsignacionResultado> {
  const { localidad, geocode, marcaInteres } = input;
  const tecnicoDeLocalidad = localidad?.tecnicoId
    ? await prisma.tecnico.findUnique({ where: { id: localidad.tecnicoId } })
    : null;

  if (localidad) {
    const distribuidores = await distribuidoresDe(localidad.id, marcaInteres);
    if (distribuidores.length > 0) {
      return {
        distribuidores,
        tecnico: tecnicoDeLocalidad,
        metodo: "ZONA_EXACTA",
        localidadUsada: localidad,
      };
    }
  }

  const punto =
    geocode ?? (localidad?.lat != null && localidad?.lng != null
      ? { lat: localidad.lat, lng: localidad.lng }
      : null);

  if (punto) {
    const conCobertura = await prisma.localidad.findMany({
      where: {
        lat: { not: null },
        lng: { not: null },
        distribuidores: { some: { distribuidor: { activo: true } } },
      },
    });

    let mejor: { localidad: Localidad; distanciaKm: number } | null = null;
    for (const candidata of conCobertura) {
      if (candidata.id === localidad?.id) continue;
      const distanciaKm = haversineKm(punto, {
        lat: candidata.lat!,
        lng: candidata.lng!,
      });
      if (!mejor || distanciaKm < mejor.distanciaKm) {
        mejor = { localidad: candidata, distanciaKm };
      }
    }

    if (mejor && mejor.distanciaKm <= MAX_DISTANCIA_COBERTURA_KM) {
      const distribuidores = await distribuidoresDe(
        mejor.localidad.id,
        marcaInteres,
      );
      if (distribuidores.length > 0) {
        return {
          distribuidores,
          tecnico: tecnicoDeLocalidad ?? (await tecnicoDe(mejor.localidad)),
          metodo: "ZONA_CERCANA",
          localidadUsada: mejor.localidad,
        };
      }
    }
  }

  return {
    distribuidores: [],
    tecnico: tecnicoDeLocalidad,
    metodo: "SIN_COBERTURA",
    localidadUsada: localidad,
  };
}

async function tecnicoDe(localidad: Localidad): Promise<Tecnico | null> {
  if (!localidad.tecnicoId) return null;
  return prisma.tecnico.findUnique({ where: { id: localidad.tecnicoId } });
}
