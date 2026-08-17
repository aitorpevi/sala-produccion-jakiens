/*
  Warnings:

  - You are about to drop the column `dni` on the `AltaLaboral` table. All the data in the column will be lost.
  - You are about to drop the column `domicilio` on the `AltaLaboral` table. All the data in the column will be lost.
  - You are about to drop the column `iban` on the `AltaLaboral` table. All the data in the column will be lost.
  - You are about to drop the column `irpf` on the `AltaLaboral` table. All the data in the column will be lost.
  - You are about to drop the column `naf` on the `AltaLaboral` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AltaLaboral" DROP COLUMN "dni",
DROP COLUMN "domicilio",
DROP COLUMN "iban",
DROP COLUMN "irpf",
DROP COLUMN "naf";

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "dni" TEXT,
ADD COLUMN     "domicilio" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "irpf" TEXT,
ADD COLUMN     "naf" TEXT,
ADD COLUMN     "okTicketId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "entregaMaterial" TEXT,
ADD COLUMN     "preproFin" TEXT,
ADD COLUMN     "preproInicio" TEXT,
ADD COLUMN     "primeraEntregaMontaje" TEXT,
ADD COLUMN     "rodajeFin" TEXT,
ADD COLUMN     "rodajeInicio" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'activo';
