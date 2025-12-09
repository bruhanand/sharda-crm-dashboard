# Safari Login Issues - Troubleshooting Guide

## Common Safari Login Problems

Safari has stricter privacy and security settings that can prevent login. Here are the most common issues and fixes:

### 1. **LocalStorage Blocked (Private Browsing Mode)**

**Symptom:** Login appears to work but immediately fails, or you see "LocalStorage is not available" error.

**Fix:**
- **Disable Private Browsing:** Safari → File → New Private Window (make sure you're NOT in private browsing)
- **Or:** Safari → Preferences → Privacy → Uncheck "Prevent cross-site tracking"

### 2. **CORS Issues**

**Symptom:** "Network error" or "Failed to fetch" errors.

**Fix:**
1. Check that your frontend URL is in `CORS_ALLOWED_ORIGINS` in Django settings
2. If accessing from a different origin (not localhost), add it to the CORS settings:
   ```python
   CORS_ALLOWED_ORIGINS = [
       'http://localhost:3000',
       'http://localhost:5173',
       'http://your-safari-url:port',  # Add your Safari URL here
   ]
   ```

### 3. **Cookies Blocked**

**Symptom:** Login works but session doesn't persist.

**Fix:**
- Safari → Preferences → Privacy → Ensure "Block all cookies" is UNCHECKED
- Safari → Preferences → Privacy → Uncheck "Prevent cross-site tracking"

### 4. **Third-Party Cookie Blocking**

**Symptom:** Login fails with CORS errors when frontend and backend are on different domains.

**Fix:**
- Safari → Preferences → Privacy → Uncheck "Prevent cross-site tracking"
- Or ensure frontend and backend are on the same domain

### 5. **Cache Issues**

**Symptom:** Old login page or JavaScript errors.

**Fix:**
- Safari → Develop → Empty Caches (or Cmd+Option+E)
- Hard refresh: Cmd+Shift+R

## Quick Diagnostic Steps

1. **Check Browser Console:**
   - Safari → Develop → Show Web Inspector
   - Look for errors in Console tab

2. **Check Network Tab:**
   - Safari → Develop → Show Web Inspector → Network
   - Try logging in and check if the `/auth/login/` request:
     - Shows 200 status (success)
     - Has CORS headers in response
     - Returns a token in the response body

3. **Test LocalStorage:**
   - Open Safari Console
   - Type: `localStorage.setItem('test', 'test')`
   - If it throws an error, localStorage is blocked (likely private browsing)

## Server-Side Checks

1. **Verify CORS Settings:**
   ```python
   # In backend/sdpl_backend/settings.py
   CORS_ALLOWED_ORIGINS = [
       'http://localhost:3000',
       'http://localhost:5173',
       # Add your Safari origin here
   ]
   CORS_ALLOW_CREDENTIALS = True
   ```

2. **Check CSRF Settings:**
   ```python
   CSRF_TRUSTED_ORIGINS = [
       'http://localhost:5173',
       # Add your Safari origin here
   ]
   ```

3. **Restart Backend:**
   After changing CORS settings, restart the Django server.

## Alternative: Use Chrome/Firefox for Testing

If Safari continues to have issues, use Chrome or Firefox for development/testing, as they have more lenient privacy settings.

## Still Having Issues?

1. Check the browser console for specific error messages
2. Verify the backend is running and accessible
3. Ensure the frontend URL matches one in CORS_ALLOWED_ORIGINS
4. Try accessing from a different browser to isolate Safari-specific issues

