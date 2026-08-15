-- CreateTable
CREATE TABLE "linkedin_connections" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "linkedin_sub" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "access_token_enc" TEXT NOT NULL,
    "access_token_expiry" TIMESTAMP(3) NOT NULL,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linkedin_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "linkedin_connections_member_id_key" ON "linkedin_connections"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "linkedin_connections_linkedin_sub_key" ON "linkedin_connections"("linkedin_sub");

-- AddForeignKey
ALTER TABLE "linkedin_connections" ADD CONSTRAINT "linkedin_connections_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
