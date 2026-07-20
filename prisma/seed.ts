/**
 * Carga inicial: parsea data/tecnicos-zonificacion.xlsx (hoja "Matriz Cobertura")
 * y crea Localidades, Distribuidores, Tecnicos y sus asignaciones.
 *
 * El numero de "Zonificacion" (1-4) identifica al tecnico responsable de la
 * zona, segun la referencia que figura al pie de la planilla:
 *   1 = Norte      -> Lucas Gonzalez
 *   2 = Oeste      -> Lucas Castiglioni
 *   3 = Sur        -> Hernan Vanucci
 *   4 = Oscilante  -> Sergio Boscardini
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as XLSX from "xlsx";
import * as fs from "node:fs";
import * as path from "node:path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const XLSX_PATH = path.join(__dirname, "..", "data", "tecnicos-zonificacion.xlsx");
const COORDS_PATH = path.join(__dirname, "..", "data", "localidad-coords.json");

const TECNICOS = [
  { numero: 1, zona: "Norte", nombre: "Lucas Gonzalez" },
  { numero: 2, zona: "Oeste", nombre: "Lucas Castiglioni" },
  { numero: 3, zona: "Sur", nombre: "Hernan Vanucci" },
  { numero: 4, zona: "Oscilante", nombre: "Sergio Boscardini" },
] as const;

type MatrizRow = {
  Región?: unknown;
  Localidad?: unknown;
  Población?: unknown;
  Zona?: unknown;
  Zonificación?: unknown;
  Distribuidor?: unknown;
  Marca?: unknown;
};

function cleanStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function cleanInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = parseInt(String(v).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

async function main() {
  const coords: Record<string, { lat: number; lng: number }> = JSON.parse(
    fs.readFileSync(COORDS_PATH, "utf-8"),
  );

  console.log("Creando tecnicos...");
  const tecnicoByNumero = new Map<number, string>();
  for (const t of TECNICOS) {
    const tecnico = await prisma.tecnico.upsert({
      where: { numero: t.numero },
      update: { nombre: t.nombre, zona: t.zona },
      create: { nombre: t.nombre, zona: t.zona, numero: t.numero },
    });
    tecnicoByNumero.set(t.numero, tecnico.id);
  }

  console.log("Leyendo planilla:", XLSX_PATH);
  const wb = XLSX.readFile(XLSX_PATH);
  const sheet = wb.Sheets["Matriz Cobertura"];
  const rows = XLSX.utils.sheet_to_json<MatrizRow>(sheet, { defval: null });

  let localidadesCreadas = 0;
  let distribuidoresCreados = 0;
  let asignacionesCreadas = 0;
  const sinCoordenadas: string[] = [];

  const distribuidorIdByNombre = new Map<string, string>();
  const localidadIdByKey = new Map<string, string>();

  for (const row of rows) {
    const region = cleanStr(row["Región"]);
    const localidadNombre = cleanStr(row["Localidad"]);
    if (!region || !localidadNombre) continue;
    // Las filas de referencia al pie de la planilla tienen la Localidad
    // como numero (1,2,3) en vez de nombre real: se descartan.
    if (/^\d+$/.test(localidadNombre)) continue;

    const poblacion = cleanInt(row["Población"]);
    const zona = cleanStr(row["Zona"]);
    const zonifRaw = row["Zonificación"];
    const zonificacion = cleanInt(zonifRaw); // "Agente" -> null

    const key = `${region}|${localidadNombre}`;
    let localidadId = localidadIdByKey.get(key);
    if (!localidadId) {
      const coord = coords[key];
      if (!coord) sinCoordenadas.push(key);

      const tecnicoId =
        zonificacion !== null ? tecnicoByNumero.get(zonificacion) ?? null : null;

      const localidad = await prisma.localidad.upsert({
        where: { nombre_region: { nombre: localidadNombre, region } },
        update: {
          zona: zona ?? undefined,
          zonificacion: zonificacion ?? undefined,
          poblacion: poblacion ?? undefined,
          tecnicoId: tecnicoId ?? undefined,
          lat: coord?.lat,
          lng: coord?.lng,
          geocodedAt: coord ? new Date() : undefined,
        },
        create: {
          nombre: localidadNombre,
          region,
          zona,
          zonificacion,
          poblacion,
          tecnicoId,
          lat: coord?.lat ?? null,
          lng: coord?.lng ?? null,
          geocodedAt: coord ? new Date() : null,
        },
      });
      localidadId = localidad.id;
      localidadIdByKey.set(key, localidadId);
      localidadesCreadas++;
    }

    const distribuidorNombre = cleanStr(row["Distribuidor"]);
    if (!distribuidorNombre || distribuidorNombre.toLowerCase() === "en blanco") {
      continue;
    }
    const marca = cleanStr(row["Marca"]);

    let distribuidorId = distribuidorIdByNombre.get(distribuidorNombre);
    if (!distribuidorId) {
      const distribuidor = await prisma.distribuidor.upsert({
        where: { nombre: distribuidorNombre },
        update: {},
        create: { nombre: distribuidorNombre, marca },
      });
      distribuidorId = distribuidor.id;
      distribuidorIdByNombre.set(distribuidorNombre, distribuidorId);
      distribuidoresCreados++;
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
    asignacionesCreadas++;
  }

  console.log(`Localidades: ${localidadesCreadas}`);
  console.log(`Distribuidores: ${distribuidoresCreados}`);
  console.log(`Asignaciones localidad-distribuidor: ${asignacionesCreadas}`);
  if (sinCoordenadas.length > 0) {
    console.log(
      `Localidades sin coordenadas (completar manualmente en el admin): ${sinCoordenadas.length}`,
    );
    console.log(sinCoordenadas.join(", "));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
