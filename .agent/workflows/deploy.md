---
description: Deploy code to EC2 instance
---

# Deploy to EC2 Workflow

This workflow guides you through deploying the CRM application to the EC2 instance at **13.204.79.244**.

## Prerequisites

- EC2 instance running at 13.204.79.244
- SSH key file (`.pem`) for EC2 access
- Docker and Docker Compose installed on EC2

## Steps

### 1. Update Task Tracker
Mark deployment as in progress in task.md

### 2. Connect to EC2 Instance
```bash
ssh -i path/to/your-key.pem ubuntu@13.204.79.244
```

### 3. Navigate to Application Directory
```bash
cd /opt/crm
# or
cd ~/crm-sharda
```

### 4. Pull Latest Code
If using Git:
```bash
git pull origin main
```

Or transfer files using SCP from Windows:
```powershell
scp -i path\to\your-key.pem -r C:\Users\akaaa\Downloads\crm-sharda ubuntu@13.204.79.244:~/
```

### 5. Run Deployment Script
```bash
cd deployment
chmod +x deploy.sh
./deploy.sh
```

### 6. Verify Deployment
Check Docker containers:
```bash
docker-compose ps
```

View logs:
```bash
docker-compose logs -f
```

### 7. Test Application
- Frontend: http://13.204.79.244
- Backend API: http://13.204.79.244/api/
- Admin: http://13.204.79.244/admin/

### 8. Health Check
```bash
curl http://13.204.79.244/api/health/
```

## Troubleshooting

If deployment fails:
1. Check logs: `docker-compose logs`
2. Rebuild: `docker-compose build --no-cache`
3. Restart: `docker-compose down && docker-compose up -d`
