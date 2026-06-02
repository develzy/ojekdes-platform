#!/bin/bash
# Pindah ke root directory proyek
cd "$(dirname "$0")/../../.."

echo "==> Seeding D1 Database (Local)..."

echo "Applying geography seed (0001_villages.sql)..."
npx wrangler d1 execute ojekdes-db --local --file=infrastructure/d1/seeds/0001_villages.sql

echo "Applying pricing seed (0002_tariffs.sql)..."
npx wrangler d1 execute ojekdes-db --local --file=infrastructure/d1/seeds/0002_tariffs.sql

echo "Applying development data seed (dev_seed.sql)..."
npx wrangler d1 execute ojekdes-db --local --file=infrastructure/d1/seeds/dev_seed.sql

echo "==> Seeding Completed."
