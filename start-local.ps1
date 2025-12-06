# Start Local Development Environment (Windows PowerShell)
# This script sets up the local development environment for the CRM application

Write-Host "🚀 Starting CRM Local Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the project root
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Setup Backend
Write-Host "📦 Setting up Backend..." -ForegroundColor Yellow
cd backend

# Copy local environment file
if (Test-Path ".env.local") {
    Copy-Item .env.local .env -Force
    Write-Host "✅ Backend .env configured for local development" -ForegroundColor Green
}
else {
    Write-Host "❌ Error: .env.local not found in backend directory" -ForegroundColor Red
    cd ..
    exit 1
}

# Install Python dependencies if needed
if (-not (Test-Path "venv")) {
    Write-Host "📦 Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "📦 Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

Write-Host "📦 Installing/updating dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt -q

# Run migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
python manage.py migrate

# Create superuser if needed (optional)
Write-Host ""
Write-Host "💡 Tip: Create a superuser if needed with: python manage.py createsuperuser" -ForegroundColor Cyan

# Start Django development server in background
Write-Host "🌐 Starting Django backend at http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$pwd'; .\venv\Scripts\Activate.ps1; python manage.py runserver 8000"

cd ..

# Setup Frontend
Write-Host ""
Write-Host "📦 Setting up Frontend..." -ForegroundColor Yellow
cd frontend

# Copy local environment file
if (Test-Path ".env.local") {
    Copy-Item .env.local .env -Force
    Write-Host "✅ Frontend .env configured for local development" -ForegroundColor Green
}
else {
    Write-Host "❌ Error: .env.local not found in frontend directory" -ForegroundColor Red
    cd ..
    exit 1
}

# Install Node dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing Node dependencies..." -ForegroundColor Yellow
    npm install
}

# Start Vite development server
Write-Host "🌐 Starting Vite frontend at http://localhost:5173..." -ForegroundColor Green
Write-Host ""
Write-Host "✨ Local development environment is ready!" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Admin:    http://localhost:8000/admin/" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop..." -ForegroundColor Yellow
Write-Host ""

npm run dev

cd ..
