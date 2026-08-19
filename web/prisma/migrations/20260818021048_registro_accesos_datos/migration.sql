-- CreateTable
CREATE TABLE "AccesoDatosPersonales" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT,
    "staffNombre" TEXT NOT NULL,
    "personId" TEXT,
    "personNombre" TEXT,
    "accion" TEXT NOT NULL,
    "detalle" TEXT,
    "ip" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccesoDatosPersonales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccesoDatosPersonales_personId_creadoEn_idx" ON "AccesoDatosPersonales"("personId", "creadoEn");

-- CreateIndex
CREATE INDEX "AccesoDatosPersonales_staffUserId_creadoEn_idx" ON "AccesoDatosPersonales"("staffUserId", "creadoEn");
