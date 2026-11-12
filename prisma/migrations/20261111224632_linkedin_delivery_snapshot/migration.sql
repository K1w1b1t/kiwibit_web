-- AlterTable
ALTER TABLE "linkedin_blog_deliveries" ADD COLUMN     "phase" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "snapshot_image_url" TEXT,
ADD COLUMN     "snapshot_text" TEXT;
