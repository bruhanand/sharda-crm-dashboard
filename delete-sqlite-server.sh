#!/bin/bash

# ============================================
# Delete SQLite Database from Server
# ============================================
# This script deletes the SQLite database file from the production server
# WARNING: This will permanently delete all data in the SQLite database!
# ============================================

set -e

echo "============================================"
echo "  Delete SQLite Database from Server"
echo "============================================"
echo ""
echo "⚠️  WARNING: This will permanently delete the SQLite database!"
echo "⚠️  All data in the database will be lost!"
echo ""
echo "🔒 SECURITY WARNING: This script contains hardcoded credentials!"
echo "   Consider using SSH keys or environment variables for production."
echo ""

# Configuration - Default values (can be overridden)
DEFAULT_DROPLET_IP="139.59.19.124"
DEFAULT_SSH_USER="root"
DEFAULT_SSH_PASS="Akaaand@1234AK"

# Allow override via environment variables or prompts
if [ -z "$DROPLET_IP" ]; then
    read -p "Enter your Digital Ocean droplet IP address (default: $DEFAULT_DROPLET_IP): " DROPLET_IP
    DROPLET_IP=${DROPLET_IP:-$DEFAULT_DROPLET_IP}
fi

if [ -z "$SSH_USER" ]; then
    read -p "Enter your SSH username (default: $DEFAULT_SSH_USER): " SSH_USER
    SSH_USER=${SSH_USER:-$DEFAULT_SSH_USER}
fi

if [ -z "$DROPLET_IP" ]; then
    echo "❌ IP address is required!"
    exit 1
fi

# Confirmation
echo ""
read -p "Are you SURE you want to delete the SQLite database? (type 'DELETE' to confirm): " CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
    echo "❌ Confirmation failed. Operation cancelled."
    exit 1
fi

# Check authentication method
echo ""
read -p "Are you using password authentication? (y/n, default: y): " USE_PASSWORD
USE_PASSWORD=${USE_PASSWORD:-y}

SSH_PASS=""
if [[ "$USE_PASSWORD" =~ ^[Yy]$ ]]; then
    # Use default password if available, otherwise prompt
    if [ -n "$DEFAULT_SSH_PASS" ]; then
        read -p "Use saved password? (y/n, default: y): " USE_SAVED_PASS
        USE_SAVED_PASS=${USE_SAVED_PASS:-y}
        
        if [[ "$USE_SAVED_PASS" =~ ^[Yy]$ ]]; then
            SSH_PASS="$DEFAULT_SSH_PASS"
            echo "✓ Using saved password"
        else
            read -sp "Enter SSH password: " SSH_PASS
            echo ""
        fi
    else
        read -sp "Enter SSH password: " SSH_PASS
        echo ""
    fi
    
    if [ -z "$SSH_PASS" ]; then
        echo "❌ Password cannot be empty!"
        exit 1
    fi
    
    # Check if sshpass is installed
    if ! command -v sshpass &> /dev/null; then
        echo "Installing sshpass for password authentication..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew &> /dev/null; then
                brew install hudochenkov/sshpass/sshpass
            else
                echo "❌ Please install Homebrew first, or use SSH key authentication"
                exit 1
            fi
        else
            sudo apt-get update && sudo apt-get install -y sshpass
        fi
    fi
    
    # Use SSHPASS environment variable (more reliable with special characters)
    export SSHPASS="$SSH_PASS"
    SSH_CMD="sshpass -e ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10"
else
    SSH_CMD="ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10"
fi

echo ""
echo "Connecting to server and deleting SQLite database..."

# Server paths (defined here for reference, but will be set in remote script)
SERVER_APP_DIR="/var/www/crm-app"

# Execute commands on server
# Use unquoted heredoc delimiter to allow variable expansion, but escape $ in remote commands
$SSH_CMD ${SSH_USER}@${DROPLET_IP} << REMOTE_SCRIPT
set -e

SERVER_APP_DIR="/var/www/crm-app"
DB_PATH="\${SERVER_APP_DIR}/backend/db.sqlite3"
DB_BACKUP_PATH="\${SERVER_APP_DIR}/backend/db.sqlite3.backup.\$(date +%Y%m%d_%H%M%S)"

echo "📦 Stopping backend service..."
sudo systemctl stop crm-backend.service || echo "Service might not be running"

echo "💾 Creating backup of database (just in case)..."
if [ -f "\$DB_PATH" ]; then
    cp "\$DB_PATH" "\$DB_BACKUP_PATH" || echo "Backup failed, continuing anyway..."
    echo "✓ Backup created at: \$DB_BACKUP_PATH"
else
    echo "⚠️  Database file not found at \$DB_PATH"
fi

echo "🗑️  Deleting SQLite database..."
if [ -f "\$DB_PATH" ]; then
    rm -f "\$DB_PATH"
    echo "✓ Database file deleted successfully"
else
    echo "⚠️  Database file not found (might already be deleted)"
fi

# Also check for any other SQLite files
echo "🔍 Checking for other SQLite files..."
find \${SERVER_APP_DIR}/backend -name "*.sqlite3" -type f 2>/dev/null | while read file; do
    echo "  Found: \${file}"
done || echo "  No other SQLite files found"

echo ""
echo "✅ SQLite database deletion complete!"
echo ""
echo "📦 Creating new database by running migrations..."
cd \${SERVER_APP_DIR}/backend

# Activate virtual environment and run migrations
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✓ Virtual environment activated"
    
    # Run migrations to create new database
    python manage.py migrate --noinput
    echo "✓ Migrations completed - new database created"
    
    # Collect static files (in case they're needed)
    python manage.py collectstatic --noinput 2>/dev/null || echo "⚠️  Static files collection skipped (not critical)"
    
    deactivate
else
    echo "❌ Virtual environment not found at \${SERVER_APP_DIR}/backend/venv"
    echo "⚠️  Please run migrations manually:"
    echo "   cd \${SERVER_APP_DIR}/backend"
    echo "   source venv/bin/activate"
    echo "   python manage.py migrate"
fi

echo ""
echo "✅ New database created successfully!"
echo ""
echo "Note: The backend service is still stopped."
echo "You can restart it with: sudo systemctl start crm-backend.service"
REMOTE_SCRIPT

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "  SQLite Database Deleted & Recreated!"
    echo "============================================"
    echo ""
    echo "✅ Old database deleted"
    echo "✅ New database created via migrations"
    echo ""
    echo "Next step: Restart the backend service"
    echo ""
    echo "To restart the service, run:"
    echo "  ssh ${SSH_USER}@${DROPLET_IP} 'sudo systemctl start crm-backend.service'"
    echo ""
    echo "Or use the restart script:"
    echo "  ./restart-backend.sh"
else
    echo ""
    echo "❌ Error occurred while deleting database"
    exit 1
fi

