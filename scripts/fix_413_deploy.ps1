# ============================================
# Fix 413 Error - Deployment Script (PowerShell)
# ============================================
# This script rebuilds and redeploys the application
# with updated upload size limits
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Fixing 413 Request Entity Too Large Error" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if docker-compose is available
try {
    docker-compose --version | Out-Null
}
catch {
    Write-Host "Error: docker-compose is not installed" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Stopping current services..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down

Write-Host ""
Write-Host "Step 2: Rebuilding backend (with new Django settings)..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build --no-cache backend

Write-Host ""
Write-Host "Step 3: Rebuilding frontend (with new Nginx config)..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build --no-cache frontend

Write-Host ""
Write-Host "Step 4: Starting all services..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d

Write-Host ""
Write-Host "Step 5: Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Step 6: Checking service status..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml ps

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Upload limits have been increased to:"
Write-Host "  - Nginx: 100MB"
Write-Host "  - Django: 100MB"
Write-Host "  - Gunicorn timeout: 300 seconds"
Write-Host ""
Write-Host "You can now upload large datasets without 413 errors."
Write-Host ""
Write-Host "To view logs:"
Write-Host "  docker-compose -f docker-compose.prod.yml logs -f"
Write-Host ""
