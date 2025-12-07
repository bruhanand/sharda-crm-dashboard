# ============================================
# Deploy Sharda CRM to EC2
# ============================================
# This script automates the deployment process
# Target: 65.0.7.221
# ============================================

param(
    [switch]$SkipGitPush,
    [switch]$FirstTime
)

$ErrorActionPreference = "Stop"

# Configuration
$EC2_IP = "15.207.55.179"
$PEM_PATH = "C:\Users\akaaa\Downloads\sharda-crm-pem.pem"
$APP_DIR = "~/crm-app"
$LOCAL_DIR = "C:\Users\akaaa\Desktop\crm-sharda\crm-sharda"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Sharda CRM - EC2 Deployment Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Target: $EC2_IP" -ForegroundColor Yellow
Write-Host ""

# Step 1: Git operations
if (-not $SkipGitPush) {
    Write-Host "[1/6] Pushing code to GitHub..." -ForegroundColor Green
    
    Set-Location $LOCAL_DIR
    
    try {
        git add .
        $commitMsg = "Deploy to EC2 $EC2_IP - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git commit -m $commitMsg
        git push origin main
        Write-Host "  ✓ Code pushed to GitHub" -ForegroundColor Green
    }
    catch {
        Write-Host "  ! No changes to commit or push failed" -ForegroundColor Yellow
    }
}
else {
    Write-Host "[1/6] Skipping Git push..." -ForegroundColor Yellow
}

# Step 2: Test SSH connection
Write-Host ""
Write-Host "[2/6] Testing SSH connection..." -ForegroundColor Green

$sshTest = ssh -i $PEM_PATH -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$EC2_IP "echo Connected"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Cannot connect to EC2 instance" -ForegroundColor Red
    Write-Host "  Check: 1) Instance is running, 2) Security group allows SSH, 3) PEM file is correct" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ SSH connection successful" -ForegroundColor Green

# Step 3: Setup EC2 (first time only)
if ($FirstTime) {
    Write-Host ""
    Write-Host "[3/6] Setting up EC2 environment (first time)..." -ForegroundColor Green
    
    Write-Host "  Installing Docker..." -ForegroundColor Cyan
    ssh -i $PEM_PATH ubuntu@$EC2_IP "sudo apt-get update -qq; sudo apt-get install -y ca-certificates curl gnupg lsb-release"
    Write-Host "  Adding Docker repository..." -ForegroundColor Cyan
    ssh -i $PEM_PATH ubuntu@$EC2_IP "sudo mkdir -p /etc/apt/keyrings; curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg"
    ssh -i $PEM_PATH ubuntu@$EC2_IP 'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null'
    Write-Host "  Installing Docker packages..." -ForegroundColor Cyan
    ssh -i $PEM_PATH ubuntu@$EC2_IP "sudo apt-get update -qq; sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin"
    ssh -i $PEM_PATH ubuntu@$EC2_IP "sudo usermod -aG docker ubuntu"
    Write-Host "  Installing additional tools..." -ForegroundColor Cyan
    ssh -i $PEM_PATH ubuntu@$EC2_IP "sudo apt-get install -y git htop curl nano"
    ssh -i $PEM_PATH ubuntu@$EC2_IP "mkdir -p ~/crm-app/logs ~/crm-app/backups"
    
    Write-Host "  ✓ EC2 environment setup complete" -ForegroundColor Green
    Write-Host "  ⚠ Docker permissions will take effect on next SSH session" -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "[3/6] Skipping EC2 setup (use -FirstTime flag for initial setup)..." -ForegroundColor Yellow
}

# Step 4: Clone/Update code on EC2
Write-Host ""
Write-Host "[4/6] Updating code on EC2..." -ForegroundColor Green

$gitCheck = ssh -i $PEM_PATH ubuntu@$EC2_IP "test -d ~/crm-app/.git && echo exists || echo notfound"
if ($gitCheck -match "exists") {
    Write-Host "  Pulling latest changes..." -ForegroundColor Cyan
    ssh -i $PEM_PATH ubuntu@$EC2_IP "cd ~/crm-app; git pull origin main"
}
else {
    Write-Host " Cloning repository..." -ForegroundColor Cyan
    ssh -i $PEM_PATH ubuntu@$EC2_IP "git clone https://github.com/bruhanand/sharda-crm-dashboard.git ~/crm-app"
}

ssh -i $PEM_PATH ubuntu@$EC2_IP "mkdir -p ~/crm-app/logs ~/crm-app/backups"
Write-Host "  ✓ Code updated on EC2" -ForegroundColor Green

# Step 5: Build and deploy containers
Write-Host ""
Write-Host "[5/6] Building and deploying Docker containers..." -ForegroundColor Green
Write-Host "  This may take 5-10 minutes on first run..." -ForegroundColor Yellow

ssh -i $PEM_PATH ubuntu@$EC2_IP "cd ~/crm-app; docker compose -f docker-compose.prod.yml up -d --build"

Write-Host "  Waiting for containers to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

ssh -i $PEM_PATH ubuntu@$EC2_IP "cd ~/crm-app; docker compose -f docker-compose.prod.yml ps"
Write-Host "  ✓ Containers deployed" -ForegroundColor Green

# Step 6: Verify deployment
Write-Host ""
Write-Host "[6/6] Verifying deployment..." -ForegroundColor Green

Start-Sleep -Seconds 5

$healthCheck = ssh -i $PEM_PATH ubuntu@$EC2_IP "curl -s http://localhost:8000/api/health/ 2>&1"
if ($healthCheck -match "healthy" -or $healthCheck -match "status") {
    Write-Host "  ✓ Backend health check passed" -ForegroundColor Green
}
else {
    Write-Host "  ⚠ Backend health check: $healthCheck" -ForegroundColor Yellow
}

$frontendCheck = ssh -i $PEM_PATH ubuntu@$EC2_IP "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/"
if ($frontendCheck -eq "200") {
    Write-Host "  ✓ Frontend is accessible" -ForegroundColor Green
}
else {
    Write-Host "  ⚠ Frontend returned HTTP $frontendCheck" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application URLs:" -ForegroundColor Yellow
Write-Host "  Frontend:    http://$EC2_IP" -ForegroundColor White
Write-Host "  API Health:  http://$EC2_IP/api/health/" -ForegroundColor White
Write-Host "  Admin:       http://$EC2_IP/admin/" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Open http://$EC2_IP in your browser" -ForegroundColor White
Write-Host "  2. Check LOGIN_CREDENTIALS.md for login details" -ForegroundColor White
Write-Host "  3. Monitor logs: ssh -i $PEM_PATH ubuntu@$EC2_IP 'cd ~/crm-app; docker compose -f docker-compose.prod.yml logs -f'" -ForegroundColor White
Write-Host ""
