-- Clientes, documentos de venta y avisos.
--
-- Escrita a mano: el diff generado proponía `DROP COLUMN "brand"` a secas, que
-- se habría llevado por delante qué productora hace cada proyecto. Aquí se
-- copia el dato a su columna nueva antes de borrar la vieja.
--
-- `PresupuestoVenta.importe` SÍ se elimina y su contenido se pierde. Es
-- deliberado (decisión de Aitor, 2026-09-07): del presupuesto solo interesa el
-- documento que se comparte, no la cifra.
--
-- El orden importa: las columnas nuevas tienen que existir antes de que las
-- claves ajenas del final las referencien.

-- CreateEnum
-- Los tipos van tolerantes a que ya existan: Postgres no deshace `CREATE TYPE`
-- ni `ALTER TYPE ... ADD VALUE` al abortar la migración, así que un intento
-- fallido dejaría el tipo suelto y bloquearía todos los reintentos.
DO $$ BEGIN
  CREATE TYPE "TipoDocumento" AS ENUM ('BRIEFING', 'PRESUPUESTO', 'OTRO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- AlterEnum
ALTER TYPE "StaffTier" ADD VALUE IF NOT EXISTS 'EXTERNO';

-- AlterTable: `brand` pasa a llamarse `productora`.
-- Va en tres pasos —añadir, copiar, borrar— y no con RENAME COLUMN, para que
-- quede escrito que el dato viaja y no se pierde.
ALTER TABLE "Project" ADD COLUMN "productora" TEXT NOT NULL DEFAULT 'JAKIENS';
UPDATE "Project" SET "productora" = COALESCE("brand", 'JAKIENS');
ALTER TABLE "Project" DROP COLUMN "brand";

-- AlterTable: campos nuevos del proyecto.
ALTER TABLE "Project"
  ADD COLUMN "clienteId" TEXT,
  ADD COLUMN "marca" TEXT,
  ADD COLUMN "refPresupuesto" TEXT;

-- AlterTable: el presupuesto de venta deja de guardar importe.
ALTER TABLE "PresupuestoVenta"
  DROP COLUMN "importe",
  ADD COLUMN "asignadoAId" TEXT,
  ALTER COLUMN "estado" SET DEFAULT 'en_preparacion';

-- Los estados viejos se traducen. `aprobado` y `rechazado` describían el
-- proyecto, no el documento, y no tienen equivalente: se quedan en el último
-- estado que sí consta, que es haberlo enviado.
UPDATE "PresupuestoVenta" SET "estado" = 'en_preparacion' WHERE "estado" = 'borrador';
UPDATE "PresupuestoVenta" SET "estado" = 'enviado_cliente' WHERE "estado" IN ('enviado', 'aprobado', 'rechazado');

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cif" TEXT,
    "direccionFiscal" TEXT,
    "contactoNombre" TEXT,
    "contactoEmail" TEXT,
    "contactoTelefono" TEXT,
    "condicionesPago" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL DEFAULT 'OTRO',
    "nombre" TEXT NOT NULL,
    "fileUrl" TEXT,
    "linkUrl" TEXT,
    "subidoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aviso" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "url" TEXT,
    "leidoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aviso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_nombre_key" ON "Cliente"("nombre");

-- CreateIndex
CREATE INDEX "Documento_projectId_tipo_idx" ON "Documento"("projectId", "tipo");

-- CreateIndex
CREATE INDEX "Aviso_staffUserId_leidoEn_idx" ON "Aviso"("staffUserId", "leidoEn");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoVenta" ADD CONSTRAINT "PresupuestoVenta_asignadoAId_fkey" FOREIGN KEY ("asignadoAId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ficha de cliente para cada nombre que ya estaba escrito a mano en los
-- proyectos, y enlace de vuelta. Sin esto la tabla nueva nacería vacía y
-- alguien tendría que reescribir lo que ya está en la base.
INSERT INTO "Cliente" ("id", "nombre")
SELECT gen_random_uuid()::text, TRIM("client")
FROM "Project"
WHERE TRIM(COALESCE("client", '')) <> ''
GROUP BY TRIM("client");

UPDATE "Project" p
SET "clienteId" = c."id"
FROM "Cliente" c
WHERE TRIM(COALESCE(p."client", '')) = c."nombre";
