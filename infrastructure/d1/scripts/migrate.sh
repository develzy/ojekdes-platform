#!/bin/bash
# Pindah ke root directory proyek
cd "$(dirname "$0")/../../.."

echo "==> Running D1 Database Migrations (Local)..."
npx wrangler d1 migrations apply ojekdes-db --local
