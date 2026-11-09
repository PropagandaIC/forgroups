-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "legacyId" INTEGER,
ADD COLUMN     "sourceUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_legacyId_key" ON "Organization"("legacyId");

