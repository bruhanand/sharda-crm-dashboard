# Security Guide

## Overview

This document outlines security practices and configurations for the CRM application.

---

## Secret Management

### Current Secrets

The application requires the following secrets:

1. **Django SECRET_KEY** - Used for cryptographic signing
2. **Database Password** - PostgreSQL authentication
3. **Admin Credentials** - Initial superuser account

### Storage

**Current**: Secrets stored in `.env` file on server

**Recommended for Production**: AWS Secrets Manager

```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
    --name crm-app/production/django-secret \
    --secret-string "your-secret-key-here"

# Retrieve at runtime
aws secretsmanager get-secret-value \
    --secret-id crm-app/production/django-secret \
    --query SecretString \
    --output text
```

### Secret Rotation

**Recommended Schedule**: Every 90 days

#### Rotate Django SECRET_KEY

```bash
# 1. Generate new key
NEW_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")

# 2. Update .env with new key
sed -i "s/SECRET_KEY=.*/SECRET_KEY=$NEW_KEY/" .env

# 3. Restart application
docker-compose -f docker-compose.prod.yml restart backend
```

#### Rotate Database Password

```bash
# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Change PostgreSQL password
docker-compose -f docker-compose.prod.yml exec postgres psql -U crm_user -c "ALTER USER crm_user WITH PASSWORD '$NEW_PASSWORD';"

# 3. Update .env
# Edit .env and replace DB_PASSWORD and POSTGRES_PASSWORD

# 4. Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

---

## Authentication & Authorization

### User Management

- **Admin Users**: Full access (can create/delete users, bulk operations)
- **Regular Users**: Standard CRM access (view/edit leads)

### Token Authentication

- Uses Django REST Framework Token Authentication
- Tokens stored in database
- No expiration (logout required to invalidate)

### Session Security

```python
# Configured in settings.py
SESSION_COOKIE_HTTPONLY = True    # Prevent XSS
SESSION_COOKIE_AGE = 86400        # 24 hours
SESSION_COOKIE_SAMESITE = 'Lax'   # CSRF protection
```

---

## Network Security

### CORS Configuration

```python
# Allowed origins configured in .env
CORS_ALLOWED_ORIGINS=http://13.235.68.78
CORS_ALLOW_CREDENTIALS=True
```

### CSRF Protection

```python
# Trusted origins configured in .env
CSRF_TRUSTED_ORIGINS=http://13.235.68.78
CSRF_COOKIE_HTTPONLY=False  # Allow JS to read token
```

### Rate Limiting

```python
# REST Framework throttling
'anon': '100/hour'    # Anonymous users
'user': '1000/hour'   # Authenticated users
```

---

## Input Validation

### File Upload Security

```python
# Configured in views.py
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls']
ALLOWED_CONTENT_TYPES = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
```

### SQL Injection Prevention

- Django ORM used throughout (parameterized queries)
- No raw SQL execution
- Input sanitization via serializers

---

## Security Headers

### Response Headers

```nginx
# Configured in nginx.conf
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer-when-downgrade
```

### HTTPS Configuration (When SSL Enabled)

```python
# Enable in settings.py when HTTPS is configured
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
```

---

## Dependency Security

### Regular Audits

```bash
# Backend (Python)
cd backend
pip install safety
safety check -r requirements.txt

# Frontend (Node.js)
cd frontend
npm audit
npm audit fix
```

### Update Schedule

- **Security Updates**: Immediate
- **Minor Updates**: Monthly
- **Major Updates**: Quarterly (with testing)

---

## Access Control

### SSH Access

```bash
# Restrict to specific IPs in AWS Security Group
# Use SSH keys only (no password auth)
# Rotate keys annually

# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

### Database Access

```bash
# Database only accessible from backend container
# No external access
# Strong password (32+ characters)
# Regular password rotation
```

---

## Incident Response

### Security Incident Procedure

1. **Detect**: Monitor logs, health checks, alerts
2. **Isolate**: Stop affected containers
3. **Investigate**: Review logs, check for anomalies
4. **Remediate**: Apply fixes, rotate secrets
5. **Document**: Record incident details
6. **Prevent**: Update security measures

### Emergency Contacts

- **System Admin**: [Your contact]
- **AWS Support**: As needed
- **Security Team**: [Your team contact]

---

## Compliance

### Data Protection

- User passwords hashed (PBKDF2)
- Personal data encrypted in transit (when HTTPS enabled)
- Regular backups
- Access logging enabled

### Audit Logging

- All user actions logged to `ActivityLog` model
- Logs include: user, action, timestamp, IP address
- Retained for 90 days

---

## Security Checklist

### Pre-Deployment

- [ ] Strong SECRET_KEY generated (50+ chars)
- [ ] Strong DB password generated (32+ chars)
- [ ] Strong admin password set (16+ chars)
- [ ] DEBUG=False in production .env
- [ ] ALLOWED_HOSTS configured correctly
- [ ] No secrets committed to repository
- [ ] .env file in .gitignore
- [ ] SSH key permissions set (chmod 400)
- [ ] AWS Security Group configured

### Post-Deployment

- [ ] Health check responds
- [ ] Can login with admin credentials
- [ ] Backup script tested
- [ ] Logs are being written
- [ ] Rate limiting works
- [ ] CORS configured correctly
- [ ] Security headers present

### Ongoing

- [ ] Weekly log review
- [ ] Monthly dependency audit
- [ ] Quarterly secret rotation
- [ ] Annual security assessment

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email security concerns to: [your-security-email]
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

---

**Last Updated**: December 4, 2024  
**Security Contact**: [Configure your contact]

