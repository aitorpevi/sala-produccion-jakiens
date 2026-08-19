-- CreateTable
CREATE TABLE "Necesidad" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "detalle" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "responsableId" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Necesidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuestoPrevisto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "confirmadoManualmente" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PuestoPrevisto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Necesidad_projectId_departamento_idx" ON "Necesidad"("projectId", "departamento");

-- CreateIndex
CREATE INDEX "PuestoPrevisto_projectId_idx" ON "PuestoPrevisto"("projectId");

-- AddForeignKey
ALTER TABLE "Necesidad" ADD CONSTRAINT "Necesidad_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Necesidad" ADD CONSTRAINT "Necesidad_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "ProjectMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuestoPrevisto" ADD CONSTRAINT "PuestoPrevisto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
