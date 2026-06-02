$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
cd "$ScriptDir\..\..\.."

Write-Host "==> Seeding D1 Database (Local)..." -ForegroundColor Green

Write-Host "Applying geography seed (0001_villages.sql)..." -ForegroundColor Cyan
cmd /c "npx wrangler d1 execute ojekdes-db --local --file=infrastructure/d1/seeds/0001_villages.sql"

Write-Host "Applying pricing seed (0002_tariffs.sql)..." -ForegroundColor Cyan
cmd /c "npx wrangler d1 execute ojekdes-db --local --file=infrastructure/d1/seeds/0002_tariffs.sql"

Write-Host "Applying development data seed (dev_seed.sql)..." -ForegroundColor Cyan
cmd /c "npx wrangler d1 execute ojekdes-db --local --file=infrastructure/d1/seeds/dev_seed.sql"

Write-Host "==> Seeding Completed." -ForegroundColor Green
