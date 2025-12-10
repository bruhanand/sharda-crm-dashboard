# File Analysis & Cleanup Recommendations

## Executive Summary

**Current Primary Deployment Method**: Digital Ocean (Non-Docker deployment with Python venv + Nginx)
**Database**: PostgreSQL (production), SQLite (development)
**Key Issues Found**:
- 🔴 **SECURITY**: Hardcoded credentials in deployment scripts (CRITICAL - must fix)
- 🟡 **DUPLICATION**: Multiple overlapping deployment scripts (EC2 scripts not needed)
- 🟡 **OUTDATED**: EC2 deployment scripts not in use
- 🟢 **ESSENTIAL**: `deploy-digitalocean.sh` is primary deployment script

---

## Detailed File Analysis

### ✅ **ESSENTIAL FILES** (Keep - Core Functionality)

#### 1. `.pre-commit-config.yaml`
**Status**: ✅ **KEEP** - Essential for code quality
**Importance**: HIGH
**Purpose**: 
- Enforces code quality standards (Black, isort, flake8, ESLint)
- Prevents committing secrets
- Validates YAML/JSON/TOML files
- Runs Django checks before commit
**Action**: Keep as-is. This is a best practice for maintaining code quality.

---

#### 2. `docker-compose.yml`
**Status**: ✅ **KEEP** - Essential for local development
**Importance**: HIGH
**Purpose**: 
- Local development environment
- Uses PostgreSQL, backend, frontend services
- Port 3000 for frontend, 8000 for backend
**Current Usage**: Active - referenced in README.md
**Action**: Keep. This is the standard local development setup.

---

#### 3. `docker-compose.prod.yml`
**Status**: ✅ **KEEP** - Essential for production deployment
**Importance**: CRITICAL
**Purpose**: 
- Production Docker Compose configuration
- Includes PostgreSQL, backend, frontend
- Health checks, proper networking
- Used by `deploy-to-ec2.ps1` and other deployment scripts
**Current Usage**: Active - primary production deployment method
**Action**: Keep. This is your main production deployment configuration.

---

#### 4. `docker-redis-config.yml`
**Status**: ⚠️ **REVIEW** - May be outdated
**Importance**: MEDIUM
**Purpose**: 
- Redis configuration for caching
- Standalone file (not integrated into main compose files)
**Current Usage**: Unknown - Redis not in docker-compose.yml or docker-compose.prod.yml
**Issues**: 
- Redis service not included in main compose files
- If Redis is needed, should be integrated into docker-compose.prod.yml
**Action**: 
- **If using Redis**: Integrate into docker-compose.prod.yml and remove this file
- **If not using Redis**: Delete this file

---

### ⚠️ **DEPLOYMENT SCRIPTS** (Review & Clean)

#### 5. `deploy-to-ec2.ps1`
**Status**: ⚠️ **NOT IN USE** - EC2 deployment (not primary)
**Importance**: LOW (not currently used)
**Purpose**: 
- EC2 deployment automation with Docker
- Handles git push, SSH connection, Docker deployment
- Uses `docker-compose.prod.yml`
**Current Usage**: Not active - Digital Ocean is primary deployment
**Issues**: 
- 🔴 **SECURITY**: Hardcoded EC2 IP (15.207.55.179) and PEM path
- Hardcoded paths specific to your machine
- Different deployment method (Docker) vs current Digital Ocean approach
**Action**: 
- **If not using EC2**: Delete this file
- **If keeping for future use**: Move to `scripts/archive/` and remove hardcoded credentials
- **Recommendation**: Delete since Digital Ocean is primary deployment method

---

#### 6. `deploy-digitalocean.sh`
**Status**: ✅ **KEEP** - PRIMARY deployment script
**Importance**: CRITICAL
**Purpose**: 
- Primary deployment script for Digital Ocean droplet
- Sets up Python venv, Nginx, systemd services
- Non-Docker deployment (direct Python/Node.js)
- Handles full server setup, file transfer, service configuration
**Current Usage**: ACTIVE - This is your primary deployment method
**Issues**: 
- 🔴 **CRITICAL SECURITY**: Hardcoded credentials (IP: 139.59.19.124, password: Akaaand@1234AK)
- Hardcoded paths and credentials must be moved to environment variables
**Action**: 
- **KEEP** - This is essential for your deployment
- **IMMEDIATE ACTION REQUIRED**: 
  - Remove hardcoded credentials immediately
  - Move IP, username, password to environment variables or config file
  - Add credential file to .gitignore
  - Document required environment variables in README

---

#### 7. `deploy-fast.ps1`
**Status**: 🔴 **DELETE** - Referenced scripts don't exist
**Importance**: LOW
**Purpose**: 
- Wrapper script that calls `scripts\package-for-deploy.ps1` and `scripts\fast-deploy.ps1`
**Current Usage**: Broken - referenced scripts don't exist
**Issues**: 
- ❌ **BROKEN**: References `scripts\package-for-deploy.ps1` and `scripts\fast-deploy.ps1` which **DO NOT EXIST**
- Overlaps with `deploy-to-ec2.ps1`
- Will fail if executed
**Action**: 
- **DELETE** - Scripts don't exist, file is broken
- **Recommendation**: Delete immediately

---

#### 8. `deploy-ml-forecast.ps1`
**Status**: ⚠️ **NOT COMPATIBLE** - EC2/Docker specific
**Importance**: LOW (not compatible with Digital Ocean deployment)
**Purpose**: 
- Deploys ML forecasting libraries to EC2 using Docker
- Installs statsmodels, prophet, scikit-learn in Docker container
- Specific to Docker/EC2 deployment
**Current Usage**: Not compatible with Digital Ocean non-Docker deployment
**Issues**: 
- 🔴 **SECURITY**: Hardcoded EC2 IP (3.110.37.29) and PEM path
- Uses Docker commands (`docker compose exec`) which won't work with Digital Ocean setup
- Different deployment method than your current Digital Ocean approach
**Action**: 
- **If ML libraries needed on Digital Ocean**: Create new script for Digital Ocean venv installation
- **If not using ML**: Delete this file
- **Recommendation**: Delete or rewrite for Digital Ocean deployment method

---

### ⚠️ **LOCAL DEVELOPMENT SCRIPTS** (Review for Duplication)

#### 9. `start-local.sh`
**Status**: ✅ **KEEP** - Linux/Mac local development
**Importance**: HIGH (for Linux/Mac users)
**Purpose**: 
- Sets up local development environment
- Creates venv, installs dependencies, runs migrations
- Starts Django and Vite servers
**Current Usage**: Active for Linux/Mac developers
**Action**: Keep. Essential for non-Windows developers.

---

#### 10. `start-local.ps1`
**Status**: ✅ **KEEP** - Windows local development
**Importance**: HIGH (for Windows users)
**Purpose**: 
- Windows PowerShell version of `start-local.sh`
- Same functionality for Windows
**Current Usage**: Active for Windows developers
**Action**: Keep. Essential for Windows developers.

---

#### 11. `start_servers.bat`
**Status**: ⚠️ **DUPLICATE** - Overlaps with start-local.ps1
**Importance**: LOW
**Purpose**: 
- Windows batch file to start servers
- Similar to `start-local.ps1` but uses batch syntax
**Current Usage**: Unknown - PowerShell version may be preferred
**Issues**: 
- Duplicates functionality of `start-local.ps1`
- Uses older batch syntax vs modern PowerShell
**Action**: 
- **If team prefers batch files**: Keep
- **If PowerShell is standard**: Delete this file
- **Recommendation**: Delete in favor of PowerShell version

---

### ⚠️ **SERVER MANAGEMENT SCRIPTS** (Review Usage)

#### 12. `restart-backend.sh`
**Status**: ✅ **KEEP** - Compatible with Digital Ocean deployment
**Importance**: HIGH
**Purpose**: 
- Restarts backend service (systemd or manual Gunicorn)
- For non-Docker deployments (matches your Digital Ocean setup)
**Current Usage**: Compatible with Digital Ocean deployment method
**Issues**: 
- None - this script is designed for non-Docker deployments
**Action**: 
- **KEEP** - This is useful for your Digital Ocean deployment
- May need minor adjustments for your specific systemd service name

---

#### 13. `restart-server.sh`
**Status**: ✅ **KEEP** - Compatible with Digital Ocean deployment
**Importance**: HIGH
**Purpose**: 
- Restarts both backend (Gunicorn) and Nginx
- For non-Docker deployments (matches your Digital Ocean setup)
**Current Usage**: Compatible with Digital Ocean deployment method
**Issues**: 
- None - this script is designed for non-Docker deployments
- Slightly overlaps with `restart-backend.sh` but includes Nginx restart
**Action**: 
- **KEEP** - This is useful for your Digital Ocean deployment
- More comprehensive than `restart-backend.sh` (includes Nginx)

---

### 🔴 **SECURITY RISK FILES** (Requires Immediate Action)

#### 14. `delete-sqlite-server.sh`
**Status**: 🔴 **SECURITY RISK** - Contains hardcoded credentials
**Importance**: LOW (specialized use case)
**Purpose**: 
- Deletes SQLite database from production server
- Creates backup before deletion
**Current Usage**: Specialized - only for SQLite cleanup
**Issues**: 
- 🔴 **CRITICAL SECURITY**: Hardcoded credentials (IP: 139.59.19.124, password: Akaaand@1234AK)
- Production uses PostgreSQL, not SQLite (based on docker-compose.prod.yml)
- May be completely unnecessary
**Action**: 
- **IMMEDIATE**: Remove hardcoded credentials
- **If not using SQLite in production**: Delete this file
- **Recommendation**: Delete - production uses PostgreSQL, not SQLite

---

## Summary & Recommendations

### Files to KEEP (Essential)
1. ✅ `.pre-commit-config.yaml` - Code quality
2. ✅ `docker-compose.yml` - Local development (optional, for Docker dev)
3. ✅ `docker-compose.prod.yml` - Production deployment (optional, for Docker)
4. ✅ `deploy-digitalocean.sh` - **PRIMARY deployment script** (refactor credentials - CRITICAL)
5. ✅ `restart-backend.sh` - Backend service management
6. ✅ `restart-server.sh` - Full server restart (backend + Nginx)
7. ✅ `start-local.sh` - Linux/Mac development
8. ✅ `start-local.ps1` - Windows development

### Files to REVIEW & POTENTIALLY DELETE
1. ⚠️ `docker-redis-config.yml` - Integrate or delete (not used in Digital Ocean)
2. 🔴 `deploy-to-ec2.ps1` - **DELETE** (not in use, Digital Ocean is primary)
3. 🔴 `deploy-fast.ps1` - **DELETE** (referenced scripts don't exist - broken)
4. ⚠️ `deploy-ml-forecast.ps1` - **DELETE or REWRITE** (EC2/Docker specific, not compatible)
5. ⚠️ `start_servers.bat` - Delete if PowerShell is standard
6. ⚠️ `docker-compose.yml` - Keep for local Docker dev, or delete if not using
7. ⚠️ `docker-compose.prod.yml` - Keep for Docker deployments, or delete if not using

### Files to DELETE (Security/Outdated)
1. 🔴 `delete-sqlite-server.sh` - **DELETE** (security risk, not needed for PostgreSQL)

---

## Immediate Action Items

### 🔴 CRITICAL (Security - IMMEDIATE ACTION REQUIRED)
1. **Remove hardcoded credentials from `deploy-digitalocean.sh`** (PRIMARY DEPLOYMENT SCRIPT):
   - IP: 139.59.19.124
   - Password: Akaaand@1234AK
   - Move to environment variables or `.env.deploy` file
   - Add credential file to `.gitignore`
   - This is your PRIMARY deployment script - security is critical!

2. **Delete `delete-sqlite-server.sh`** - Contains credentials and not needed for PostgreSQL

3. **Remove hardcoded credentials from** (if keeping for reference):
   - `deploy-to-ec2.ps1` (or delete if not using)
   - `deploy-ml-forecast.ps1` (or delete if not using)

### 🟡 HIGH PRIORITY (Cleanup)
1. **Remove EC2 deployment scripts** (not in use):
   - Delete `deploy-to-ec2.ps1` - not compatible with Digital Ocean
   - Delete `deploy-ml-forecast.ps1` - EC2/Docker specific
   - Delete `deploy-fast.ps1` - broken (scripts don't exist)

2. **Remove duplicate local start scripts**:
   - Keep `start-local.ps1` (PowerShell)
   - Delete `start_servers.bat` (batch file)

3. **Review Docker Compose files**:
   - Keep if you want Docker for local development
   - Delete if you're only using Digital Ocean non-Docker deployment

4. **Review Redis configuration**:
   - Delete `docker-redis-config.yml` if not using Redis
   - If using Redis on Digital Ocean, create venv-based installation script

### 🟢 MEDIUM PRIORITY (Organization)
1. **Move deployment scripts to `scripts/` folder**:
   - Organize all deployment scripts in one place
   - Keep only essential ones in root

2. **Document deployment process**:
   - Update README with current deployment method
   - Remove references to deleted scripts

---

## Recommended File Structure After Cleanup

```
crm-sharda/
├── .pre-commit-config.yaml          # Keep
├── deploy-digitalocean.sh           # Keep (PRIMARY - refactor credentials!)
├── restart-backend.sh                # Keep (Digital Ocean compatible)
├── restart-server.sh                 # Keep (Digital Ocean compatible)
├── start-local.sh                    # Keep (Linux/Mac dev)
├── start-local.ps1                   # Keep (Windows dev)
├── docker-compose.yml                # Keep (optional - for Docker local dev)
├── docker-compose.prod.yml           # Keep (optional - for Docker deployments)
├── scripts/
│   └── fix_413_deploy.ps1            # Keep (already here)
└── [DELETE]:
    ├── delete-sqlite-server.sh       # DELETE (security risk, not needed)
    ├── deploy-to-ec2.ps1             # DELETE (not in use - EC2)
    ├── deploy-fast.ps1               # DELETE (broken - scripts don't exist)
    ├── deploy-ml-forecast.ps1        # DELETE (EC2/Docker specific)
    ├── start_servers.bat             # DELETE (duplicate of PowerShell)
    └── docker-redis-config.yml       # DELETE (not used in Digital Ocean)
```

---

## Next Steps

1. **🔴 IMMEDIATE SECURITY FIX**: Remove hardcoded credentials from `deploy-digitalocean.sh`
   - Create `.env.deploy` file with credentials
   - Update script to read from environment variables
   - Add `.env.deploy` to `.gitignore`

2. **Delete EC2 deployment scripts** (not in use):
   - `deploy-to-ec2.ps1`
   - `deploy-ml-forecast.ps1`
   - `deploy-fast.ps1`

3. **Delete other unnecessary files**:
   - `delete-sqlite-server.sh` (security risk)
   - `start_servers.bat` (duplicate)
   - `docker-redis-config.yml` (if not using Redis)

4. **Update README.md** to reflect Digital Ocean as primary deployment method

5. **Optional**: Move deployment scripts to `scripts/` folder for better organization

