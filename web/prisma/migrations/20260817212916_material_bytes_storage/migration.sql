/*
  Warnings:

  - You are about to drop the column `filePath` on the `Material` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Material" DROP COLUMN "filePath",
ADD COLUMN     "fileData" BYTEA,
ADD COLUMN     "fileName" TEXT;
