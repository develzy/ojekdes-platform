$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
cd "$ScriptDir\..\..\.."

Write-Host "==> Running D1 Database Migrations (Local)..." -ForegroundColor Green
cmd /c "npx wrangler d1 migrations apply ojekdes-db --local"
