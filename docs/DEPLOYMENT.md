# Deployment Guide

## Production Deployment Guide

### Prerequisites
- Ubuntu 20.04+ server
- Docker and Docker Compose installed
- Domain name configured
- SSL certificate (Let's Encrypt recommended)

---

## Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Create app directory
sudo mkdir -p /opt/crm
cd /opt/crm
```

### 2. Clone Repository

```bash
git clone <your-repository-url> .
```

### 3. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
nano backend/.env
```

**Production settings**:
```env
SECRET_KEY=<generate-strong-key>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DB_PASSWORD=<strong-db-password>
FORCE_HTTPS=True
```

```bash
# Frontend
cp frontend/.env.example frontend/.env
nano frontend/.env
```

```env
VITE_API_BASE_URL=https://yourdomain.com/api/v1
```

### 4. Start Services

```bash
# Build and start
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Database Setup

```bash
# Run migrations
docker exec crm_backend python manage.py migrate

# Collect static files
docker exec crm_backend python manage.py collectstatic --noinput

# Create superuser
docker exec -it crm_backend python manage.py createsuperuser
```

### 6. Nginx Configuration (Optional)

If using external Nginx:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 7. SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Maintenance

### Backup Database

```bash
# Create backup
docker exec crm_postgres pg_dump -U crm_user crm_database > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i crm_postgres psql -U crm_user crm_database < backup_20241205.sql
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker exec crm_backend python manage.py migrate

# Collect static
docker exec crm_backend python manage.py collectstatic --noinput
```

### Monitor Logs

```bash
# All services
docker-compose logs -f

# Specific service  
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100
```

### Scale Services

```bash
# Scale backend workers
docker-compose up -d --scale backend=3
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check database is  running
docker-compose ps postgres

# Check credentials
docker exec crm_postgres psql -U crm_user -d crm_database -c '\dt'

# Reset database
docker-compose down
docker volume rm crm-sharda_postgres_data
docker-compose up -d
```

### Permission Issues

```bash
# Fix file permissions  
sudo chown -R $USER:$USER /opt/crm

# Fix Docker permissions
sudo usermod -aG docker $USER
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Increase swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Performance Tuning

### Enable Redis Caching

```bash
# Add redis to docker-compose.yml
# Update backend settings with Redis config
# Restart services
docker-compose up -d
```

### Database Optimization

```bash
# Run migrations to add indexes
docker exec crm_backend python manage.py migrate

# Analyze database
docker exec crm_postgres vacuumdb -U crm_user -d crm_database --analyze
```

---

## Security Checklist

- [ ] Changed default SECRET_KEY
- [ ] Set DEBUG=False
- [ ] Configured ALLOWED_HOSTS
- [ ] Enabled HTTPS
- [ ] Set strong database password
- [ ] Enabled firewall (UFW)
- [ ] Regular backups configured
- [ ] Log monitoring setup
- [ ] Rate limiting enabled
- [ ] CORS properly configured

---

## Monitoring

### Health Checks

```bash
# API health
curl http://localhost:8000/api/v1/health/

# Database
docker exec crm_postgres pg_isready
```

### Resource Usage

```bash
# Disk usage
df -h

# Docker resources
docker system df

# Container stats
docker stats
```

---

## Rollback Procedure

```bash
# Stop services
docker-compose down

# Restore previous version
git checkout <previous-commit>

# Rebuild
docker-compose up -d --build

# Restore database if needed
docker exec -i crm_postgres psql -U crm_user crm_database < backup.sql
```
