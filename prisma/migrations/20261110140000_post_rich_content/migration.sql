CREATE TYPE "PostContentFormat" AS ENUM ('text', 'html');
ALTER TABLE "posts" ADD COLUMN "content_format" "PostContentFormat" NOT NULL DEFAULT 'text';
