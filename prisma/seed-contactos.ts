/**
 * Carga los emails de contacto de distribuidores a partir de
 * data/distribuidores-contacto.xlsx.
 *
 * Esa planilla agrupa a los distribuidores por un nombre comercial
 * ("Briago", "Lupo", "Piccin", etc.) distinto de las razones sociales que
 * ya tenemos cargadas desde data/tecnicos-zonificacion.xlsx (ej.
 * "PINTURERIA DEL FONDO SA", "PICCIN HNOS."). El mapeo entre ambos nombres
 * se hizo a mano cruzando nombre comercial, localidad y dominio de email;
 * por eso esta carga es una lista explicita en vez de un parser generico.
 *
 * Caso especial "Faranda": cubre localidades con sucursales distintas (La
 * Plata y Mar del Plata), cada una con su propio email, asi que se agrega
 * "Faranda (Mar del Plata)" como distribuidor aparte para esa localidad y
 * "Faranda" (el que ya crea prisma/seed.ts) queda para el resto.
 *
 * Este script se corre en cada build (ver package.json), asi que tiene que
 * poder ejecutarse las veces que sea sin duplicar ni romper nada.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const EMAILS_POR_DISTRIBUIDOR: Record<string, string> = {
  Faranda: "suc1@pintureriasfaranda.com.ar",
  "PINTURERIAS BRIAGO S.A": "briagopinturas@gmail.com",
  "PINTURERIAS COLORPLUS SRL": "colorplus06@hotmail.com",
  "PINT Y FERRET EL SOL SA": "elsolpintureriasyferreterias@gmail.com",
  "PINTURERIA ALSINA S.H": "pintureriaalsina@hotmail.com",
  "IACONO E HIJOS SA": "aalvarez@iaconomdp.com.ar",
  "LUPATINI Y CIA": "lucas@pintureriasanantonio.com",
  "LUPATINI Y CIA / CAPELLI": "lucas@pintureriasanantonio.com",
  "PINTURERIA DEL FONDO SA": "juanlupo@delfondo.com.ar",
  "PICCIN HNOS.": "humberto@piccinhnos.com.ar",
  Lopez: "lopezproveedores@gmail.com",
  "LOPEZ ADRIAN OSCAR": "administracion@tandiliacolor.com",
  "PINTURERIA TESEI HNOS. S.A.": "info@pintureriastesei.com.ar",
  Tesei: "info@pintureriastesei.com.ar",
  TOMATTI: "arcoiristepinta@gmail.com",
  "PINTURERIAS TRAVERSA SRL": "pintureriatraversa@hotmail.com.ar",
};

const FARANDA_MAR_DEL_PLATA = {
  nombre: "Faranda (Mar del Plata)",
  email: "suc3sa@pintureriasfaranda.com.ar",
  localidad: "General Pueyrredón",
};

async function main() {
  for (const [nombre, email] of Object.entries(EMAILS_POR_DISTRIBUIDOR)) {
    const actualizado = await prisma.distribuidor.updateMany({
      where: { nombre },
      data: { email },
    });
    if (actualizado.count === 0) {
      console.warn(`No se encontro distribuidor "${nombre}" para cargarle el email`);
    } else {
      console.log(`${nombre} -> ${email}`);
    }
  }

  await separarFarandaMarDelPlata();

  console.log("Listo.");
}

/**
 * "Faranda" (creado por prisma/seed.ts desde la matriz de cobertura) cubre
 * tanto la zona de La Plata como General Pueyrredon (Mar del Plata), pero
 * son sucursales distintas con su propio email. Se mueve esa localidad a un
 * distribuidor separado.
 */
async function separarFarandaMarDelPlata() {
  const localidad = await prisma.localidad.findFirst({
    where: { nombre: FARANDA_MAR_DEL_PLATA.localidad },
  });
  if (!localidad) return;

  const faranda = await prisma.distribuidor.findUnique({ where: { nombre: "Faranda" } });

  // saca cualquier asignacion de "Faranda" (La Plata) para esta localidad,
  // por si prisma/seed.ts la volvio a crear en una corrida anterior
  if (faranda) {
    await prisma.localidadDistribuidor.deleteMany({
      where: { localidadId: localidad.id, distribuidorId: faranda.id },
    });
  }

  const farandaMdp = await prisma.distribuidor.upsert({
    where: { nombre: FARANDA_MAR_DEL_PLATA.nombre },
    update: { email: FARANDA_MAR_DEL_PLATA.email },
    create: {
      nombre: FARANDA_MAR_DEL_PLATA.nombre,
      marca: faranda?.marca,
      email: FARANDA_MAR_DEL_PLATA.email,
    },
  });

  await prisma.localidadDistribuidor.upsert({
    where: {
      localidadId_distribuidorId_marca: {
        localidadId: localidad.id,
        distribuidorId: farandaMdp.id,
        marca: "",
      },
    },
    update: {},
    create: { localidadId: localidad.id, distribuidorId: farandaMdp.id, marca: "" },
  });

  console.log(`${FARANDA_MAR_DEL_PLATA.nombre} -> ${FARANDA_MAR_DEL_PLATA.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
