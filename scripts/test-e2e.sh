#!/usr/bin/env bash
set -euo pipefail

E2E_PORT=3001
E2E_DB_PORT=5434
E2E_BASE_URL="http://localhost:${E2E_PORT}"
NEXT_PID=""

# ── cleanup ──────────────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "🧹 Cleaning up..."
  if [[ -n "$NEXT_PID" ]] && kill -0 "$NEXT_PID" 2>/dev/null; then
    kill "$NEXT_PID" 2>/dev/null || true
  fi
  docker compose -f docker-compose.e2e.yml down --volumes --remove-orphans --timeout 10 2>/dev/null || true
  return 0
}
trap cleanup EXIT

# ── load env ─────────────────────────────────────────────────────────────────
if [[ -f .env.test ]]; then
  ENV_FILE=".env.test"
elif [[ -f .env ]]; then
  ENV_FILE=".env"
else
  echo "❌ No .env.test or .env file found. Copy .env.example to .env.test and configure it."
  exit 1
fi
echo "📄 Loading environment from ${ENV_FILE}"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
export NEXTAUTH_URL="$E2E_BASE_URL"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${E2E_DB_PORT}/${POSTGRES_DB}?schema=public"

# ── start database ────────────────────────────────────────────────────────────
echo "🐳 Starting ephemeral E2E database (port ${E2E_DB_PORT}, no volume)..."
docker compose -f docker-compose.e2e.yml up -d

echo "⏳ Waiting for database to be healthy..."
MAX_DB_WAIT=90
WAITED=0
until [[ "$(docker inspect kiwibit-postgres-e2e --format='{{.State.Health.Status}}' 2>/dev/null)" == "healthy" ]]; do
  if (( WAITED >= MAX_DB_WAIT )); then
    echo "❌ Database health check timed out after ${MAX_DB_WAIT}s"
    exit 1
  fi
  sleep 3
  WAITED=$(( WAITED + 3 ))
done
echo "✅ Database is healthy"

# ── run migrations ────────────────────────────────────────────────────────────
echo "🔄 Running database migrations..."
npx prisma migrate deploy
echo "✅ Migrations applied"

# ── generate prisma client ────────────────────────────────────────────────────
echo "⚙️  Generating Prisma Client..."
npx prisma generate --schema=prisma/schema.prisma
echo "✅ Prisma Client generated"

# ── start Next.js dev server ──────────────────────────────────────────────────
echo "🚀 Starting Next.js on port ${E2E_PORT}..."
PORT=$E2E_PORT npx next dev -p "$E2E_PORT" > /tmp/next-e2e.log 2>&1 &
NEXT_PID=$!

echo "⏳ Waiting for Next.js to be ready..."
MAX_NEXT_WAIT=120
WAITED=0
until curl -sf "${E2E_BASE_URL}/api/auth/csrf" > /dev/null 2>&1; do
  if ! kill -0 "$NEXT_PID" 2>/dev/null; then
    echo "❌ Next.js process died. Logs:"
    cat /tmp/next-e2e.log
    exit 1
  fi
  if (( WAITED >= MAX_NEXT_WAIT )); then
    echo "❌ Next.js startup timed out after ${MAX_NEXT_WAIT}s. Logs:"
    cat /tmp/next-e2e.log
    exit 1
  fi
  sleep 3
  WAITED=$(( WAITED + 3 ))
done
echo "✅ Next.js is ready"

# ── run E2E tests ─────────────────────────────────────────────────────────────
echo ""
echo "🧪 Running E2E tests..."
E2E_BASE_URL="$E2E_BASE_URL" npx jest --config jest.config.e2e.cjs --forceExit
