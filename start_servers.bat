@echo off
echo ========================================
echo  Starting CRM Application Servers
echo ========================================
echo.

REM Check if backend directory exists
if not exist "backend" (
    echo ERROR: backend directory not found!
    echo Please run this script from the exampleApp directory
    pause
    exit /b 1
)

REM Check if frontend directory exists
if not exist "frontend" (
    echo ERROR: frontend directory not found!
    echo Please run this script from the exampleApp directory
    pause
    exit /b 1
)

echo [1/4] Checking for running servers...
echo.

REM Kill any existing Django servers on port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo Stopping existing backend server (PID: %%a)
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill any existing Vite servers on port 5174
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174 ^| findstr LISTENING') do (
    echo Stopping existing frontend server (PID: %%a)
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo [2/4] Starting Backend Server...
echo.

REM Start backend in new window
start "CRM Backend Server" cmd /k "cd backend && venv\Scripts\activate && python manage.py runserver"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

echo [3/4] Starting Frontend Server...
echo.

REM Start frontend in new window
start "CRM Frontend Server" cmd /k "cd frontend && npm run dev"

REM Wait for frontend to start
timeout /t 5 /nobreak >nul

echo.
echo [4/4] Opening Browser...
echo.

REM Wait a bit more for servers to fully initialize
timeout /t 3 /nobreak >nul

REM Open browser
start http://localhost:5174

echo.
echo ========================================
echo  Servers Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5174
echo.
echo Two new terminal windows have opened:
echo   - CRM Backend Server (Django)
echo   - CRM Frontend Server (Vite)
echo.
echo To stop servers: Close both terminal windows
echo                  or press Ctrl+C in each window
echo.
echo ========================================
echo.

pause
