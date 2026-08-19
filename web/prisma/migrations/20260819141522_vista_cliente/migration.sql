-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "logoAgenciaUrl" TEXT,
ADD COLUMN     "logoClienteUrl" TEXT,
ADD COLUMN     "portadaUrl" TEXT;

-- CreateTable
CREATE TABLE "ClientAccess" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "etiqueta" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientAccess_token_key" ON "ClientAccess"("token");

-- CreateIndex
CREATE INDEX "ClientAccess_projectId_idx" ON "ClientAccess"("projectId");

-- AddForeignKey
ALTER TABLE "ClientAccess" ADD CONSTRAINT "ClientAccess_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
