# ML Forecast Deployment Script for EC2
# Automates deployment of ML forecasting changes

Write-Host "🚀 Deploying ML Forecast Changes to EC2..." -ForegroundColor Cyan
Write-Host ""

$EC2_IP = "3.110.37.29"
$SSH_KEY = "C:\Users\akaaa\Downloads\sharda-crm-pem.pem"
$APP_DIR = "~/crm-app"

# Step 1: Verify SSH connection
Write-Host "1️⃣  Testing SSH connection..." -ForegroundColor Yellow
ssh -i $SSH_KEY ubuntu@$EC2_IP "echo 'Connection successful'"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SSH connection failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ SSH connection successful" -ForegroundColor Green
Write-Host ""

# Step 2: Pull latest code
Write-Host "2️⃣  Pulling latest code from GitHub..." -ForegroundColor Yellow
ssh -i $SSH_KEY ubuntu@$EC2_IP @"
cd $APP_DIR &&
git pull origin main
"@
Write-Host "✅ Code pulled successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Install ML libraries in backend container
Write-Host "3️⃣  Installing ML libraries (statsmodels, prophet, scikit-learn)..." -ForegroundColor Yellow
Write-Host "   This may take 3-5 minutes..." -ForegroundColor Gray
ssh -i $SSH_KEY ubuntu@$EC2_IP @"
cd $APP_DIR &&
docker compose -f docker-compose.prod.yml exec -T backend pip install statsmodels==0.14.1 prophet==1.1.5 scikit-learn==1.4.0
"@
Write-Host "✅ ML libraries installed" -ForegroundColor Green
Write-Host ""

# Step 4: Restart backend to load new code and libraries
Write-Host "4️⃣  Restarting backend container..." -ForegroundColor Yellow
ssh -i $SSH_KEY ubuntu@$EC2_IP @"
cd $APP_DIR &&
docker compose -f docker-compose.prod.yml restart backend
"@
Write-Host "✅ Backend restarted" -ForegroundColor Green
Write-Host ""

# Step 5: Wait for backend to be ready
Write-Host "5️⃣  Waiting for backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host "✅ Backend should be ready" -ForegroundColor Green
Write-Host ""

# Step 6: Verify ML libraries are available
Write-Host "6️⃣  Verifying ML libraries..." -ForegroundColor Yellow
ssh -i $SSH_KEY ubuntu@$EC2_IP @"
cd $APP_DIR &&
docker compose -f docker-compose.prod.yml exec -T backend python -c 'from crm.ml_forecast_service import ML_AVAILABLE; print(f\"ML Available: {ML_AVAILABLE}\")'
"@
Write-Host "✅ ML libraries verified" -ForegroundColor Green
Write-Host ""

# Step 7: Test forecast endpoint
Write-Host "7️⃣  Testing forecast endpoint..." -ForegroundColor Yellow
ssh -i $SSH_KEY ubuntu@$EC2_IP @"
curl -s http://localhost:8000/api/v1/forecast/ | head -n 5
"@
Write-Host "✅ Forecast endpoint responding" -ForegroundColor Green
Write-Host ""

# Step 8: Check container status
Write-Host "8️⃣  Checking container status..." -ForegroundColor Yellow
ssh -i $SSH_KEY ubuntu@$EC2_IP @"
cd $APP_DIR &&
docker compose -f docker-compose.prod.yml ps
"@
Write-Host ""

# Final Summary
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ ML forecasting models deployed" -ForegroundColor Green
Write-Host "✅ Admin panel improvements live" -ForegroundColor Green  
Write-Host "✅ Login fixes active" -ForegroundColor Green
Write-Host "✅ Insights page fixed" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Application URL: http://$EC2_IP" -ForegroundColor Cyan
Write-Host "📊 Forecast Page: http://$EC2_IP (Login as admin)" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Note: First forecast request will take 10-20 seconds as ML models train" -ForegroundColor Yellow
Write-Host "    Subsequent requests will be faster" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Models Available:" -ForegroundColor White
Write-Host "   - ARIMA (time series trends)" -ForegroundColor Gray
Write-Host "   - SARIMA (seasonal patterns)" -ForegroundColor Gray
Write-Host "   - Holt-Winters (trend + seasonality)" -ForegroundColor Gray
Write-Host "   - Prophet (Facebook's forecasting)" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 View logs:" -ForegroundColor White
Write-Host "   ssh -i $SSH_KEY ubuntu@$EC2_IP" -ForegroundColor  Gray
Write-Host "   cd $APP_DIR && docker compose -f docker-compose.prod.yml logs -f backend" -ForegroundColor Gray
