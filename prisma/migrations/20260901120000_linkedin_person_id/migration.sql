-- AlterTable
ALTER TABLE "linkedin_connections" ADD COLUMN "linkedin_person_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "linkedin_connections_linkedin_person_id_key" ON "linkedin_connections"("linkedin_person_id");
