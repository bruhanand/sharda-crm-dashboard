# Fast Deployment Guide - Optimized for Slow Connections

## 🚀 Why Fast Deploy?

Traditional deployment copies **hundreds of individual files** which is slow over network.  
**Fast Deploy** creates a **single zip file** and uploads that instead.

**Speed Improvement**: 5-10x faster! ⚡

---

## ⚡ One-Command Deployment

```powershell
.\deploy-fast.ps1
```

**That's it!** This will:
1. ✅ Package all files into a zip (excludes node_modules, venv, etc.)
2. ✅ Upload single zip file to EC2 (much faster)
3. ✅ Extract on EC2
4. ✅ Build and start Docker containers
5. ✅ Run health checks

**Duration**: ~10-15 minutes (vs 30+ minutes with traditional method)

---

## 📋 Step-by-Step (If You Prefer)

### Step 1: Package for Deployment

```powershell
.\scripts\package-for-deploy.ps1
```

**What it does:**
- Creates temporary folder with only necessary files
- Excludes: node_modules, venv, __pycache__, *.pyc, *.sqlite3, logs
- Creates: `crm-deploy-YYYYMMDD_HHMMSS.zip`
- Typical size: 5-15 MB (vs 200+ MB with everything)

**Output:**
```
[1/4] Checking .env file...
✓ .env file found

[2/4] Creating temporary deployment folder...
  Copying backend files...
  Copying frontend files...
  Copying deployment files...
  Copying configuration files...
✓ Files copied

[3/4] Creating zip archive...
✓ Created: crm-deploy-20241204_143022.zip (8.5 MB)

[4/4] Cleaning up...
✓ Temporary files removed

✅ Package Ready!
```

---

### Step 2: Fast Deploy to EC2

```powershell
.\scripts\fast-deploy.ps1
```

**What it does:**
1. Finds latest deployment zip
2. Tests SSH connection
3. Uploads zip to EC2 (single file = fast!)
4. Extracts on EC2
5. Backs up previous deployment
6. Runs Docker deployment
7. Verifies health

**Output:**
```
[1/6] Finding deployment package...
✓ Found: crm-deploy-20241204_143022.zip (8.5 MB)

[2/6] Testing SSH connection...
✓ SSH connection successful

[3/6] Uploading deployment package...
  This should be much faster than individual files!
✓ Upload complete in 12.3 seconds

[4/6] Extracting and preparing on EC2...
  Backing up existing deployment...
  Creating deployment directory...
  Extracting package...
  Setting permissions...
✓ Files extracted on EC2

[5/6] Starting Docker deployment...
  Stopping existing containers...
  Building and starting services...
  Waiting for services to start...
✓ Deployment complete

[6/6] Running health check...
✓ Health check passed!

✅ Deployment Complete!

Application URL: http://13.235.68.78
```

---

## 🔍 What Gets Packaged?

### ✅ Included:
- `backend/` - Python source code only
- `frontend/` - Source code (node_modules built on EC2)
- `deployment/` - Deployment scripts
- `scripts/` - Utility scripts
- `docker-compose.prod.yml` - Production config
- `.env` - Your environment configuration

### ❌ Excluded (Saves 200+ MB):
- `backend/venv/` - Virtual environment (recreated in Docker)
- `backend/__pycache__/` - Python cache
- `backend/*.pyc` - Compiled Python
- `backend/*.sqlite3` - Local database
- `backend/logs/` - Log files
- `frontend/node_modules/` - Dependencies (npm install in Docker)
- `frontend/dist/` - Build output (created in Docker)
- `frontend/.vite/` - Vite cache

---

## 📊 Speed Comparison

| Method | Files | Size | Upload Time* | Total Time |
|--------|-------|------|--------------|------------|
| **Traditional (scp -r)** | 5000+ files | 250 MB | 15-30 min | 30-45 min |
| **Fast Deploy (zip)** | 1 file | 8-15 MB | 30-60 sec | 10-15 min |

*Assuming typical home/office upload speed (5-10 Mbps)

**Result**: 3-5x faster! ⚡

---

## 🔄 Update Existing Deployment

To update an already-deployed application:

```powershell
.\deploy-fast.ps1
```

**What happens:**
1. Previous deployment automatically backed up to `crm-app-backup.zip`
2. New deployment extracted
3. Docker containers rebuilt with new code
4. Zero downtime during upload (containers still running)
5. Brief downtime during container restart (~30 seconds)

---

## 🔙 Rollback (If Needed)

If deployment fails, rollback to previous version:

```powershell
ssh -i "C:\Users\akaaa\Downloads\my-aws-ec2-keypair.pem" ubuntu@13.235.68.78
cd /home/ubuntu
rm -rf crm-app
unzip -q crm-app-backup.zip
cd crm-app
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🛠️ Troubleshooting

### Problem: "No deployment package found"

**Solution:**
```powershell
.\scripts\package-for-deploy.ps1
```

---

### Problem: ".env file not found"

**Solution:**
```powershell
cp env.production.sample .env
# Edit .env with your secrets
notepad .env
```

---

### Problem: "Cannot connect to EC2"

**Check:**
1. EC2 instance is running (AWS Console)
2. Security group allows SSH (port 22) from your IP
3. SSH key path is correct
4. Internet connection working

**Test:**
```powershell
ssh -i "C:\Users\akaaa\Downloads\my-aws-ec2-keypair.pem" ubuntu@13.235.68.78 "echo OK"
```

---

### Problem: "Upload is still slow"

**Possible causes:**
1. Slow upload speed (check: speedtest.net)
2. Large files not excluded (check zip size)
3. AWS region far from your location

**Check zip size:**
```powershell
Get-Item crm-deploy-*.zip | Select-Object Name, @{N='Size(MB)';E={[math]::Round($_.Length/1MB,2)}}
```

Should be 5-20 MB. If larger, check what's included.

---

## 📝 Manual Packaging (Advanced)

If you want to customize what gets packaged:

```powershell
# Create custom zip
$exclude = @('venv', 'node_modules', '__pycache__', 'dist', '.vite', '*.pyc', '*.sqlite3')

# PowerShell doesn't handle excludes well in Compress-Archive
# Use this approach instead:

# 1. Create temp folder
mkdir deploy-temp
Copy-Item -Recurse backend, frontend, deployment, scripts, docker-compose.prod.yml, .env -Destination deploy-temp/

# 2. Remove unwanted folders
Remove-Item -Recurse -Force deploy-temp/backend/venv -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force deploy-temp/frontend/node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force deploy-temp/frontend/dist -ErrorAction SilentlyContinue

# 3. Create zip
Compress-Archive -Path deploy-temp/* -DestinationPath custom-deploy.zip

# 4. Cleanup
Remove-Item -Recurse -Force deploy-temp

# 5. Deploy
.\scripts\fast-deploy.ps1 -ZipFile custom-deploy.zip
```

---

## ✅ Pre-Deployment Checklist

Before running fast deploy:

- [ ] `.env` file configured with correct values
- [ ] DEBUG=False in .env
- [ ] IP address correct (13.235.68.78)
- [ ] SSH key accessible
- [ ] EC2 instance running
- [ ] Docker installed on EC2

**Quick check:**
```powershell
# Check .env exists
Test-Path .env

# Check SSH connection
ssh -i "C:\Users\akaaa\Downloads\my-aws-ec2-keypair.pem" ubuntu@13.235.68.78 "docker --version"
```

---

## 🎯 Quick Reference

| Command | Purpose |
|---------|---------|
| `.\deploy-fast.ps1` | Full deployment (package + deploy) |
| `.\scripts\package-for-deploy.ps1` | Create deployment package |
| `.\scripts\fast-deploy.ps1` | Deploy existing package |
| `.\scripts\fast-deploy.ps1 -ZipFile custom.zip` | Deploy specific package |

---

## 📊 What Happens on EC2

When you run fast deploy:

```
EC2 Instance
├── /tmp/crm-deploy-*.zip        (uploaded zip)
├── /home/ubuntu/crm-app-backup.zip  (previous deployment backup)
└── /home/ubuntu/crm-app/        (current deployment)
    ├── backend/
    ├── frontend/
    ├── deployment/
    ├── scripts/
    ├── docker-compose.prod.yml
    ├── .env
    └── (containers running)
```

---

## 🔐 Security Notes

- `.env` file included in zip (contains secrets)
- Zip file uploaded to `/tmp/` (deleted after extraction)
- Previous deployment backed up (can be restored)
- Backup contains your previous `.env`

**Best Practice:** After successful deployment, you can delete old zips:

```powershell
Remove-Item crm-deploy-*.zip -Force
```

On EC2:
```bash
ssh -i "keypair.pem" ubuntu@13.235.68.78 "rm -f /tmp/crm-deploy-*.zip"
```

---

## 🎉 Success!

After successful deployment:

1. **Access**: http://13.235.68.78
2. **Login**: Use credentials from your `.env` file
3. **Verify**: All features working
4. **Monitor**: Check logs if needed

**View logs:**
```powershell
ssh -i "C:\Users\akaaa\Downloads\my-aws-ec2-keypair.pem" ubuntu@13.235.68.78 "cd crm-app && docker-compose -f docker-compose.prod.yml logs -f"
```

---

**Last Updated**: December 4, 2024  
**Method**: Optimized Zip Upload  
**Speed**: 3-5x faster than traditional deployment

