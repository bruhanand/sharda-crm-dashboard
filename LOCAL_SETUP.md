# Local Development Setup (Without Docker)

This guide will help you set up the CRM application for local development without using Docker.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python** >= 3.11
- **Node.js** >= 18
- **npm** (comes with Node.js)
- **Git**

### Verify Installation

```bash
# Check Python version
python --version  # Should be 3.11 or higher
# OR
python3 --version

# Check Node.js version
node --version  # Should be 18 or higher

# Check npm version
npm --version
```

---

## 🚀 Quick Start (Automated)

### For Windows (PowerShell)

```powershell
.\start-local.ps1
```

### For Linux/Mac (Bash)

```bash
chmod +x start-local.sh
./start-local.sh
```

The scripts will automatically:
- ✅ Create Python virtual environment
- ✅ Install backend dependencies
- ✅ Set up database (SQLite)
- ✅ Install frontend dependencies
- ✅ Start both servers

---

## 📝 Manual Setup (Step by Step)

If you prefer to set up manually or the automated script doesn't work:

### Step 1: Clone Repository (if not already done)

```bash
git clone <repository-url>
cd crm-sharda
```

### Step 2: Backend Setup

#### 2.1 Navigate to Backend Directory

```bash
cd backend
```

#### 2.2 Create Environment File

Create a `.env.local` file in the `backend/` directory:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env.local
# OR create manually
```

**Linux/Mac:**
```bash
cp .env.example .env.local
# OR create manually
```

**If `.env.example` doesn't exist, create `.env.local` with:**

```env
# Django Settings
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (Leave empty for SQLite, or configure PostgreSQL)
# For SQLite (default for local dev):
# DB_PASSWORD=

# For PostgreSQL (optional):
# DB_ENGINE=django.db.backends.postgresql
# DB_NAME=crm_database
# DB_USER=crm_user
# DB_PASSWORD=your_db_password
# DB_HOST=localhost
# DB_PORT=5432

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
CORS_ALLOW_CREDENTIALS=true
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://localhost:5174

# Logging
LOG_LEVEL=INFO
```

**Generate a secret key:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### 2.3 Create Python Virtual Environment

**Windows:**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### 2.4 Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 2.5 Run Database Migrations

```bash
python manage.py migrate
```

#### 2.6 Create Superuser (Admin Account)

```bash
python manage.py createsuperuser
```

Follow the prompts to create your admin account.

#### 2.7 Start Backend Server

```bash
python manage.py runserver 8000
```

The backend should now be running at **http://localhost:8000**

**Verify it's working:**
- Open http://localhost:8000/api/health/ in your browser
- You should see a JSON response with status "healthy"

---

### Step 3: Frontend Setup

Open a **new terminal window** (keep backend running in the first terminal).

#### 3.1 Navigate to Frontend Directory

```bash
cd frontend
```

#### 3.2 Create Environment File

Create a `.env.local` file in the `frontend/` directory:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env.local
# OR create manually
```

**Linux/Mac:**
```bash
cp .env.example .env.local
# OR create manually
```

**If `.env.example` doesn't exist, create `.env.local` with:**

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

#### 3.3 Install Dependencies

```bash
npm install
```

#### 3.4 Start Frontend Development Server

```bash
npm run dev
```

The frontend should now be running at **http://localhost:5173** (or http://localhost:5174)

---

## ✅ Verify Setup

### 1. Check Backend
- Open: http://localhost:8000/api/health/
- Expected: JSON response with `"status": "healthy"`

### 2. Check Frontend
- Open: http://localhost:5173 (or the port shown in terminal)
- Expected: Login page

### 3. Test Login
- Use the superuser credentials you created
- You should be redirected to the dashboard

---

## 🌐 Application URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:5173 | Main application UI |
| **Backend API** | http://localhost:8000/api/v1 | REST API endpoints |
| **Django Admin** | http://localhost:8000/admin/ | Django admin panel |
| **Health Check** | http://localhost:8000/api/health/ | System health status |

---

## 🛑 Stopping Servers

### If using automated scripts:
- Press `Ctrl+C` in the terminal

### If started manually:
- Press `Ctrl+C` in each terminal window running the servers

### Force stop (Windows PowerShell):
```powershell
# Stop backend
Get-Process python | Where-Object {$_.Path -like "*venv*"} | Stop-Process -Force

# Stop frontend
Get-Process node | Stop-Process -Force
```

### Force stop (Linux/Mac):
```bash
# Stop backend
pkill -f "python.*manage.py runserver"

# Stop frontend
pkill -f "node.*vite"
```

---

## 🔧 Troubleshooting

### Problem: Port Already in Use

**Backend (port 8000):**

**Windows:**
```powershell
netstat -ano | findstr :8000
# Note the PID, then:
Stop-Process -Id <PID> -Force
```

**Linux/Mac:**
```bash
lsof -ti:8000 | xargs kill -9
```

**Frontend (port 5173):**

**Windows:**
```powershell
netstat -ano | findstr :5173
Stop-Process -Id <PID> -Force
```

**Linux/Mac:**
```bash
lsof -ti:5173 | xargs kill -9
```

### Problem: Python Virtual Environment Issues

**Recreate virtual environment:**
```bash
# Remove old venv
rm -rf venv  # Linux/Mac
# OR
Remove-Item -Recurse -Force venv  # Windows PowerShell

# Create new venv
python -m venv venv  # or python3
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\Activate.ps1  # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### Problem: Node Modules Issues

**Reinstall node modules:**
```bash
cd frontend
rm -rf node_modules package-lock.json  # Linux/Mac
# OR
Remove-Item -Recurse -Force node_modules, package-lock.json  # Windows

npm install
```

### Problem: Database Migration Errors

**Reset database (⚠️ This will delete all data):**
```bash
cd backend
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows

# Delete database
rm db.sqlite3  # Linux/Mac
# OR
Remove-Item db.sqlite3  # Windows

# Run migrations
python manage.py migrate

# Create superuser again
python manage.py createsuperuser
```

### Problem: CORS Errors

**Check your `.env.local` files:**
- Backend: `CORS_ALLOWED_ORIGINS` should include your frontend URL
- Frontend: `VITE_API_BASE_URL` should match your backend URL

**Example:**
```env
# backend/.env.local
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# frontend/.env.local
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Problem: Module Not Found Errors

**Backend:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

---

## 📦 Database Options

### SQLite (Default - Recommended for Local Development)

No additional setup needed! The application will use SQLite automatically if `DB_PASSWORD` is not set in `.env.local`.

**Pros:**
- ✅ No installation required
- ✅ Perfect for local development
- ✅ Fast and simple

**Cons:**
- ❌ Not suitable for production
- ❌ Limited concurrent access

### PostgreSQL (Optional)

If you want to use PostgreSQL locally:

1. **Install PostgreSQL:**
   - Windows: Download from https://www.postgresql.org/download/windows/
   - Mac: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql`

2. **Create Database:**
   ```bash
   createdb crm_database
   # OR using psql:
   psql -U postgres
   CREATE DATABASE crm_database;
   CREATE USER crm_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE crm_database TO crm_user;
   ```

3. **Update `backend/.env.local`:**
   ```env
   DB_ENGINE=django.db.backends.postgresql
   DB_NAME=crm_database
   DB_USER=crm_user
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   ```

---

## 🔄 Daily Development Workflow

1. **Start Backend:**
   ```bash
   cd backend
   source venv/bin/activate  # or .\venv\Scripts\Activate.ps1
   python manage.py runserver 8000
   ```

2. **Start Frontend (new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Make Changes:**
   - Backend: Edit files in `backend/crm/` - server auto-reloads
   - Frontend: Edit files in `frontend/src/` - Vite hot-reloads

4. **Test Changes:**
   - Refresh browser to see frontend changes
   - Backend changes apply automatically

---

## 📚 Additional Resources

- **Backend API Docs**: http://localhost:8000/api/docs/
- **Django Admin**: http://localhost:8000/admin/
- **Project README**: See `README.md` for more information

---

## 🆘 Getting Help

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review error messages in terminal windows
3. Check that all prerequisites are installed correctly
4. Verify environment files are configured properly
5. Ensure ports 8000 and 5173 are not in use by other applications

---

**Happy Coding! 🚀**


