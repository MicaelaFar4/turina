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
 * Caso especial "Faranda": el distribuidor cubre localidades con sucursales
 * distintas (La Plata y Mar del Plata), cada una con su propio email, asi
 * que se separa en dos registros de Distribuidor.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const EMAILS_POR_DISTRIBUIDOR: Record<string, string> = {
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

const FARANDA_MAR_DEL_PLATA_EMAIL = "suc3sa@pintureriasfaranda.com.ar";
const FARANDA_LA_PLATA_EMAIL = "suc1@pintureriasfaranda.com.ar";

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

  await separarFarandaPorSucursal();

  console.log("Listo.");
}

async function separarFarandaPorSucursal() {
  const faranda = await prisma.distribuidor.findUnique({
    where: { nombre: "Faranda" },
    include: { localidades: { include: { localidad: true } } },
  });
  if (!faranda) {
    console.warn('No se encontro el distribuidor "Faranda"');
    return;
  }

  const mardelplata = faranda.localidades.find(
    (ld) => ld.localidad.nombre === "General Pueyrredón",
  );

  await prisma.distribuidor.update({
    where: { id: faranda.id },
    data: { nombre: "Faranda (La Plata)", email: FARANDA_LA_PLATA_EMAIL },
  });
  console.log(`Faranda (La Plata) -> ${FARANDA_LA_PLATA_EMAIL}`);

  if (mardelplata) {
    const farandaMdp = await prisma.distribuidor.upsert({
      where: { nombre: "Faranda (Mar del Plata)" },
      update: { email: FARANDA_MAR_DEL_PLATA_EMAIL },
      create: {
        nombre: "Faranda (Mar del Plata)",
        marca: faranda.marca,
        email: FARANDA_MAR_DEL_PLATA_EMAIL,
      },
    });
    await prisma.localidadDistribuidor.update({
      where: { id: mardelplata.id },
      data: { distribuidorId: farandaMdp.id },
    });
    console.log(`Faranda (Mar del Plata) -> ${FARANDA_MAR_DEL_PLATA_EMAIL}`);
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
