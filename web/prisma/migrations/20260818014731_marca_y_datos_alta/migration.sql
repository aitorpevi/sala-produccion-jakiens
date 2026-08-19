-- AlterTable
ALTER TABLE "AltaLaboral" ADD COLUMN     "importeBruto" INTEGER,
ADD COLUMN     "salarioSesion" INTEGER;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "categoria" TEXT,
ADD COLUMN     "fechaNacimiento" TEXT,
ADD COLUMN     "sexo" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "brand" TEXT NOT NULL DEFAULT 'JAKIENS';

-- AlterTable
ALTER TABLE "ProjectMember" ADD COLUMN     "tipoEquipo" TEXT NOT NULL DEFAULT 'tecnico';
