# 🚀 Complete Deployment Guide - Sharda CRM Dashboard

**Target EC2 Instance**: `65.0.7.221`  
**PEM Key**: `C:\Users\akaaa\Downloads\sharda-crm-pem.pem`  
**GitHub Repo**: https://github.com/bruhanand/sharda-crm-dashboard.git

---

## 📋 Table of Contents
1. [Prerequisites Check](#prerequisites-check)
2. [Step 1: Test SSH Connection](#step-1-test-ssh-connection)
3. [Step 2: Setup EC2 Environment](#step-2-setup-ec2-environment)
4. [Step 3: Push Code to GitHub](#step-3-push-code-to-github)
5. [Step 4: Deploy Application](#step-4-deploy-application)
6. [Step 5: Verify Deployment](#step-5-verify-deployment)
7. [Step 6: Test Application](#step-6-test-application)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites Check

Before starting, ensure you have:

- ✅ EC2 instance running and accessible
- ✅ PEM file at: `C:\Users\akaaa\Downloads\sharda-crm-pem.pem`
- ✅ Git installed locally
- ✅ Your .env file is configured with the correct IP (65.0.7.221)

---

## Step 1: Test SSH Connection ⏱️ (2 minutes)

### 1.1 Set Correct Permissions on PEM File

On Windows PowerShell:
```powershell
# Remove inheritance and grant only your user access
icacls "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" /inheritance:r
icacls "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" /grant:r "$env:USERNAME:R"
```

### 1.2 Test SSH Connection

```powershell
ssh -i "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" ubuntu@65.0.7.221
```

**Expected Result**: You should successfully connect to the EC2 instance.

If successful, type `exit` to return to your local machine.

---

## Step 2: Setup EC2 Environment ⏱️ (10-15 minutes)

### 2.1 Connect to EC2

```powershell
ssh -i "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" ubuntu@65.0.7.221
```

### 2.2 Update System Packages

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 2.3 Install Docker

```bash
# Install Docker
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the stable repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2.4 Configure Docker (Non-root access)

```bash
# Add your user to docker group
sudo usermod -aG docker ubuntu

# Apply group changes (logout & login OR use newgrp)
newgrp docker

# Verify Docker is working
docker --version
docker compose version
```

### 2.5 Install Additional Tools

```bash
sudo apt-get install -y git htop curl nano
```

### 2.6 Create Application Directory

```bash
mkdir -p ~/crm-app
cd ~/crm-app
```

---

## Step 3: Push Code to GitHub ⏱️ (3 minutes)

On your **local Windows machine**:

### 3.1 Ensure All Changes are Committed

```powershell
cd C:\Users\akaaa\Desktop\crm-sharda\crm-sharda

# Check status
git status

# Add all changes
git add .

# Commit with meaningful message
git commit -m "Updated configuration for EC2 deployment at 65.0.7.221"

# Push to GitHub
git push origin main
```

---

## Step 4: Deploy Application ⏱️ (10-15 minutes)

### 4.1 Clone Repository on EC2

**On EC2 instance** (should still be connected):

```bash
cd ~/crm-app

# Clone the repository
git clone https://github.com/bruhanand/sharda-crm-dashboard.git .

# Verify files
ls -la
```

### 4.2 Create Required Directories

```bash
mkdir -p logs backups
```

### 4.3 Verify .env File

```bash
# Check if .env exists and has correct IP
cat .env | grep ALLOWED_HOSTS
```

**Expected**: Should show `ALLOWED_HOSTS=65.0.7.221,localhost`

### 4.4 Build and Start Docker Containers

```bash
# Build and start all containers in detached mode
docker compose -f docker-compose.prod.yml up -d --build

# This will:
# 1. Build the backend Docker image
# 2. Build the frontend Docker image
# 3. Pull PostgreSQL image
# 4. Start all containers
# 5. Run migrations
# 6. Create admin user
# 7. Collect static files
```

**⏱️ This step will take 5-10 minutes on first run.**

### 4.5 Monitor Build Progress

In a new terminal/tab, connect to EC2 again and follow logs:
```bash
ssh -i "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" ubuntu@65.0.7.221
cd ~/crm-app
docker compose -f docker-compose.prod.yml logs -f
```

Press `Ctrl+C` to stop following logs (containers will keep running).

---

## Step 5: Verify Deployment ⏱️ (3 minutes)

### 5.1 Check Container Status

```bash
docker compose -f docker-compose.prod.yml ps
```

**Expected Output**: All 3 containers should be running (postgres, backend, frontend)
```
NAME                    STATUS              PORTS
crm_postgres_prod       Up (healthy)        
crm_backend_prod        Up (healthy)        
crm_frontend_prod       Up (healthy)        0.0.0.0:80->80/tcp
```

### 5.2 Check Backend Health

```bash
curl http://localhost:8000/api/health/
```

**Expected**: `{"status":"healthy","database":"connected"}` or similar

### 5.3 Check Frontend

```bash
curl -I http://localhost:80/
```

**Expected**: `HTTP/1.1 200 OK`

### 5.4 View Logs (if needed)

```bash
# All logs
docker compose -f docker-compose.prod.yml logs --tail=50

# Backend only
docker compose -f docker-compose.prod.yml logs backend --tail=50

# Frontend only
docker compose -f docker-compose.prod.yml logs frontend --tail=50

# Database only
docker compose -f docker-compose.prod.yml logs postgres --tail=50
```

---

## Step 6: Test Application ⏱️ (5 minutes)

### 6.1 Test from EC2 Instance

```bash
# Test API health
curl http://65.0.7.221/api/health/

# Test frontend
curl -I http://65.0.7.221/
```

### 6.2 Test from Your Local Machine

On your **local Windows PowerShell**:

```powershell
# Test API
Invoke-WebRequest -Uri "http://65.0.7.221/api/health/" -UseBasicParsing

# Test frontend
Invoke-WebRequest -Uri "http://65.0.7.221/" -UseBasicParsing
```

### 6.3 Test in Browser

Open your browser and navigate to:

1. **Frontend**: http://65.0.7.221
2. **API Health**: http://65.0.7.221/api/health/
3. **Admin Panel**: http://65.0.7.221/admin/

### 6.4 Login to Application

Check the `LOGIN_CREDENTIALS.md` file for admin credentials:

```bash
# On EC2
cat ~/crm-app/LOGIN_CREDENTIALS.md
```

Or from your local machine, check:
```
C:\Users\akaaa\Desktop\crm-sharda\crm-sharda\LOGIN_CREDENTIALS.md
```

---

## 🎉 Deployment Complete!

Your application should now be live at:
- **Application**: http://65.0.7.221
- **API**: http://65.0.7.221/api/
- **Admin**: http://65.0.7.221/admin/

---

## 🔧 Common Management Commands

### Restart Application
```bash
cd ~/crm-app
docker compose -f docker-compose.prod.yml restart
```

### Stop Application
```bash
docker compose -f docker-compose.prod.yml down
```

### Start Application
```bash
docker compose -f docker-compose.prod.yml up -d
```

### View Logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Update Application (after code changes)
```bash
cd ~/crm-app
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Backup Database
```bash
cd ~/crm-app
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U crm_user crm_database | gzip > backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## 🐛 Troubleshooting

### Issue: Cannot connect via SSH

**Solution**:
1. Check security group allows SSH (port 22) from your IP
2. Verify PEM file permissions (see Step 1.1)
3. Ensure instance is running in AWS Console

### Issue: Containers won't start

**Solution**:
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Rebuild from scratch
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
```

### Issue: Database connection error

**Solution**:
```bash
# Check postgres logs
docker compose -f docker-compose.prod.yml logs postgres

# Restart postgres
docker compose -f docker-compose.prod.yml restart postgres
```

### Issue: Frontend shows white screen

**Solution**:
1. Check browser console for errors
2. Verify VITE_API_BASE_URL in .env is correct
3. Rebuild frontend:
```bash
docker compose -f docker-compose.prod.yml up -d --build frontend
```

### Issue: API returns 502 Bad Gateway

**Solution**:
```bash
# Check backend status
docker compose -f docker-compose.prod.yml ps backend

# Restart backend
docker compose -f docker-compose.prod.yml restart backend

# Check backend logs
docker compose -f docker-compose.prod.yml logs backend
```

### Issue: Port 80 already in use

**Solution**:
```bash
# Find what's using port 80
sudo lsof -i :80

# If Apache/Nginx is installed, stop it
sudo systemctl stop apache2
sudo systemctl stop nginx
sudo systemctl disable apache2
sudo systemctl disable nginx

# Restart containers
docker compose -f docker-compose.prod.yml restart
```

### Issue: Out of disk space

**Solution**:
```bash
# Check disk usage
df -h

# Clean Docker resources
docker system prune -a --volumes

# Remove old backups
find ~/crm-app/backups -name "*.sql.gz" -mtime +7 -delete
```

---

## 📞 Quick Reference

| Item | Value |
|------|-------|
| **EC2 IP** | 65.0.7.221 |
| **SSH Key** | C:\Users\akaaa\Downloads\sharda-crm-pem.pem |
| **SSH Command** | `ssh -i "C:\Users\akaaa\Downloads\sharda-crm-pem.pem" ubuntu@65.0.7.221` |
| **App URL** | http://65.0.7.221 |
| **Health Check** | http://65.0.7.221/api/health/ |
| **Admin Panel** | http://65.0.7.221/admin/ |
| **App Directory** | /home/ubuntu/crm-app |
| **Docker Compose** | docker-compose.prod.yml |
| **GitHub Repo** | https://github.com/bruhanand/sharda-crm-dashboard.git |

---

## 🔐 Security Checklist

- [ ] EC2 Security Group only allows:
  - Port 22 (SSH) from your IP only
  - Port 80 (HTTP) from anywhere (0.0.0.0/0)
  - Port 443 (HTTPS) from anywhere if using SSL
- [ ] PEM file has restricted permissions
- [ ] DEBUG=False in .env
- [ ] Strong SECRET_KEY in .env
- [ ] Strong DB_PASSWORD in .env
- [ ] Regular backups scheduled
- [ ] EC2 instance has monitoring enabled

---

## 📚 Additional Resources

- **Deployment Runbook**: See `DEPLOYMENT_RUNBOOK.md` for detailed commands
- **How to Run Locally**: See `HOW_TO_RUN.md`
- **Troubleshooting Login**: See `TROUBLESHOOTING_LOGIN.md`
- **Security Guide**: See `SECURITY.md`

---

**Need Help?** Review the logs and check the troubleshooting section above.
