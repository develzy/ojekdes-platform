#!/bin/bash
# Pindah ke root directory proyek
cd "$(dirname "$0")/../../.."

echo "==> Resetting D1 Database (Local)..."

echo "Wiping local wrangler state..."
rm -rf .wrangler

echo "Running migrations..."
npx wrangler d1 migrations apply ojekdes-db --local

echo "Running seeds..."
npx wrangler d1 execute ojekdes-db --local --file=infrastructure/d1/seeds/0001_villages.sql
npx wrangler d1 execute ojekdes-db --local --file=infrastructure/d1/seeds/0002_tariffs.sql
npx wrangler d1 execute ojekdes-db --local --file=infrastructure/d1/seeds/dev_seed.sql

echo "==> Database Reset Successfully."
