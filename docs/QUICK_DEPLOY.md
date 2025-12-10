# 🚀 Quick Deployment - Sharda CRM Dashboard

## 📌 Server Details
```
EC2 IP:    65.0.7.221
PEM Key:   C:\Users\akaaa\Downloads\sharda-crm-pem.pem
App URL:   http://65.0.7.221
GitHub:    https://github.com/bruhanand/sharda-crm-dashboard.git
```

---

## 🎯 Option 1: Automated Deployment (Recommended)

### First Time Deploy
```powershell
cd C:\Users\akaaa\Desktop\crm-sharda\crm-sharda
.\deploy-to-ec2.ps1 -FirstTime
```

### Subsequent Deploys
```powershell
.\deploy-to-ec2.ps1
```

**That's it!** The script handles everything automatically.

---

## 🔧 Option 2: Manual Deployment

### Step 1: Push to GitHub (Local)
```powershell
cd C:\Users\akaaa\Desktop\crm-sharda\crm-sharda
git add .
git commit -m "Deploy update"
git push origin main
```

### Step 2: Connect to EC2
```powershell
ssh -i "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" ubuntu@65.0.7.221
```

### Step 3: Deploy (On EC2)
```bash
cd ~/crm-app
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 4: Verify
```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8000/api/health/
```

---

## 📊 Monitoring & Management

### View Logs
```bash
# Connect to EC2
ssh -i "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" ubuntu@65.0.7.221

# View all logs
cd ~/crm-app
docker compose -f docker-compose.prod.yml logs -f

# View specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Container Status
```bash
docker compose -f docker-compose.prod.yml ps
```

### Restart Services
```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

---

## 🔍 Health Checks

### From EC2
```bash
curl http://localhost:8000/api/health/
curl -I http://localhost:80/
```

### From Local (PowerShell)
```powershell
Invoke-WebRequest http://65.0.7.221/api/health/
```

### From Browser
- Frontend: http://65.0.7.221
- API Health: http://65.0.7.221/api/health/
- Admin: http://65.0.7.221/admin/

---

## 🐛 Quick Troubleshooting

### Containers not starting?
```bash
cd ~/crm-app
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f
```

### Backend errors?
```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml restart backend
```

### Database issues?
```bash
docker compose -f docker-compose.prod.yml logs postgres
docker compose -f docker-compose.prod.yml restart postgres
```

### Check what's using port 80?
```bash
sudo lsof -i :80
sudo systemctl stop nginx  # If nginx is running
sudo systemctl stop apache2  # If apache is running
```

---

## 💾 Backup Database

```bash
cd ~/crm-app
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U crm_user crm_database | gzip > backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## 🔄 Update Application

### If you made code changes:
```powershell
# On local machine
cd C:\Users\akaaa\Desktop\crm-sharda\crm-sharda
git add .
git commit -m "Your changes"
git push origin main

# Then deploy (automated)
.\deploy-to-ec2.ps1
```

---

## 📚 Detailed Documentation

For comprehensive guides, see:
- **DEPLOYMENT_GUIDE.md** - Complete step-by-step deployment
- **HOW_TO_RUN.md** - Running locally
- **DEPLOYMENT_RUNBOOK.md** - Detailed commands
- **TROUBLESHOOTING_LOGIN.md** - Login issues
- **LOGIN_CREDENTIALS.md** - Admin credentials

---

## 🆘 Emergency Commands

### Stop everything
```bash
docker compose -f docker-compose.prod.yml down
```

### Nuclear option (full reset)
```bash
docker compose -f docker-compose.prod.yml down -v
docker system prune -a
docker compose -f docker-compose.prod.yml up -d --build
```

### Check disk space
```bash
df -h
docker system df
```

### Check memory
```bash
free -h
docker stats
```

---

## ☎️ One-Line Commands

### SSH to EC2
```powershell
ssh -i "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" ubuntu@65.0.7.221
```

### Quick Health Check
```powershell
ssh -i "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" ubuntu@65.0.7.221 "curl -s http://localhost:8000/api/health/"
```

### Quick Restart
```powershell
ssh -i "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" ubuntu@65.0.7.221 "cd ~/crm-app && docker compose -f docker-compose.prod.yml restart"
```

### View Last 20 Log Lines
```powershell
ssh -i "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" ubuntu@65.0.7.221 "cd ~/crm-app && docker compose -f docker-compose.prod.yml logs --tail=20"
```

---

**Need more help?** Check `DEPLOYMENT_GUIDE.md` for detailed instructions!
