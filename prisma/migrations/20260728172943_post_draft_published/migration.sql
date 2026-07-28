-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('draft', 'published');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "status" "PostStatus" NOT NULL DEFAULT 'draft';

-- Backfill (hand-written, do NOT remove).
--
-- The column default is 'draft', and the public GET /api/posts now filters on
-- status = 'published'. Without this statement every post that already existed
-- would silently disappear from the public blog the moment this migration is
-- applied. Existing rows were publicly visible, so they are published, and
-- their creation time is the best available publication time.
UPDATE "posts" SET "status" = 'published', "published_at" = "created_at";
