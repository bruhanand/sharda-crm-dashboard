# 🎯 Login Fix - Final Solution

## Problem Summary
Login was failing with `ERR_CONNECTION_TIMED_OUT` because:
1. **Wrong API URL**: Requests going to `/login/` instead of `/api/v1/auth/login/`
2. **Build-time configuration**: Frontend is a production build - API URL must be set at **build time**, not runtime
3. **Docker environment**: Frontend runs in nginx container, requires rebuild to pick up new API URL

## Root Cause
The **frontend is a production build served by nginx**, not a development server. The API URL is baked into the JavaScript bundle at build time via the `VITE_API_BASE_URL` environment variable passed to the Dockerfile.

## Complete Fix

### Step 1: Update docker-compose.yml ✅
**File**: `docker-compose.yml`

**Change**:
```yaml
frontend:
  build:
    args:
      VITE_API_BASE_URL: http://localhost:8000/api/v1  # ← FIXED!
```

### Step 2: Rebuild Frontend Container
```bash
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

This rebuilds the React app with the correct API URL baked in.

### Step 3: Verify
```bash
docker-compose logs frontend
```

Should show nginx starting successfully.

### Step 4: Test Login
1. Open http://localhost:3000
2. Hard refresh (Ctrl+Shift+R)
3. Login: admin / Admin@123
4. Should redirect to dashboard

## Files Changed

### 1. `backend/sdpl_backend/settings.py`
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',    # ← Added
    'http://localhost:5173',
    'http://localhost:5174',
]

CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^http://localhost:\d+$',  # ← Added
]
```

### 2. `docker-compose.yml`
```yaml
args:
  VITE_API_BASE_URL: http://localhost:8000/api/v1  # ← Fixed
```

### 3. `frontend/vite.config.js`
```javascript
server: {
  port: 3000,  # ← Changed from 5173
}
```

### 4. `backend/scripts/ensure_superuser.py`
Created script to ensure admin user exists with correct password.

### 5. `frontend/.env` (created)
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Why the Frontend Needed Rebuild

**Docker Frontend Architecture**:
```
docker-compose build frontend
↓
Dockerfile runs: npm run build
↓
Vite bundles React app
↓
Uses VITE_API_BASE_URL from build args
↓
Creates static files in /dist
↓
Copies to nginx /usr/share/nginx/html
↓
nginx serves on port 80
```

The API URL is **hardcoded into the JavaScript bundle** at build time. Changing `.env` or restarting the container doesn't help - you must **rebuild**.

## Commands to Run

```bash
# 1. Rebuild frontend with correct API URL
docker-compose build --no-cache frontend

# 2. Restart frontend
docker-compose up -d frontend

# 3. Check logs
docker-compose logs -f frontend

# 4. Test login
# Open http://localhost:3000 and login with admin/Admin@123
```

## Alternative: Development Mode

If you want hot-reload and runtime `.env` changes:

```bash
# Stop Docker frontend
docker-compose stop frontend

# Run locally in dev mode
cd frontend
npm install
npm run dev
```

This runs Vite dev server on port 3000 (as configured) and picks up `.env` changes immediately.

## Verification Checklist

After rebuild:
- [ ] `docker-compose ps` shows frontend as "Up"
- [ ] `docker-compose logs frontend` shows no errors  
- [ ] Navigate to http://localhost:3000
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Open DevTools Network tab
- [ ] Login with admin/Admin@123
- [ ] See POST to `/api/v1/auth/login/` with 200 OK
- [ ] Redirect to dashboard

## Branch & Commits

**Branch**: `fix/login-connection`

**Commits**:
1. Fixed CORS configuration
2. Created admin user script
3. Updated Vite config and API URL
4. Fixed docker-compose frontend build args

## Next Steps

1. **Rebuild frontend**: `docker-compose build --no-cache frontend`
2. **Start frontend**: `docker-compose up -d frontend`  
3. **Test login**: http://localhost:3000

The key insight: **Production builds require rebuilds** to pick up configuration changes!
