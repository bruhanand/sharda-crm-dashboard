# Complete Login Flow - Frontend to Backend to Frontend

## 🔄 Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPLETE LOGIN FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1. USER ACTION
   ↓
   User enters credentials on Login page
   - Username: admin
   - Password: Admin@123
   ↓

2. FRONTEND (React - Login.jsx)
   ↓
   const handleSubmit = async (e) => {
     e.preventDefault()
     
     // Call API
     const data = await apiRequest('auth/login/', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ username, password })
     })
   }
   ↓

3. API REQUEST (lib/api.js)
   ↓
   const BASE_URL = 'http://localhost:8000/api/v1'
   
   fetch(`${BASE_URL}/auth/login/`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Token ${token}` // if exists
     },
     credentials: 'include', // IMPORTANT for cookies
     body: JSON.stringify({ username, password })
   })
   ↓

4. BROWSER PREFLIGHT (OPTIONS)
   ↓
   OPTIONS http://localhost:8000/api/v1/auth/login/
   Headers:
     - Origin: http://localhost:3000
     - Access-Control-Request-Method: POST
     - Access-Control-Request-Headers: content-type
   ↓

5. BACKEND CORS MIDDLEWARE
   ↓
   Django CORS Headers checks:
     - Is Origin in CORS_ALLOWED_ORIGINS?
       ✅ http://localhost:3000  (FIXED - was missing!)
     - Is method allowed? ✅ POST
     - Are headers allowed? ✅ content-type, authorization
   
   Response:
     HTTP 200 OK
     Access-Control-Allow-Origin: http://localhost:3000
     Access-Control-Allow-Credentials: true
     Access-Control-Allow-Methods: POST, OPTIONS
     Access-Control-Allow-Headers: content-type, authorization
   ↓

6. BROWSER SENDS ACTUAL POST
   ↓
   POST http://localhost:8000/api/v1/auth/login/
   Content-Type: application/json
   Body: {"username":"admin","password":"Admin@123"}
   ↓

7. BACKEND DJANGO (auth_views.py)
   ↓
   class CustomAuthToken(ObtainAuthToken):
     def post(self, request):
       # Validate credentials
       serializer = self.serializer_class(data=request.data)
       serializer.is_valid(raise_exception=True)
       user = serializer.validated_data['user']
       
       # Get or create token
       token, created = Token.objects.get_or_create(user=user)
       
       # Log activity
       log_activity(user, 'login', 'User logged in')
       
       # Return response
       return Response({
         'token': token.key,
         'user_id': user.pk,
         'username': user.username,
         'email': user.email,
         'is_admin': user.is_superuser
       })
   ↓

8. BACKEND RESPONSE
   ↓
   HTTP 200 OK
   Content-Type: application/json
   Access-Control-Allow-Origin: http://localhost:3000
   Access-Control-Allow-Credentials: true
   
   Body:
   {
     "token": "abc123def456...",
     "user_id": 1,
     "username": "admin",
     "email": "admin@crm.com",
     "is_admin": true
   }
   ↓

9. FRONTEND RECEIVES RESPONSE
   ↓
   if (data.token) {
     // Store token
     localStorage.setItem('authToken', data.token)
     
     // Store user info
     localStorage.setItem('user', JSON.stringify({
       id: data.user_id,
       username: data.username,
       email: data.email,
       is_admin: data.is_admin
     }))
     
     // Notify parent component
     onLogin(data.token)
   }
   ↓

10. APP STATE UPDATE
    ↓
    setIsAuthenticated(true)
    // Redirect to Dashboard
    ↓

11. FUTURE API CALLS
    ↓
    All subsequent requests include:
    
    headers: {
      'Authorization': `Token ${localStorage.getItem('authToken')}`
    }
    
    Backend validates token on each request:
    - DRF TokenAuthentication checks token
    - If valid: request.user = User object
    - If invalid: 401 Unauthorized
```

---

## 🔧 Critical Configuration Points

### Frontend (React + Vite)

**1. API Base URL** (`frontend/src/lib/api.js`)
```javascript
const BASE_URL = 'http://localhost:8000/api/v1'
```

**2. Request Configuration**
```javascript
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': token ? `Token ${token}` : ''
  },
  credentials: 'include', // ← CRITICAL for CORS with cookies
  body: JSON.stringify(data)
})
```

**3. Environment Variable** (`frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

### Backend (Django)

**1. CORS Configuration** (`backend/sdpl_backend/settings.py`)
```python
# CRITICAL: Must include frontend origin!
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',  # ← React dev server (FIXED!)
    'http://localhost:5173',  # Vite alternative
    'http://localhost:5174',
]

# Allow any localhost port (development)
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^http://localhost:\d+$',
]

CORS_ALLOW_CREDENTIALS = True  # ← For cookies/auth

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',  # ← For Token header
    'content-type',
    'origin',
    'x-csrftoken',
]
```

**2. Authentication** (`backend/sdpl_backend/settings.py`)
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
}
```

**3. URL Routing** (`backend/sdpl_backend/urls.py`)
```python
urlpatterns = [
    path('api/v1/', include('crm.urls')),  # ← API versioning
]
```

**4. Auth Endpoint** (`backend/crm/urls.py`)
```python
path('auth/login/', CustomAuthToken.as_view(), name='api-login'),
```

**Full URL**: `http://localhost:8000/api/v1/auth/login/`

---

## 🚨 Common Issues & Solutions

### Issue 1: CORS Error
**Error**: `Access to XMLHttpRequest blocked by CORS policy`
**Cause**: Frontend origin not in `CORS_ALLOWED_ORIGINS`
**Fix**: Add `http://localhost:3000` to allowed origins ✅ DONE

### Issue 2: OPTIONS 404
**Error**: `OPTIONS /auth/login/ 404`
**Cause**: CORS middleware not processing OPTIONS
**Fix**: Ensure `corsheaders.middleware.CorsMiddleware` is FIRST in MIDDLEWARE ✅ DONE

### Issue 3: Token Not Saved
**Error**: Login succeeds but user logged out on refresh
**Cause**: localStorage not saving token
**Fix**: Check browser console for errors, verify `localStorage.setItem()` ✅ WORKING

### Issue 4: 401 Unauthorized
**Error**: Subsequent API calls return 401
**Cause**: Token not included in headers
**Fix**: Ensure `Authorization: Token <token>` header in all requests ✅ WORKING

---

## 📊 Request/Response Examples

### Successful Login

**Request**:
```http
POST /api/v1/auth/login/ HTTP/1.1
Host: localhost:8000
Origin: http://localhost:3000
Content-Type: application/json

{"username":"admin","password":"Admin@123"}
```

**Response**:
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Content-Type: application/json

{
  "token": "abc123def456ghi789",
  "user_id": 1,
  "username": "admin",
  "email": "admin@crm.com",
  "is_admin": true
}
```

### Failed Login

**Response**:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "non_field_errors": [
    "Unable to log in with provided credentials."
  ]
}
```

---

## 🔐 Security Notes

1. **Token Storage**: Currently localStorage (consider httpOnly cookies for production)
2. **Password Requirements**: Django default validators (min 8 chars, not common, not numeric-only)
3. **HTTPS**: Use HTTPS in production (set `SECURE_SSL_REDIRECT = True`)
4. **Rate Limiting**: 10 uploads/hour implemented, consider adding to login endpoint
5. **CSRF**: Not required for token auth, but enabled for session auth

---

**Status**: Login flow documented and ready to test! 🚀
