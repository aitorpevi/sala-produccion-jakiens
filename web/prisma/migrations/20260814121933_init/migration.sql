-- CreateTable
CREATE TABLE "ProductionUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "director" TEXT NOT NULL,
    "agencia" TEXT NOT NULL,
    "shootLabel" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseState" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "PhaseState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "initials" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "dias" INTEGER NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "requiereAlta" BOOLEAN NOT NULL DEFAULT false,
    "permisos" TEXT[],
    "callTime" TEXT,
    "brief" TEXT,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessToken" (
    "id" TEXT NOT NULL,
    "projectMemberId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ext" TEXT NOT NULL,
    "sizeLabel" TEXT,
    "version" TEXT,
    "direction" TEXT NOT NULL,
    "filePath" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialTarget" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "projectMemberId" TEXT NOT NULL,

    CONSTRAINT "MaterialTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AltaLaboral" (
    "id" TEXT NOT NULL,
    "projectMemberId" TEXT NOT NULL,
    "dni" TEXT,
    "naf" TEXT,
    "domicilio" TEXT,
    "iban" TEXT,
    "irpf" TEXT,
    "fechaAlta" TEXT,
    "fechaBaja" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "sentToGestoriaAt" TIMESTAMP(3),

    CONSTRAINT "AltaLaboral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSheetDay" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "localizacion" TEXT,
    "primeraHora" TEXT,
    "amanecer" TEXT,
    "ocaso" TEXT,
    "meteo" TEXT,

    CONSTRAINT "CallSheetDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleItem" (
    "id" TEXT NOT NULL,
    "callSheetDayId" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "ScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "projectMemberId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pendiente',
    "filePath" TEXT,
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ok_ticket',
    "externalId" TEXT,
    "concept" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionUser_email_key" ON "ProductionUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PhaseState_projectId_key_key" ON "PhaseState"("projectId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_personId_key" ON "ProjectMember"("projectId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessToken_token_key" ON "AccessToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialTarget_materialId_projectMemberId_key" ON "MaterialTarget"("materialId", "projectMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "AltaLaboral_projectMemberId_key" ON "AltaLaboral"("projectMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_projectMemberId_key" ON "Invoice"("projectMemberId");

-- AddForeignKey
ALTER TABLE "PhaseState" ADD CONSTRAINT "PhaseState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_projectMemberId_fkey" FOREIGN KEY ("projectMemberId") REFERENCES "ProjectMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTarget" ADD CONSTRAINT "MaterialTarget_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTarget" ADD CONSTRAINT "MaterialTarget_projectMemberId_fkey" FOREIGN KEY ("projectMemberId") REFERENCES "ProjectMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AltaLaboral" ADD CONSTRAINT "AltaLaboral_projectMemberId_fkey" FOREIGN KEY ("projectMemberId") REFERENCES "ProjectMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSheetDay" ADD CONSTRAINT "CallSheetDay_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_callSheetDayId_fkey" FOREIGN KEY ("callSheetDayId") REFERENCES "CallSheetDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectMemberId_fkey" FOREIGN KEY ("projectMemberId") REFERENCES "ProjectMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
