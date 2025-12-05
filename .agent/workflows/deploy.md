---
description: Deploy code to EC2 instance
---

# Deploy to EC2 Workflow

This workflow guides you through deploying the CRM application to the EC2 instance at **65.0.7.221**.

## Prerequisites

- EC2 instance running at 65.0.7.221
- SSH key file: `C:\Users\akaaa\Downloads\sharda-crm-pem.pem`
- Docker and Docker Compose installed on EC2

## Steps

### 1. Push Latest Code to GitHub
```powershell
cd C:\Users\akaaa\Desktop\crm-sharda\crm-sharda
git add .
git commit -m "Deployment update"
git push origin main
```

### 2. Connect to EC2 Instance
```powershell
ssh -i "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" ubuntu@65.0.7.221
```

### 3. Navigate to Application Directory
```bash
cd ~/crm-app
```

### 4. Pull Latest Code from GitHub
```bash
git pull origin main
```

### 5. Build and Deploy with Docker
```bash
# Build and start containers
docker compose -f docker-compose.prod.yml up -d --build

# Wait for containers to start
sleep 10
```

### 6. Verify Deployment
Check Docker containers:
```bash
docker compose -f docker-compose.prod.yml ps
```

All containers should show "Up" status.

### 7. Check Health
```bash
# Backend health
curl http://localhost:8000/api/health/

# Frontend
curl -I http://localhost:80/
```

### 8. View Logs (if needed)
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
```

### 9. Test Application in Browser

Open your browser and test:
- Frontend: http://65.0.7.221
- Backend API: http://65.0.7.221/api/health/
- Admin: http://65.0.7.221/admin/

## 🚀 Quick Deploy (Automated)

Use the automated PowerShell script:

```powershell
# First time deployment
.\deploy-to-ec2.ps1 -FirstTime

# Subsequent deployments
.\deploy-to-ec2.ps1

# Skip git push (if already pushed)
.\deploy-to-ec2.ps1 -SkipGitPush
```

## Troubleshooting

### Containers won't start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Rebuild from scratch
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
```

### Database connection error
```bash
# Check postgres logs
docker compose -f docker-compose.prod.yml logs postgres

# Restart postgres
docker compose -f docker-compose.prod.yml restart postgres
```

### Frontend returns 502
```bash
# Check backend status
docker compose -f docker-compose.prod.yml ps backend

# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

## Common Commands

### Restart all services
```bash
docker compose -f docker-compose.prod.yml restart
```

### Stop all services
```bash
docker compose -f docker-compose.prod.yml down
```

### Backup database
```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U crm_user crm_database | gzip > backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### View container stats
```bash
docker stats
```

## Quick Reference

| Item | Value |
|------|-------|
| **EC2 IP** | 65.0.7.221 |
| **SSH Key** | C:\Users\akaaa\Downloads\sharda-crm-pem.pem |
| **App URL** | http://65.0.7.221 |
| **Health** | http://65.0.7.221/api/health/ |
| **App Dir** | ~/crm-app |

For detailed deployment guide, see: `DEPLOYMENT_GUIDE.md`
