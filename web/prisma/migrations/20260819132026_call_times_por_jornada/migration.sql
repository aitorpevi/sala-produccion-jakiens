-- AlterTable
ALTER TABLE "CallSheetDay" ADD COLUMN     "contactoSet" TEXT,
ADD COLUMN     "orden" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "puntoEncuentro" TEXT;

-- CreateTable
CREATE TABLE "CallTime" (
    "id" TEXT NOT NULL,
    "callSheetDayId" TEXT NOT NULL,
    "projectMemberId" TEXT NOT NULL,
    "hora" TEXT NOT NULL,

    CONSTRAINT "CallTime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CallTime_callSheetDayId_projectMemberId_key" ON "CallTime"("callSheetDayId", "projectMemberId");

-- AddForeignKey
ALTER TABLE "CallTime" ADD CONSTRAINT "CallTime_callSheetDayId_fkey" FOREIGN KEY ("callSheetDayId") REFERENCES "CallSheetDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallTime" ADD CONSTRAINT "CallTime_projectMemberId_fkey" FOREIGN KEY ("projectMemberId") REFERENCES "ProjectMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
