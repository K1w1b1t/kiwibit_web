ALTER TABLE "projects"
  ADD COLUMN "title_pt" TEXT,
  ADD COLUMN "title_en" TEXT,
  ADD COLUMN "description_pt" TEXT,
  ADD COLUMN "description_en" TEXT,
  ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "featured_order" INTEGER NOT NULL DEFAULT 1;

-- Preserve legacy values and all existing gallery relations.
UPDATE "projects"
SET "title_pt" = "title", "description_pt" = "description";
