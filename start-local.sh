#!/bin/bash
# Start Local Development Environment (Linux/Mac)
# This script sets up the local development environment for the CRM application

echo "🚀 Starting CRM Local Development Environment..."
echo ""

# Check if we're in the project root
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Setup Backend
echo "📦 Setting up Backend..."
cd backend

# Copy local environment file
if [ -f ".env.local" ]; then
    cp .env.local .env
    echo "✅ Backend .env configured from .env.local"
elif [ -f ".env.example" ]; then
    cp .env.example .env
    echo "✅ Backend .env created from .env.example"
    echo "⚠️  Please update backend/.env with your SECRET_KEY and settings"
else
    echo "❌ Error: .env.local or .env.example not found in backend directory"
    echo "   Please create backend/.env.local or backend/.env.example"
    cd ..
    exit 1
fi

# Create virtual environment if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📦 Installing/updating dependencies..."
pip install -r requirements.txt -q

# Run migrations
echo "🔄 Running database migrations..."
python manage.py migrate

echo ""
echo "💡 Tip: Create a superuser if needed with: python manage.py createsuperuser"

# Start Django development server in background
echo "🌐 Starting Django backend at http://localhost:8000..."
python manage.py runserver 8000 &
BACKEND_PID=$!

cd ..

# Setup Frontend
echo ""
echo "📦 Setting up Frontend..."
cd frontend

# Copy local environment file
if [ -f ".env.local" ]; then
    cp .env.local .env
    echo "✅ Frontend .env configured from .env.local"
elif [ -f ".env.example" ]; then
    cp .env.example .env
    echo "✅ Frontend .env created from .env.example"
else
    echo "❌ Error: .env.local or .env.example not found in frontend directory"
    echo "   Please create frontend/.env.local or frontend/.env.example"
    kill $BACKEND_PID
    cd ..
    exit 1
fi

# Install Node dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node dependencies..."
    npm install
fi

# Start Vite development server
echo "🌐 Starting Vite frontend at http://localhost:5173..."
echo ""
echo "✨ Local development environment is ready!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo "   Admin:    http://localhost:8000/admin/"
echo ""
echo "Press Ctrl+C to stop..."
echo ""

npm run dev

# Cleanup: Kill backend server when frontend stops
kill $BACKEND_PID
cd ..
