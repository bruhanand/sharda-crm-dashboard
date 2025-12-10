# 🚀 How to Run the CRM Application

## ✅ Current Status
Both servers are **RUNNING** successfully!

- ✅ **Backend**: Running on http://localhost:8000
- ✅ **Frontend**: Running on http://localhost:5174

---

## 📋 Quick Start (Easiest Method)

### Option 1: Use the Startup Script (Recommended)

1. **Navigate to the project folder**:
   ```powershell
   cd c:\Users\akaaa\Downloads\crm-sharda
   ```

2. **Run the startup script**:
   ```powershell
   .\start_servers.ps1
   ```
   
   This will:
   - ✅ Check for and stop any existing servers
   - ✅ Start the backend server (Django)
   - ✅ Start the frontend server (Vite)
   - ✅ Automatically open your browser to http://localhost:5174

3. **Login** with the administrator account you created during setup (`python manage.py createsuperuser`)

---

## 🔧 Manual Start (Alternative Method)

If you prefer to start servers manually:

### Step 1: Start Backend Server

```powershell
# Open Terminal 1
cd c:\Users\akaaa\Downloads\crm-sharda\backend
.\venv\Scripts\Activate.ps1
python manage.py runserver
```

**Expected Output**:
```
✓ System check identified no issues (0 silenced).
✓ Starting development server at http://127.0.0.1:8000/
✓ Quit the server with CTRL-BREAK.
```

### Step 2: Start Frontend Server

```powershell
# Open Terminal 2 (new window)
cd c:\Users\akaaa\Downloads\crm-sharda\frontend
npm run dev
```

**Expected Output**:
```
✓ VITE v7.2.2  ready in 262 ms
✓ ➜  Local:   http://localhost:5174/
✓ ➜  Network: use --host to expose
```

### Step 3: Open Browser

Navigate to: **http://localhost:5174**

---

## 🌐 Application URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:5174 | Main application UI |
| **Backend API** | http://localhost:8000/api/ | REST API endpoints |
| **Django Admin** | http://localhost:8000/admin/ | Django admin panel |
| **Health Check** | http://localhost:8000/api/health/ | System health status |

---

## 🔑 Login Credentials

Credentials are not stored in the repository. Create an admin account locally with:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py createsuperuser
```

For servers, run the same command inside the container or virtualenv. Store generated credentials securely (for example in AWS Secrets Manager or SSM Parameter Store).

---

## ✅ Verification Checklist

After starting the servers, verify everything is working:

### 1. Check Backend
Open: http://localhost:8000/api/health/

**Expected Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "python_version": "3.14.0",
  "debug_mode": true
}
```

### 2. Check Frontend
Open: http://localhost:5174

**Expected**: Login page with logo and sign-in form

### 3. Test Login
1. Enter the username you created
2. Enter the password you created
3. Click "Sign In"

**Expected**: Redirect to dashboard with KPI cards

### 4. Verify Data
- Navigate to different tabs (KPI, Charts, Insights, Update Leads)
- Check that data displays correctly
- Verify filters work

---

## 🛑 How to Stop Servers

### If using startup script:
- Close both PowerShell windows that opened
- OR press `Ctrl+C` in each window

### If started manually:
- Press `Ctrl+C` in each terminal window

### Force stop all:
```powershell
# Kill all Python processes (backend)
Get-Process python | Stop-Process -Force

# Kill all Node processes (frontend)
Get-Process node | Stop-Process -Force
```

---

## ⚠️ Troubleshooting

### Problem: Port already in use

**Solution**:
```powershell
# Check what's using port 8000
netstat -ano | findstr :8000

# Check what's using port 5174
netstat -ano | findstr :5174

# Kill the process (replace PID with actual process ID)
Stop-Process -Id PID -Force
```

### Problem: Backend errors

**Solution**:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Problem: Frontend errors

**Solution**:
```powershell
cd frontend
npm install
npm run dev
```

### Problem: Login fails

**Solution**:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py createsuperuser  # create a new admin if one does not exist
python manage.py changepassword <username>  # reset an existing account
```

---

## 📊 Server Status Indicators

### Backend Running Correctly:
```
✓ Watching for file changes with StatReloader
✓ Performing system checks...
✓ System check identified no issues (0 silenced).
✓ Starting development server at http://127.0.0.1:8000/
```

### Frontend Running Correctly:
```
✓ VITE v7.2.2  ready in 262 ms
✓ ➜  Local:   http://localhost:5174/
✓ ➜  Network: use --host to expose
```

---

## 🎯 Daily Development Workflow

1. **Start servers**:
   ```powershell
   .\start_servers.ps1
   ```

2. **Make code changes**:
   - Backend: Edit files in `backend/crm/`
   - Frontend: Edit files in `frontend/src/`
   - Servers auto-reload on file changes

3. **Test changes**:
   - Refresh browser to see frontend changes
   - Backend changes apply automatically

4. **Stop servers** when done:
   - Close terminal windows or press `Ctrl+C`

---

## 🔄 After Pulling Code Changes

```powershell
# Update backend
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate

# Update frontend
cd frontend
npm install

# Restart servers
cd ..
.\start_servers.ps1
```

---

## 📝 Important Notes

1. **Development Mode**: The servers are running in development mode
2. **Auto-Reload**: Both servers automatically reload when you save files
3. **Database**: Using SQLite (db.sqlite3) for development
4. **Logs**: Check terminal windows for errors and warnings

---

## 🚀 Production Deployment

For production deployment, see:
- `HIGH_PRIORITY_FIXES.md` - Security and performance improvements
- `PHASE1_AUDIT_REPORT.md` - Code quality assessment

**Key Production Changes Needed**:
- Set `DEBUG=False` in `.env`
- Use PostgreSQL instead of SQLite
- Configure proper `ALLOWED_HOSTS`
- Set up HTTPS/SSL
- Use production WSGI server (Gunicorn/uWSGI)

---

**Status**: ✅ Application is running and ready to use!  
**Last Updated**: 2025-12-02  
