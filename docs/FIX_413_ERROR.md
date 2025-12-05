# 413 Request Entity Too Large - Fix Documentation

## Problem
When uploading large datasets on the hosted server, you receive a **413 Request Entity Too Large** error, even though the same operation works fine locally.

## Root Cause
The error occurs due to size limits at multiple levels in the application stack:

1. **Nginx Web Server**: Default `client_max_body_size` was too small (25MB)
2. **Django Backend**: Default `DATA_UPLOAD_MAX_MEMORY_SIZE` is only 2.5MB
3. **Gunicorn**: Timeout was too short (60s) for large uploads
4. **Proxy Timeouts**: Nginx proxy timeouts were insufficient for large data processing

## Solution Applied

### 1. Nginx Configuration Updates

#### Frontend Nginx (`frontend/nginx.conf`)
- ✅ Increased `client_max_body_size` from 50M to **100M**
- ✅ Added proxy timeouts for API requests:
  - `proxy_read_timeout: 300s`
  - `proxy_connect_timeout: 300s`
  - `proxy_send_timeout: 300s`

#### Deployment Nginx (`deployment_config/nginx.conf`)
- ✅ Increased `client_max_body_size` from 25M to **100M**
- ✅ Added proxy timeouts:
  - `proxy_read_timeout: 300s`
  - `proxy_connect_timeout: 300s`
  - `proxy_send_timeout: 300s`

### 2. Django Settings (`backend/sdpl_backend/settings.py`)
Added the following upload limits:
```python
# File Upload Settings - Allow large data imports
DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100 MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 10000
```

### 3. Application Limits (`backend/crm/views.py`)
- ✅ Increased `MAX_UPLOAD_SIZE` from 10MB to **100MB**
- ✅ Increased maximum rows per upload from 1000 to **10000 rows**

### 4. Gunicorn Configuration (`docker-compose.prod.yml`)
- ✅ Increased timeout from 60s to **300s** (5 minutes)

## Deployment Steps

### Option 1: Using Docker (Recommended)

1. **Rebuild the backend container** (to pick up Django settings changes):
   ```bash
   docker-compose -f docker-compose.prod.yml build backend
   ```

2. **Rebuild the frontend container** (to pick up Nginx config changes):
   ```bash
   docker-compose -f docker-compose.prod.yml build frontend
   ```

3. **Restart all services**:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Verify the services are running**:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

### Option 2: Direct Server Deployment

If you're running directly on the server without Docker:

1. **Update Nginx configuration**:
   ```bash
   sudo cp deployment_config/nginx.conf /etc/nginx/sites-available/crm-sharda
   sudo nginx -t  # Test configuration
   sudo systemctl reload nginx
   ```

2. **Restart Gunicorn**:
   ```bash
   sudo systemctl restart gunicorn
   ```

## Testing

After deployment, test with a large dataset:

1. **Navigate to the data import page**
2. **Upload a file larger than 25MB** (but under 100MB)
3. **Verify successful upload** without 413 errors

## Configuration Limits Summary

| Component | Setting | Old Value | New Value |
|-----------|---------|-----------|-----------|
| Frontend Nginx | `client_max_body_size` | 50M | **100M** |
| Deployment Nginx | `client_max_body_size` | 25M | **100M** |
| Django | `DATA_UPLOAD_MAX_MEMORY_SIZE` | 2.5M (default) | **100M** |
| Django | `FILE_UPLOAD_MAX_MEMORY_SIZE` | 2.5M (default) | **100M** |
| Application | `MAX_UPLOAD_SIZE` | 10M | **100M** |
| Application | Max rows per upload | 1000 | **10000** |
| Gunicorn | `--timeout` | 60s | **300s** |
| Nginx Proxy | `proxy_read_timeout` | 90s | **300s** |

## Further Optimization (If Needed)

If you need to handle even larger files (>100MB):

1. **Increase all size limits proportionally**:
   - Update `client_max_body_size` in both Nginx configs
   - Update `DATA_UPLOAD_MAX_MEMORY_SIZE` in Django settings
   - Consider increasing Gunicorn timeout further

2. **Consider chunked uploads** for very large files:
   - Implement frontend chunking for files >100MB
   - Process chunks on the backend
   - Combine chunks after upload

3. **Monitor server resources**:
   - Check available RAM during large uploads
   - Monitor disk space for temporary files
   - Adjust Gunicorn workers if needed

## Troubleshooting

### Still getting 413 errors?

1. **Check which Nginx is serving requests**:
   ```bash
   curl -I http://your-server-ip/api/
   ```
   Look for the `Server` header

2. **Verify Nginx config is loaded**:
   ```bash
   sudo nginx -T | grep client_max_body_size
   ```

3. **Check Docker logs**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs frontend
   docker-compose -f docker-compose.prod.yml logs backend
   ```

4. **Verify Django settings**:
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend python manage.py shell
   >>> from django.conf import settings
   >>> settings.DATA_UPLOAD_MAX_MEMORY_SIZE
   104857600
   ```

### Timeout errors?

If uploads succeed but processing times out:
- Increase Gunicorn timeout further
- Increase Nginx proxy timeouts
- Consider background task processing for large datasets

## Related Files Modified

- ✅ `frontend/nginx.conf`
- ✅ `deployment_config/nginx.conf`
- ✅ `backend/sdpl_backend/settings.py`
- ✅ `docker-compose.prod.yml`

## Notes

- These settings allow uploads up to **100MB**
- Processing timeout is set to **5 minutes**
- All changes are backward compatible
- Local development is unaffected
