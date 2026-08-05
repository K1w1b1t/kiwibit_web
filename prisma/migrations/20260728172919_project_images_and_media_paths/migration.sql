-- AlterTable
ALTER TABLE "members" ADD COLUMN     "avatar_path" TEXT;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "cover_image_alt" TEXT,
ADD COLUMN     "cover_image_path" TEXT,
ADD COLUMN     "cover_image_url" TEXT;

-- CreateTable
CREATE TABLE "project_images" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_images_project_id_position_idx" ON "project_images"("project_id", "position");

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
