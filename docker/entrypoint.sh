#!/bin/sh
set -e

echo "Applying database schema..."
npx tsx scripts/migrate.ts

echo "Seeding rooms (idempotent, safe to re-run)..."
npx tsx scripts/seed.ts

exec "$@"
