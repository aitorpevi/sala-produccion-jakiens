-- AlterTable
ALTER TABLE "CallSheetDay" ADD COLUMN     "cateringComida" TEXT,
ADD COLUMN     "cateringDesayuno" TEXT,
ADD COLUMN     "cateringNotas" TEXT,
ADD COLUMN     "contactoSetTel" TEXT,
ADD COLUMN     "hospitalDireccion" TEXT,
ADD COLUMN     "hospitalMapsUrl" TEXT,
ADD COLUMN     "hospitalNombre" TEXT,
ADD COLUMN     "hospitalTelefono" TEXT,
ADD COLUMN     "llegadaCliente" TEXT;

-- AlterTable
ALTER TABLE "ProjectMember" ADD COLUMN     "restriccionesAlimentarias" TEXT;

-- CreateTable
CREATE TABLE "Localizacion" (
    "id" TEXT NOT NULL,
    "callSheetDayId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "mapsUrl" TEXT,
    "parking" TEXT,
    "accesos" TEXT,
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Localizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Traslado" (
    "id" TEXT NOT NULL,
    "callSheetDayId" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "vehiculo" TEXT,
    "conductor" TEXT,
    "ocupantes" TEXT,
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Traslado_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Localizacion" ADD CONSTRAINT "Localizacion_callSheetDayId_fkey" FOREIGN KEY ("callSheetDayId") REFERENCES "CallSheetDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traslado" ADD CONSTRAINT "Traslado_callSheetDayId_fkey" FOREIGN KEY ("callSheetDayId") REFERENCES "CallSheetDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
