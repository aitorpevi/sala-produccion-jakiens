-- Gestor de proyectos, paso 3: quién trabaja cada etapa y el presupuesto de venta.
--
-- Solo añade: dos tablas nuevas y una columna con valor por defecto. No toca
-- nada de lo que ya hay, así que se puede aplicar con la app en marcha.
--
-- `StaffUser.accesoPresupuestoVenta` entra en FALSE para todo el mundo a
-- propósito: el presupuesto de venta es un dato nuevo y nadie debe verlo por
-- herencia de su nivel. Quién lo ve se decide a mano (ver prisma/seed.ts).

-- AlterTable
ALTER TABLE "StaffUser" ADD COLUMN     "accesoPresupuestoVenta" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AsignacionEtapa" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "etapa" "Etapa" NOT NULL,
    "rol" TEXT,
    "responsable" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsignacionEtapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoVenta" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "importe" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "notas" TEXT,
    "enviadoEn" TIMESTAMP(3),
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPorId" TEXT,

    CONSTRAINT "PresupuestoVenta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AsignacionEtapa_staffUserId_etapa_idx" ON "AsignacionEtapa"("staffUserId", "etapa");

-- CreateIndex
CREATE UNIQUE INDEX "AsignacionEtapa_projectId_staffUserId_etapa_key" ON "AsignacionEtapa"("projectId", "staffUserId", "etapa");

-- CreateIndex
CREATE UNIQUE INDEX "PresupuestoVenta_projectId_key" ON "PresupuestoVenta"("projectId");

-- AddForeignKey
ALTER TABLE "AsignacionEtapa" ADD CONSTRAINT "AsignacionEtapa_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionEtapa" ADD CONSTRAINT "AsignacionEtapa_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoVenta" ADD CONSTRAINT "PresupuestoVenta_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoVenta" ADD CONSTRAINT "PresupuestoVenta_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

