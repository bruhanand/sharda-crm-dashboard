# Login Troubleshooting Guide

## Issue: CORS Errors on Login

### Problem
Browser console shows:
```
Access to XMLHttpRequest at 'http://localhost:8000/api/v1/auth/login/' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

### Solution Applied ✅

**1. Updated CORS Settings** in `backend/sdpl_backend/settings.py`:
- Added `http://localhost:3000` to `CORS_ALLOWED_ORIGINS`
- Added regex pattern to allow any localhost port
- Restarted backend service

**2. Verified Settings**:
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',  # React dev server
    'http://localhost:5173',  # Vite alternative port
    'http://localhost:5174',  # Vite alternative port
]
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^http://localhost:\d+$',  # Any localhost port
]
CORS_ALLOW_CREDENTIALS = True
```

---

## Admin Credentials

**Username**: `admin`  
**Password**: `Admin@123`

---

## Steps to Fix (If Still Not Working)

### 1. Verify Backend is Running
```bash
docker-compose ps
# Should show crm_backend as "Up"
```

### 2. Check Backend Logs
```bash
docker-compose logs -f backend
# Look for startup errors
```

### 3. Restart Services
```bash
docker-compose restart backend
docker-compose restart frontend
```

### 4. Test API Directly
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'
```

**Expected Response**:
```json
{
  "token": "abc123...",
  "user_id": 1,
  "username": "admin",
  "email": "admin@crm.com",
  "is_admin": true
}
```

### 5. Create Admin User (If Doesn't Exist)
```bash
docker exec -it crm_backend python manage.py createsuperuser
# Username: admin
# Email: admin@crm.com
# Password: Admin@123
# Password (again): Admin@123
```

### 6. Clear Browser Cache
- Open DevTools (F12)
- Right-click refresh button → "Empty Cache and Hard Reload"
- Or use Incognito mode

---

## Common Issues

### Issue 1: "Invalid username or password"
**Cause**: Admin user doesn't exist or wrong password  
**Fix**: Create admin user (see step 5 above)

### Issue 2: CORS errors persist
**Cause**: Backend not restarted after config change  
**Fix**: 
```bash
docker-compose restart backend
```

### Issue 3: Network error / Connection refused  
**Cause**: Backend not running  
**Fix**:
```bash
docker-compose up -d backend
docker-compose logs backend
```

### Issue 4: Token not being saved
**Cause**: localStorage blocked or browser privacy settings  
**Fix**: Check browser console, disable privacy modes

---

## Verification Checklist

- [ ] Backend running (`docker-compose ps`)
- [ ] CORS configured (`localhost:3000` in settings)
- [ ] Admin user exists
- [ ] API responds to curl/Postman test
- [ ] No CORS errors in browser console
- [ ] Network tab shows 200 response
- [ ] Token received and saved to localStorage

---

## Quick Test

1. Open http://localhost:3000
2. Open Browser DevTools (F12) → Network tab
3. Enter credentials: admin / Admin@123  
4. Click Sign In
5. Check Network tab for response
6. Should see 200 OK with token in response

---

## Contact

If issues persist after following this guide:
1. Check `docker-compose logs backend`
2. Verify `.env` file configuration
3. Ensure Docker containers are healthy
