ALTER TABLE "posts" DROP CONSTRAINT "posts_author_id_fkey";
ALTER TABLE "posts" ALTER COLUMN "author_id" DROP NOT NULL;
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
