ALTER TABLE "posts" ADD COLUMN "title_pt" TEXT, ADD COLUMN "title_en" TEXT, ADD COLUMN "content_pt" TEXT, ADD COLUMN "content_en" TEXT, ADD COLUMN "cover_image_alt_pt" TEXT, ADD COLUMN "cover_image_alt_en" TEXT;
UPDATE "posts" SET "title_pt" = "title", "content_pt" = "content", "cover_image_alt_pt" = "cover_image_alt" WHERE "title" IS NOT NULL;
