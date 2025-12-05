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
$EC2_IP = "65.0.7.221"
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

$sshTest = ssh -i $PEM_PATH -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$EC2_IP "echo 'Connected'"
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
    
    $setupScript = @"
#!/bin/bash
set -e

echo "Updating system packages..."
sudo apt-get update -qq

echo "Installing Docker..."
if ! command -v docker &> /dev/null; then
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -qq
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker ubuntu
    echo "Docker installed successfully"
else
    echo "Docker already installed"
fi

echo "Installing additional tools..."
sudo apt-get install -y git htop curl nano

echo "Creating app directory..."
mkdir -p $APP_DIR/logs $APP_DIR/backups

echo "Setup complete!"
"@
    
    $setupScript | ssh -i $PEM_PATH ubuntu@$EC2_IP "cat > /tmp/setup.sh && bash /tmp/setup.sh"
    Write-Host "  ✓ EC2 environment setup complete" -ForegroundColor Green
    Write-Host "  ⚠ You may need to reconnect SSH for Docker permissions" -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "[3/6] Skipping EC2 setup (use -FirstTime flag for initial setup)..." -ForegroundColor Yellow
}

# Step 4: Clone/Update code on EC2
Write-Host ""
Write-Host "[4/6] Updating code on EC2..." -ForegroundColor Green

$deployScript = @"
#!/bin/bash
set -e

cd $APP_DIR

# Clone or pull
if [ -d .git ]; then
    echo "Pulling latest changes..."
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/bruhanand/sharda-crm-dashboard.git .
fi

echo "Creating directories..."
mkdir -p logs backups

echo "Code updated!"
"@

$deployScript | ssh -i $PEM_PATH ubuntu@$EC2_IP "cat > /tmp/deploy-update.sh && bash /tmp/deploy-update.sh"
Write-Host "  ✓ Code updated on EC2" -ForegroundColor Green

# Step 5: Build and deploy containers
Write-Host ""
Write-Host "[5/6] Building and deploying Docker containers..." -ForegroundColor Green
Write-Host "  This may take 5-10 minutes on first run..." -ForegroundColor Yellow

$dockerScript = @"
#!/bin/bash
set -e

cd $APP_DIR

echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Waiting for containers to start..."
sleep 10

echo "Container status:"
docker compose -f docker-compose.prod.yml ps

echo "Deployment complete!"
"@

$dockerScript | ssh -i $PEM_PATH ubuntu@$EC2_IP "cat > /tmp/docker-deploy.sh && bash /tmp/docker-deploy.sh"
Write-Host "  ✓ Containers deployed" -ForegroundColor Green

# Step 6: Verify deployment
Write-Host ""
Write-Host "[6/6] Verifying deployment..." -ForegroundColor Green

Start-Sleep -Seconds 5

$healthCheck = ssh -i $PEM_PATH ubuntu@$EC2_IP "curl -s http://localhost:8000/api/health/ || echo 'FAILED'"
if ($healthCheck -match "healthy" -or $healthCheck -match "status") {
    Write-Host "  ✓ Backend health check passed" -ForegroundColor Green
}
else {
    Write-Host "  ⚠ Backend health check may have issues" -ForegroundColor Yellow
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
Write-Host "  3. Monitor logs: ssh -i `"$PEM_PATH`" ubuntu@$EC2_IP 'cd $APP_DIR && docker compose -f docker-compose.prod.yml logs -f'" -ForegroundColor White
Write-Host ""
Write-Host "View logs with:" -ForegroundColor Yellow
Write-Host "  ssh -i `"$PEM_PATH`" ubuntu@$EC2_IP 'cd $APP_DIR && docker compose -f docker-compose.prod.yml logs -f'" -ForegroundColor Gray
Write-Host ""
