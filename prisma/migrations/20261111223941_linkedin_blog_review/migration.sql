-- CreateEnum
CREATE TYPE "LinkedinDeliveryStatus" AS ENUM ('pending', 'sending', 'succeeded', 'failed', 'unknown');

-- CreateTable
CREATE TABLE "linkedin_blog_reviews" (
    "post_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "post_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linkedin_blog_reviews_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "linkedin_blog_deliveries" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "target" TEXT NOT NULL,
    "status" "LinkedinDeliveryStatus" NOT NULL DEFAULT 'pending',
    "version" INTEGER NOT NULL,
    "owner_urn" TEXT,
    "post_urn" TEXT,
    "image_urn" TEXT,
    "error_code" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linkedin_blog_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "linkedin_blog_deliveries_post_id_target_key" ON "linkedin_blog_deliveries"("post_id", "target");

-- AddForeignKey
ALTER TABLE "linkedin_blog_reviews" ADD CONSTRAINT "linkedin_blog_reviews_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linkedin_blog_deliveries" ADD CONSTRAINT "linkedin_blog_deliveries_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "linkedin_blog_reviews"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- These internal records are accessed only by the server, never through the public Data API.
ALTER TABLE "linkedin_blog_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "linkedin_blog_deliveries" ENABLE ROW LEVEL SECURITY;
