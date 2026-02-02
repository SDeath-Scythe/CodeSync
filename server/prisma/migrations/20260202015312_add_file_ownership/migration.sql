-- AlterTable
ALTER TABLE "SessionFile" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT;

-- AddForeignKey
ALTER TABLE "SessionFile" ADD CONSTRAINT "SessionFile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFile" ADD CONSTRAINT "SessionFile_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
