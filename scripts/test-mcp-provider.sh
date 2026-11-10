#!/usr/bin/env bash
set -euo pipefail

# Shares the repository's ephemeral test infrastructure, never the development DB.
if [[ ! -f .env.test ]]; then
  echo 'Missing .env.test for the ephemeral PostgreSQL tests.'
  exit 1
fi
set -a
source .env.test
set +a

MCP_TEST_COMPOSE=(docker compose --project-name kiwibit-e2e -f docker-compose.e2e.yml)
cleanup() {
  "${MCP_TEST_COMPOSE[@]}" down --volumes --remove-orphans --timeout 10
}
trap cleanup EXIT
"${MCP_TEST_COMPOSE[@]}" up -d --wait --wait-timeout 90 db
export MCP_PROVIDER_POSTGRES_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5434/${POSTGRES_DB}"
npm run test:mcp-provider
