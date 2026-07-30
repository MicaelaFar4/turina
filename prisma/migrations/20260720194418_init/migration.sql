-- CreateEnum
CREATE TYPE "CanalContacto" AS ENUM ('LLAMADA', 'WHATSAPP', 'EMAIL', 'PRESENCIAL', 'FORMULARIO_WEB', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoConsulta" AS ENUM ('NUEVA', 'ASIGNADA', 'SIN_COBERTURA', 'EN_GESTION', 'CERRADA');

-- CreateEnum
CREATE TYPE "MetodoAsignacion" AS ENUM ('ZONA_EXACTA', 'ZONA_CERCANA', 'SIN_COBERTURA');

-- CreateEnum
CREATE TYPE "TipoAsignado" AS ENUM ('DISTRIBUIDOR', 'TECNICO');

-- CreateTable
CREATE TABLE "Localidad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "zona" TEXT,
    "zonificacion" INTEGER,
    "poblacion" INTEGER,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "geocodedAt" TIMESTAMP(3),
    "tecnicoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Localidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tecnico" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "zona" TEXT,
    "numero" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tecnico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distribuidor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "marca" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Distribuidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalidadDistribuidor" (
    "id" TEXT NOT NULL,
    "localidadId" TEXT NOT NULL,
    "distribuidorId" TEXT NOT NULL,
    "marca" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalidadDistribuidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "rubro" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "localidadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consulta" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "canal" "CanalContacto" NOT NULL,
    "motivo" TEXT NOT NULL,
    "marcaInteres" TEXT,
    "estado" "EstadoConsulta" NOT NULL DEFAULT 'NUEVA',
    "metodoAsignacion" "MetodoAsignacion",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultaAsignacion" (
    "id" TEXT NOT NULL,
    "consultaId" TEXT NOT NULL,
    "tipo" "TipoAsignado" NOT NULL,
    "distribuidorId" TEXT,
    "tecnicoId" TEXT,
    "notificado" BOOLEAN NOT NULL DEFAULT false,
    "notificadoAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultaAsignacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Localidad_lat_lng_idx" ON "Localidad"("lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "Localidad_nombre_region_key" ON "Localidad"("nombre", "region");

-- CreateIndex
CREATE UNIQUE INDEX "Tecnico_numero_key" ON "Tecnico"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Distribuidor_nombre_key" ON "Distribuidor"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "LocalidadDistribuidor_localidadId_distribuidorId_marca_key" ON "LocalidadDistribuidor"("localidadId", "distribuidorId", "marca");

-- CreateIndex
CREATE INDEX "Consulta_clienteId_idx" ON "Consulta"("clienteId");

-- CreateIndex
CREATE INDEX "ConsultaAsignacion_consultaId_idx" ON "ConsultaAsignacion"("consultaId");

-- AddForeignKey
ALTER TABLE "Localidad" ADD CONSTRAINT "Localidad_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Tecnico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalidadDistribuidor" ADD CONSTRAINT "LocalidadDistribuidor_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalidadDistribuidor" ADD CONSTRAINT "LocalidadDistribuidor_distribuidorId_fkey" FOREIGN KEY ("distribuidorId") REFERENCES "Distribuidor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaAsignacion" ADD CONSTRAINT "ConsultaAsignacion_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "Consulta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaAsignacion" ADD CONSTRAINT "ConsultaAsignacion_distribuidorId_fkey" FOREIGN KEY ("distribuidorId") REFERENCES "Distribuidor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaAsignacion" ADD CONSTRAINT "ConsultaAsignacion_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Tecnico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
