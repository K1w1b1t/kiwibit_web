CREATE TYPE "user_role" AS ENUM (
  'admin',
  'editor',
  'member_manager',
  'member'
);

CREATE TYPE "post_status" AS ENUM (
  'draft',
  'in_review',
  'published',
  'scheduled',
  'archived'
);

CREATE TYPE "contact_status" AS ENUM (
  'pending',
  'sent',
  'failed'
);

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" VARCHAR2(160) NOT NULL,
  "email" VARCHAR2(255) UNIQUE NOT NULL,
  "email_verified" timestamp,
  "image_url" text,
  "role" user_role NOT NULL DEFAULT 'member',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "member_profiles" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid UNIQUE NOT NULL,
  "display_name" VARCHAR2(160) NOT NULL,
  "bio" text,
  "avatar_url" text,
  "headline" VARCHAR2(180),
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "member_links" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "member_profile_id" uuid NOT NULL,
  "label" VARCHAR2(80) NOT NULL,
  "url" text NOT NULL,
  "position" int NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "title" VARCHAR2(180) NOT NULL,
  "slug" VARCHAR2(180) UNIQUE NOT NULL,
  "description" text NOT NULL,
  "repo_url" text,
  "live_url" text,
  "cover_image_url" text,
  "created_by_user_id" uuid NOT NULL,
  "is_featured" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "project_members" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "project_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "contribution_role" VARCHAR2(80),
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "experiences" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "title" VARCHAR2(180) NOT NULL,
  "organization" VARCHAR2(180),
  "description" text,
  "start_date" date,
  "end_date" date,
  "is_current" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "posts" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "author_id" uuid NOT NULL,
  "title" VARCHAR2(220) NOT NULL,
  "slug" VARCHAR2(240) UNIQUE NOT NULL,
  "excerpt" text,
  "content" text NOT NULL,
  "cover_image_url" text,
  "status" post_status NOT NULL DEFAULT 'draft',
  "published_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "tags" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" VARCHAR2(60) UNIQUE NOT NULL,
  "slug" VARCHAR2(80) UNIQUE NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "post_tags" (
  "post_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY ("post_id", "tag_id")
);

CREATE TABLE "home_sections" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "section_key" VARCHAR2(80) UNIQUE NOT NULL,
  "title" VARCHAR2(180),
  "content" text,
  "content_json" json,
  "updated_by_user_id" uuid,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "contact_submissions" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" VARCHAR2(160) NOT NULL,
  "email" VARCHAR2(255) NOT NULL,
  "message" text NOT NULL,
  "webhook_status" contact_status NOT NULL DEFAULT 'pending',
  "webhook_response_code" int,
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "nextauth_accounts" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "type" VARCHAR2(60) NOT NULL,
  "provider" VARCHAR2(100) NOT NULL,
  "provider_account_id" VARCHAR2(200) NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" int,
  "token_type" VARCHAR2(40),
  "scope" text,
  "id_token" text,
  "session_state" text,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "nextauth_sessions" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "session_token" VARCHAR2(255) UNIQUE NOT NULL,
  "user_id" uuid NOT NULL,
  "expires" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "nextauth_verification_tokens" (
  "identifier" VARCHAR2(255) NOT NULL,
  "token" VARCHAR2(255) UNIQUE NOT NULL,
  "expires" timestamp NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

CREATE INDEX ON "users" ("email");

CREATE INDEX ON "users" ("role");

CREATE INDEX ON "projects" ("is_featured");

CREATE INDEX ON "projects" ("created_by_user_id");

CREATE UNIQUE INDEX ON "project_members" ("project_id", "user_id");

CREATE INDEX ON "experiences" ("user_id");

CREATE INDEX ON "posts" ("author_id");

CREATE INDEX ON "posts" ("status");

CREATE INDEX ON "posts" ("published_at");

CREATE UNIQUE INDEX ON "nextauth_accounts" ("provider", "provider_account_id");

CREATE INDEX ON "nextauth_accounts" ("user_id");

CREATE INDEX ON "nextauth_sessions" ("user_id");

CREATE INDEX ON "nextauth_sessions" ("expires");

COMMENT ON COLUMN "posts"."content" IS 'Blog post content';

COMMENT ON COLUMN "home_sections"."section_key" IS 'hero, projects_summary, members_summary';

ALTER TABLE "member_profiles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "member_links" ADD FOREIGN KEY ("member_profile_id") REFERENCES "member_profiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "projects" ADD FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "project_members" ADD FOREIGN KEY ("project_id") REFERENCES "projects" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "project_members" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "experiences" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "posts" ADD FOREIGN KEY ("author_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "post_tags" ADD FOREIGN KEY ("post_id") REFERENCES "posts" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "post_tags" ADD FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "home_sections" ADD FOREIGN KEY ("updated_by_user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "nextauth_accounts" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "nextauth_sessions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;
