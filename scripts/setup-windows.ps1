$ErrorActionPreference = "Continue"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  NEON TASKER LABS - AUTOMATED SETUP AND CONTAINER BUILD" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host " [CREATED] .env initialized from template." -ForegroundColor Green
}

Write-Host "Building Node Workspaces and Core Packages..." -ForegroundColor Yellow
npm run build --workspaces --if-present

Write-Host "Starting Docker Services Stack..." -ForegroundColor Yellow
docker compose down -v
docker compose up -d --build

Start-Sleep -Seconds 6
powershell.exe -File .\scripts\healthcheck.ps1
