# Local Development Setup Guide

This guide explains how to set up and run the CRM application locally for development and testing.

## Quick Start

### Windows (PowerShell)
```powershell
.\start-local.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x start-local.sh
./start-local.sh
```

## Manual Setup

### 1. Backend Setup

```bash
cd backend

# Copy local environment configuration
cp .env.local .env

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\Activate.ps1  # Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start development server
python manage.py runserver 8000
```

### 2. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Copy local environment configuration
cp .env.local .env

# Install dependencies
npm install

# Start development server
npm run dev
```

## Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **Django Admin**: http://localhost:8000/admin/

## Default Credentials

- **Username**: admin
- **Password**: Admin@123

## Environment Configuration

### Local Development (.env.local)
- Uses SQLite database (no PostgreSQL needed)
- Backend runs on `localhost:8000`
- Frontend runs on `localhost:5173`
- DEBUG mode enabled
- Detailed logging

### Production (.env.production)
- Uses PostgreSQL database
- Backend behind Nginx proxy
- Frontend served by Nginx
- DEBUG mode disabled
- Production logging

## Switching Environments

### For Local Testing:
```bash
# Backend
cd backend && cp .env.local .env

# Frontend
cd frontend && cp .env.local .env
```

### For Production Build:
```bash
# Backend
cd backend && cp .env.production .env

# Frontend
cd frontend && cp .env.production .env
npm run build
```

## Troubleshooting

### Login Issues
- Ensure backend is running: http://localhost:8000/api/health
- Check frontend is using correct API URL in `.env`
- Verify CORS settings allow `localhost:5173`

### Database Issues
- Delete `backend/db.sqlite3` and run migrations again
- Ensure no old migrations are conflicting

### Port Already in Use
- Backend: Change port in `python manage.py runserver 8001`
- Frontend: Vite will automatically offer alternative port

### Module Not Found
- Backend: Ensure virtual environment is activated
- Frontend: Run `npm install` again

## Development Workflow

1. Make code changes
2. Backend auto-reloads on Python file changes
3. Frontend hot-reloads on React file changes
4. Test locally at `localhost:5173`
5. When ready, commit changes
6. Deploy to production

## Production Deployment

After local testing, deploy to EC2:

```bash
git add .
git commit -m "Your changes"
git push origin main

# On EC2
cd ~/crm-app
git pull origin main
cp backend/.env.production backend/.env
docker compose -f docker-compose.prod.yml up -d --build
```

## Key Files

- `backend/.env.local` - Local backend config
- `backend/.env.production` - Production backend config
- `frontend/.env.local` - Local frontend config
- `frontend/.env.production` - Production frontend config
- `start-local.ps1` - Windows quick start script
- `start-local.sh` - Linux/Mac quick start script

## Tips

- Always use `.env.local` for local development
- Never commit `.env` files (they're in `.gitignore`)
- Use `start-local` scripts for quick setup
- Test login locally before deploying to production
- Keep frontend dev server running for hot reload
