# One-Command Fast Deployment
# Packages and deploys CRM application to EC2

$ErrorActionPreference = "Stop"

Write-Host "`n" -NoNewline
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                        ║" -ForegroundColor Cyan
Write-Host "║     CRM Fast Deployment to EC2         ║" -ForegroundColor Cyan
Write-Host "║                                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Package
Write-Host "STEP 1: Packaging application..." -ForegroundColor Magenta
& .\scripts\package-for-deploy.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Packaging failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Deploy
Write-Host "`nSTEP 2: Deploying to EC2..." -ForegroundColor Magenta
& .\scripts\fast-deploy.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n" -NoNewline
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                        ║" -ForegroundColor Green
Write-Host "║        🎉 Deployment Success! 🎉       ║" -ForegroundColor Green
Write-Host "║                                        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

