# CRM Deployment Runbook - Quick Commands

**Target**: 13.235.68.78 | **Key**: C:\Users\akaaa\Downloads\my-aws-ec2-keypair.pem

---

## 🚀 ONE-COMMAND DEPLOYMENT

```bash
# 1. Configure .env (one time)
cp env.production.sample .env
nano .env  # Add your secrets

# 2. Deploy everything
./deployment/deploy.sh

# 3. Verify
./tests/smoke-test.sh http://13.235.68.78
```

**Done!** Access: http://13.235.68.78

---

## 📝 Step-by-Step (If Automated Fails)

### STEP 1: Generate Secrets (5 min)

```bash
# Django SECRET_KEY
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Database password
openssl rand -base64 32

# Admin password
openssl rand -base64 16
```

**Save these securely!**

---

### STEP 2: Configure .env (5 min)

```bash
cp env.production.sample .env
```

Edit `.env` and set:
```bash
SECRET_KEY=<generated-secret>
DB_PASSWORD=<generated-db-pass>
ADMIN_PASSWORD=<generated-admin-pass>
DEBUG=False
ALLOWED_HOSTS=13.235.68.78
```

---

### STEP 3: EC2 First-Time Setup (10 min)

```bash
# SSH to EC2
ssh -i "C:\Users\akaaa\Downloads\my-aws-ec2-keypair.pem" ubuntu@13.235.68.78

# Run setup (one-time only)
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y docker.io docker-compose htop curl
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker ubuntu
mkdir -p /home/ubuntu/crm-app/{logs,backups}

# Logout and login
exit
ssh -i "C:\Users\akaaa\Downloads\my-aws-ec2-keypair.pem" ubuntu@13.235.68.78

# Test docker
docker ps  # Should work without sudo
```

---

### STEP 4: Deploy Application (10 min)

```bash
# From LOCAL machine
cd C:\Users\akaaa\Downloads\crm-sharda

# Copy files to EC2
scp -i "C:\Users\akaaa\Downloads\my-aws-ec2-keypair.pem" -r \
    backend frontend deployment scripts docker-compose.prod.yml .env \
    ubuntu@13.235.68.78:/home/ubuntu/crm-app/

# SSH to EC2
ssh -i "C:\Users\akaaa\Downloads\my-aws-ec2-keypair.pem" ubuntu@13.235.68.78

# Deploy
cd /home/ubuntu/crm-app
docker-compose -f docker-compose.prod.yml up -d --build

# Check status (wait 30 seconds first)
docker-compose -f docker-compose.prod.yml ps

# Should show 3 containers running
```

---

### STEP 5: Verify Deployment (5 min)

```bash
# From EC2
curl http://localhost/api/health/
# Should return: {"status":"healthy","database":"connected"}

# From LOCAL machine
./tests/smoke-test.sh http://13.235.68.78

# Open browser
# http://13.235.68.78
# Login with admin credentials from .env
```

---

### STEP 6: Configure Backups (5 min)

```bash
# On EC2
cd /home/ubuntu/crm-app
chmod +x scripts/*.sh

# Test backup
./scripts/db_backup.sh

# Add cron for daily backups at 2 AM
crontab -e
# Add this line:
0 2 * * * cd /home/ubuntu/crm-app && ./scripts/db_backup.sh >> logs/backup.log 2>&1
```

---

## 🔍 VERIFICATION COMMANDS

```bash
# Container status
docker-compose -f docker-compose.prod.yml ps

# Logs (all services)
docker-compose -f docker-compose.prod.yml logs -f

# Logs (specific service)
docker-compose -f docker-compose.prod.yml logs -f backend

# Health check
curl http://13.235.68.78/api/health/

# Test frontend
curl -I http://13.235.68.78/

# Check disk space
df -h

# Check memory
free -h

# Check system load
htop
```

---

## 🔄 RESTART/RELOAD COMMANDS

```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Full reload (rebuild)
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# View startup logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 💾 BACKUP & RESTORE

### Backup Database

```bash
cd /home/ubuntu/crm-app
./scripts/db_backup.sh

# Manual backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U crm_user crm_production | gzip > backups/manual_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore Database

```bash
cd /home/ubuntu/crm-app

# List backups
ls -lh backups/

# Restore specific backup
./scripts/db_restore.sh backups/backup_20241204_020000.sql.gz

# Manual restore
gunzip < backups/backup_20241204_020000.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U crm_user crm_production
```

---

## 🔙 ROLLBACK PROCEDURES

### Level 1: Quick Restart (30 seconds)
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Level 2: Reload Containers (2 minutes)
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Level 3: Database Rollback (5 minutes)
```bash
cd /home/ubuntu/crm-app
docker-compose -f docker-compose.prod.yml stop backend
./scripts/db_restore.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz
docker-compose -f docker-compose.prod.yml start backend
```

### Level 4: Full Rollback (15 minutes)
```bash
docker-compose -f docker-compose.prod.yml down -v
# Restore .env from backup if needed
./scripts/db_restore.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🐛 TROUBLESHOOTING

### Containers Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check .env file
cat .env

# Check disk space
df -h

# Check memory
free -h

# Remove and rebuild
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Connection Failed
```bash
# Check postgres logs
docker-compose -f docker-compose.prod.yml logs postgres

# Check postgres is running
docker-compose -f docker-compose.prod.yml ps postgres

# Test connection manually
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U crm_user -d crm_production -c "SELECT 1;"

# Restart postgres
docker-compose -f docker-compose.prod.yml restart postgres
```

### Frontend Returns 502
```bash
# Check backend status
docker-compose -f docker-compose.prod.yml ps backend

# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Check backend health
curl http://localhost:8000/api/health/

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Out of Disk Space
```bash
# Check space
df -h

# Clean Docker
docker system prune -a
docker volume prune

# Clean logs
truncate -s 0 /home/ubuntu/crm-app/logs/*.log

# Clean old backups
find /home/ubuntu/crm-app/backups -name "*.sql.gz" -mtime +7 -delete
```

### High Memory Usage
```bash
# Check memory
free -h

# Check which container
docker stats --no-stream

# Restart heavy container
docker-compose -f docker-compose.prod.yml restart backend

# Restart all
docker-compose -f docker-compose.prod.yml restart
```

---

## 📊 MONITORING COMMANDS

```bash
# Container stats
docker stats

# System resources
htop

# Disk usage
df -h
du -sh /home/ubuntu/crm-app/*

# Memory
free -h

# Network connections
netstat -tuln | grep -E '80|8000|5432'

# Application logs (last 100 lines)
docker-compose -f docker-compose.prod.yml logs --tail=100

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f

# Check health endpoint
watch -n 5 'curl -s http://localhost/api/health/ | jq'
```

---

## 🔧 MAINTENANCE COMMANDS

### Update Application
```bash
# On LOCAL machine - pull latest code
cd C:\Users\akaaa\Downloads\crm-sharda
git pull

# Deploy updates
./deployment/deploy.sh
```

### Run Database Migrations
```bash
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py migrate

# Check migration status
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py showmigrations
```

### Create Admin User
```bash
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py create_admin
```

### Collect Static Files
```bash
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py collectstatic --noinput
```

### Django Shell
```bash
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py shell
```

### Database Shell
```bash
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U crm_user crm_production
```

---

## 🔐 SECURITY COMMANDS

### Rotate Django Secret Key
```bash
# Generate new key
NEW_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")

# Update .env on EC2
ssh -i "key.pem" ubuntu@13.235.68.78
nano /home/ubuntu/crm-app/.env
# Update SECRET_KEY line

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Rotate Database Password
```bash
# Generate new password
NEW_PASS=$(openssl rand -base64 32)

# Change in PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U crm_user -c "ALTER USER crm_user WITH PASSWORD '$NEW_PASS';"

# Update .env
nano /home/ubuntu/crm-app/.env
# Update DB_PASSWORD and POSTGRES_PASSWORD

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Check Security Headers
```bash
curl -I http://13.235.68.78/ | grep -E "X-Frame|X-Content|X-XSS"
```

### Audit Dependencies
```bash
# Backend
docker-compose -f docker-compose.prod.yml exec backend \
  pip list --outdated

# Frontend (on local machine)
cd frontend
npm audit
```

---

## 📞 QUICK REFERENCE

| Item | Value |
|------|-------|
| **EC2 IP** | 13.235.68.78 |
| **SSH Key** | C:\Users\akaaa\Downloads\my-aws-ec2-keypair.pem |
| **App URL** | http://13.235.68.78 |
| **Health** | http://13.235.68.78/api/health/ |
| **Admin** | http://13.235.68.78/admin/ |
| **Compose File** | docker-compose.prod.yml |
| **App Dir** | /home/ubuntu/crm-app |
| **Logs Dir** | /home/ubuntu/crm-app/logs |
| **Backups** | /home/ubuntu/crm-app/backups |

### SSH Aliases (Optional)
```bash
# Add to ~/.ssh/config
Host crm-prod
    HostName 13.235.68.78
    User ubuntu
    IdentityFile C:/Users/akaaa/Downloads/my-aws-ec2-keypair.pem

# Now you can use: ssh crm-prod
```

---

## 🎯 COMMON WORKFLOWS

### Deploy Update
```bash
./deployment/deploy.sh && ./tests/smoke-test.sh http://13.235.68.78
```

### Check Application Health
```bash
ssh crm-prod 'cd crm-app && docker-compose -f docker-compose.prod.yml ps && curl -s http://localhost/api/health/'
```

### View Recent Logs
```bash
ssh crm-prod 'cd crm-app && docker-compose -f docker-compose.prod.yml logs --tail=50'
```

### Backup Before Update
```bash
ssh crm-prod 'cd crm-app && ./scripts/db_backup.sh'
```

### Full Health Check
```bash
ssh crm-prod 'docker ps && df -h && free -h && curl -s http://localhost/api/health/ | jq'
```

---

**For detailed procedures**: See DEPLOYMENT_PLAN.md  
**For troubleshooting**: See DEPLOY.md  
**For checklist**: See DEPLOYMENT_CHECKLIST.md

