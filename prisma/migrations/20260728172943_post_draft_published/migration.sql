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
--
-- The WHERE clause is a no-op on first run: `published_at` was just added as a
-- nullable column with no default, so every pre-existing row is NULL. It is
-- spelled out so the statement is not an unbounded UPDATE, and it makes the
-- backfill idempotent — a re-run cannot overwrite a real publication date.
UPDATE "posts"
SET "status" = 'published', "published_at" = "created_at"
WHERE "published_at" IS NULL;
