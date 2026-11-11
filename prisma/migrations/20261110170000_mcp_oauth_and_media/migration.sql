-- CreateEnum
CREATE TYPE "McpPreparationState" AS ENUM ('uploading', 'prepared', 'attached', 'deleting');

-- CreateTable
CREATE TABLE "mcp_image_preparations" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "connection_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "state" "McpPreparationState" NOT NULL DEFAULT 'uploading',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_image_preparations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_media" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "preparation_id" UUID,
    "storage_path" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_draft_requests" (
    "id" UUID NOT NULL,
    "connection_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "post_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_draft_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_browser_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "query_hash" TEXT NOT NULL,
    "csrf_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),

    CONSTRAINT "mcp_browser_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "mcp_image_preparations_storage_path_key" ON "mcp_image_preparations"("storage_path");

-- CreateIndex
CREATE INDEX "mcp_image_preparations_state_expires_at_idx" ON "mcp_image_preparations"("state", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "post_media_post_id_storage_path_key" ON "post_media"("post_id", "storage_path");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_draft_requests_connection_id_key_key" ON "mcp_draft_requests"("connection_id", "key");

-- CreateIndex
CREATE INDEX "mcp_browser_transactions_expires_at_idx" ON "mcp_browser_transactions"("expires_at");

-- AddForeignKey
ALTER TABLE "mcp_image_preparations" ADD CONSTRAINT "mcp_image_preparations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_preparation_id_fkey" FOREIGN KEY ("preparation_id") REFERENCES "mcp_image_preparations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_draft_requests" ADD CONSTRAINT "mcp_draft_requests_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_browser_transactions" ADD CONSTRAINT "mcp_browser_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Isolated Better Auth OAuth-only schema; generated for 1.7.19 with the repository patch.
create schema if not exists "mcp_oauth";

create table "mcp_oauth"."user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "panelUserId" text not null);

create table "mcp_oauth"."session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "mcp_oauth"."user" ("id") on delete cascade, "connectionId" text not null);

create table "mcp_oauth"."account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "mcp_oauth"."user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "mcp_oauth"."verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "mcp_oauth"."oauthClient" ("id" text not null primary key, "clientId" text not null unique, "clientSecret" text, "clientDiscoveryId" text, "disabled" boolean, "skipConsent" boolean, "enableEndSession" boolean, "subjectType" text, "scopes" jsonb, "clientCredentialsScopes" jsonb, "userId" text references "mcp_oauth"."user" ("id") on delete cascade, "createdAt" timestamptz, "updatedAt" timestamptz, "name" text, "uri" text, "icon" text, "contacts" jsonb, "tos" text, "policy" text, "softwareId" text, "softwareVersion" text, "softwareStatement" text, "redirectUris" jsonb not null, "postLogoutRedirectUris" jsonb, "backchannelLogoutUri" text, "backchannelLogoutSessionRequired" boolean, "tokenEndpointAuthMethod" text, "applicationType" text, "jwks" text, "jwksUri" text, "grantTypes" jsonb, "responseTypes" jsonb, "requirePKCE" boolean, "dpopBoundAccessTokens" boolean, "referenceId" text, "metadata" jsonb);

create table "mcp_oauth"."oauthResource" ("id" text not null primary key, "identifier" text not null unique, "name" text not null, "accessTokenTtl" integer, "refreshTokenTtl" integer, "signingAlgorithm" text, "signingKeyId" text, "allowedScopes" jsonb, "customClaims" jsonb, "dpopBoundAccessTokensRequired" boolean, "disabled" boolean, "createdAt" timestamptz, "updatedAt" timestamptz, "policyVersion" integer, "metadata" jsonb);

create table "mcp_oauth"."oauthClientResource" ("id" text not null primary key, "clientId" text not null references "mcp_oauth"."oauthClient" ("clientId") on delete cascade, "resourceId" text not null references "mcp_oauth"."oauthResource" ("identifier") on delete cascade, "metadata" jsonb, "createdAt" timestamptz);

create table "mcp_oauth"."oauthRefreshToken" ("id" text not null primary key, "familyId" text, "familyRevokedAt" timestamptz, "token" text not null unique, "clientId" text not null references "mcp_oauth"."oauthClient" ("clientId") on delete cascade, "sessionId" text references "mcp_oauth"."session" ("id") on delete set null, "userId" text not null references "mcp_oauth"."user" ("id") on delete cascade, "referenceId" text, "authorizationCodeId" text, "resources" jsonb, "requestedUserInfoClaims" jsonb, "expiresAt" timestamptz not null, "createdAt" timestamptz not null, "revoked" timestamptz, "rotatedAt" timestamptz, "rotationReplayResponse" text, "rotationReplayExpiresAt" timestamptz, "authTime" timestamptz, "confirmation" jsonb, "scopes" jsonb not null);

create table "mcp_oauth"."oauthAccessToken" ("id" text not null primary key, "token" text not null unique, "clientId" text not null references "mcp_oauth"."oauthClient" ("clientId") on delete cascade, "sessionId" text references "mcp_oauth"."session" ("id") on delete set null, "userId" text references "mcp_oauth"."user" ("id") on delete cascade, "referenceId" text, "authorizationCodeId" text, "resources" jsonb, "requestedUserInfoClaims" jsonb, "refreshId" text references "mcp_oauth"."oauthRefreshToken" ("id") on delete cascade, "expiresAt" timestamptz not null, "createdAt" timestamptz not null, "revoked" timestamptz, "confirmation" jsonb, "scopes" jsonb not null);

create table "mcp_oauth"."oauthConsent" ("id" text not null primary key, "clientId" text not null references "mcp_oauth"."oauthClient" ("clientId") on delete cascade, "userId" text references "mcp_oauth"."user" ("id") on delete cascade, "referenceId" text, "resources" jsonb, "requestedUserInfoClaims" jsonb, "scopes" jsonb not null, "createdAt" timestamptz not null, "updatedAt" timestamptz not null);

create table "mcp_oauth"."oauthClientAssertion" ("id" text not null primary key, "expiresAt" timestamptz not null);

create table "mcp_oauth"."rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "session_userId_idx" on "mcp_oauth"."session" ("userId");

create index "account_userId_idx" on "mcp_oauth"."account" ("userId");

create index "verification_identifier_idx" on "mcp_oauth"."verification" ("identifier");

create index "oauthClient_userId_idx" on "mcp_oauth"."oauthClient" ("userId");

create index "oauthClientResource_clientId_idx" on "mcp_oauth"."oauthClientResource" ("clientId");

create index "oauthClientResource_resourceId_idx" on "mcp_oauth"."oauthClientResource" ("resourceId");

create index "oauthRefreshToken_familyId_idx" on "mcp_oauth"."oauthRefreshToken" ("familyId");

create index "oauthRefreshToken_clientId_idx" on "mcp_oauth"."oauthRefreshToken" ("clientId");

create index "oauthRefreshToken_sessionId_idx" on "mcp_oauth"."oauthRefreshToken" ("sessionId");

create index "oauthRefreshToken_userId_idx" on "mcp_oauth"."oauthRefreshToken" ("userId");

create index "oauthRefreshToken_authorizationCodeId_idx" on "mcp_oauth"."oauthRefreshToken" ("authorizationCodeId");

create index "oauthAccessToken_clientId_idx" on "mcp_oauth"."oauthAccessToken" ("clientId");

create index "oauthAccessToken_sessionId_idx" on "mcp_oauth"."oauthAccessToken" ("sessionId");

create index "oauthAccessToken_userId_idx" on "mcp_oauth"."oauthAccessToken" ("userId");

create index "oauthAccessToken_authorizationCodeId_idx" on "mcp_oauth"."oauthAccessToken" ("authorizationCodeId");

create index "oauthAccessToken_refreshId_idx" on "mcp_oauth"."oauthAccessToken" ("refreshId");

create index "oauthConsent_clientId_idx" on "mcp_oauth"."oauthConsent" ("clientId");

create index "oauthConsent_userId_idx" on "mcp_oauth"."oauthConsent" ("userId");

create unique index "oauthClientResource_clientId_resourceId_uidx" on "mcp_oauth"."oauthClientResource" ("clientId", "resourceId");
-- Bind the separate OAuth identity to a real panel account without migrating credentials.
ALTER TABLE mcp_oauth."user" ADD COLUMN panel_user_uuid UUID GENERATED ALWAYS AS ("panelUserId"::uuid) STORED;
ALTER TABLE mcp_oauth."user" ADD CONSTRAINT mcp_panel_identity_matches CHECK (id = "panelUserId");
ALTER TABLE mcp_oauth."user" ADD CONSTRAINT mcp_panel_user_fk FOREIGN KEY (panel_user_uuid) REFERENCES public.users(id) ON DELETE CASCADE;
