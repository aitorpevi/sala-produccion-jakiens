-- Gestor de proyectos, paso 1: etapa de negocio, estado ampliado y tabla de hitos.
--
-- Escrita a mano en lugar de generada: `prisma migrate dev` proponía un
-- `DROP COLUMN status` a secas, que habría tirado el estado de todos los
-- proyectos existentes. Aquí se añade primero, se traduce el dato y solo
-- entonces se borra la columna vieja.

-- CreateEnum
CREATE TYPE "Etapa" AS ENUM ('VENTA', 'PREPRODUCCION', 'RODAJE', 'POSTPRODUCCION', 'CIERRE');

-- CreateEnum
CREATE TYPE "EstadoProyecto" AS ENUM ('OPORTUNIDAD', 'ACTIVO', 'PERDIDO', 'PAUSADO', 'CERRADO');

-- CreateEnum
CREATE TYPE "TipoHito" AS ENUM ('ENTREGA_PROPUESTA', 'PPM', 'RODAJE', 'ENTREGA_MATERIAL', 'ENTREGA_MONTAJE', 'ENTREGA_CLIENTE', 'CIERRE_ECONOMICO', 'OTRO');

-- CreateEnum
CREATE TYPE "Criticidad" AS ENUM ('NORMAL', 'ALTA', 'CRITICA');

-- AlterTable: primero añadir
ALTER TABLE "Project"
  ADD COLUMN "estado" "EstadoProyecto" NOT NULL DEFAULT 'ACTIVO',
  ADD COLUMN "etapa" "Etapa" NOT NULL DEFAULT 'PREPRODUCCION';

-- Traducir el estado que había. `activo` | `cerrado` eran los dos únicos
-- valores que escribía la app (ver p/nuevo/actions.ts y el seed).
UPDATE "Project" SET "estado" = 'CERRADO' WHERE "status" = 'cerrado';
UPDATE "Project" SET "estado" = 'ACTIVO'  WHERE "status" <> 'cerrado';

-- La etapa no se puede deducir del dato que hay: `PhaseState` se escribe al
-- crear el proyecto y después nunca se actualiza (la barra de fases del
-- AppShell lee una constante, no la tabla), así que todos los proyectos
-- figuran eternamente en la fase "equipo".
--
-- Lo único que sí se sabe con certeza es que todo proyecto existente se ganó
-- antes de darse de alta —hasta ahora no había forma de registrar una
-- oportunidad—, así que ninguno está en VENTA. Los cerrados van a CIERRE y el
-- resto se quedan en el PREPRODUCCION por defecto, a corregir a mano desde el
-- gestor. Adivinar aquí sería peor que dejarlo visible y corregible.
UPDATE "Project" SET "etapa" = 'CIERRE' WHERE "status" = 'cerrado';

-- Y ahora sí, fuera la columna vieja.
ALTER TABLE "Project" DROP COLUMN "status";

-- CreateTable
CREATE TABLE "Hito" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "etapa" "Etapa" NOT NULL,
    "tipo" "TipoHito" NOT NULL DEFAULT 'OTRO',
    "titulo" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "fechaFin" DATE,
    "criticidad" "Criticidad" NOT NULL DEFAULT 'NORMAL',
    "notas" TEXT,
    "responsableId" TEXT,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "origenId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Hito_fecha_idx" ON "Hito"("fecha");

-- CreateIndex
CREATE INDEX "Hito_projectId_fecha_idx" ON "Hito"("projectId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Hito_origen_origenId_key" ON "Hito"("origen", "origenId");

-- AddForeignKey
ALTER TABLE "Hito" ADD CONSTRAINT "Hito_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hito" ADD CONSTRAINT "Hito_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
