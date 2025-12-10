#!/bin/bash

# ============================================
# Deploy Sharda CRM to Digital Ocean
# ============================================
# This script automates deployment to Digital Ocean droplet
# Without Docker - Direct Python/Node.js deployment
# ============================================

set -e

echo "============================================"
echo "  Sharda CRM - Digital Ocean Deployment"
echo "============================================"
echo ""
echo "🔒 SECURITY: Using environment variables for credentials"
echo "   Load credentials before running: source .env.deploy"
echo "   Or set DEPLOY_DROPLET_IP, DEPLOY_SSH_USER, DEPLOY_SSH_PASS"
echo ""

# Configuration - Read from environment variables (NO hardcoded defaults)
# To use: source .env.deploy before running this script
DEFAULT_DROPLET_IP="${DEPLOY_DROPLET_IP:-}"
DEFAULT_SSH_USER="${DEPLOY_SSH_USER:-root}"
DEFAULT_SSH_PASS="${DEPLOY_SSH_PASS:-}"

# Prompt for credentials if not in environment
if [ -z "$DROPLET_IP" ]; then
    if [ -n "$DEFAULT_DROPLET_IP" ]; then
        read -p "Enter your Digital Ocean droplet IP address (from env): " DROPLET_IP
        DROPLET_IP=${DROPLET_IP:-$DEFAULT_DROPLET_IP}
    else
        read -p "Enter your Digital Ocean droplet IP address: " DROPLET_IP
    fi
fi

if [ -z "$SSH_USER" ]; then
    read -p "Enter your SSH username (default: $DEFAULT_SSH_USER): " SSH_USER
    SSH_USER=${SSH_USER:-$DEFAULT_SSH_USER}
fi

if [ -z "$DROPLET_IP" ]; then
    echo "❌ IP address is required!"
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
    
    # Verify password was entered
    if [ -z "$SSH_PASS" ]; then
        echo "❌ Password cannot be empty!"
        exit 1
    fi
    
    # Check if sshpass is installed
    if ! command -v sshpass &> /dev/null; then
        echo "Installing sshpass for password authentication..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                brew install hudochenkov/sshpass/sshpass
            else
                echo "❌ sshpass not found. Please install it:"
                echo "   brew install hudochenkov/sshpass/sshpass"
                echo "   Or download from: https://github.com/hudochenkov/homebrew-sshpass"
                exit 1
            fi
        else
            # Linux
            if command -v apt-get &> /dev/null; then
                sudo apt-get update -qq && sudo apt-get install -y sshpass
            elif command -v yum &> /dev/null; then
                sudo yum install -y sshpass
            else
                echo "❌ Please install sshpass manually"
                exit 1
            fi
        fi
    fi
    # Use SSHPASS environment variable (more reliable with special characters)
    export SSHPASS="$SSH_PASS"
    export SSH_USER_SAFE="$SSH_USER"
    export DROPLET_IP_SAFE="$DROPLET_IP"
    
    # Function to run SSH commands with password
    ssh_with_pass() {
        sshpass -e ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$@"
    }
    
    # For heredoc usage, use SSHPASS environment variable
    SSH_CMD="sshpass -e ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10"
    SCP_CMD="sshpass -e scp -o StrictHostKeyChecking=no"
    RSYNC_SSH="sshpass -e ssh -o StrictHostKeyChecking=no"
else
    SSH_CMD="ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10"
    SCP_CMD="scp -o StrictHostKeyChecking=no"
    RSYNC_SSH="ssh -o StrictHostKeyChecking=no"
fi

echo ""
echo "Target: $SSH_USER@$DROPLET_IP"
echo ""

# Test SSH connection
echo "[1/8] Testing SSH connection..."
if [[ "$USE_PASSWORD" =~ ^[Yy]$ ]]; then
    # Test with password - use sshpass directly
    echo "  Testing connection with password authentication..."
    CONNECTION_TEST=$(sshpass -e ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=no $SSH_USER@$DROPLET_IP 'echo Connected' 2>&1)
    if echo "$CONNECTION_TEST" | grep -q "Connected"; then
        echo "  ✓ SSH connection successful"
    else
        echo "  ✗ Cannot connect to droplet"
        echo ""
        echo "  Error details:"
        echo "$CONNECTION_TEST" | head -5
        echo ""
        echo "  Troubleshooting steps:"
        echo "  1. Verify droplet is running in Digital Ocean dashboard"
        echo "  2. Test manual connection:"
        echo "     ssh $SSH_USER@$DROPLET_IP"
        echo "  3. Check if password is correct"
        echo "  4. Verify firewall allows SSH (port 22)"
        echo "  5. Check if droplet IP is correct: $DROPLET_IP"
        echo ""
        echo "  Would you like to test manual connection now? (y/n)"
        read -t 5 MANUAL_TEST || MANUAL_TEST="n"
        if [[ "$MANUAL_TEST" =~ ^[Yy]$ ]]; then
            echo "  Attempting manual connection (enter password when prompted)..."
            ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $SSH_USER@$DROPLET_IP 'echo "Manual connection successful!"' || echo "  Manual connection also failed"
        fi
        exit 1
    fi
else
    # Test with SSH key
    if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $SSH_USER@$DROPLET_IP 'echo Connected' > /dev/null 2>&1; then
        echo "  ✓ SSH connection successful"
    else
        echo "  ✗ Cannot connect to droplet"
        echo "  Check: 1) Droplet is running, 2) Firewall allows SSH, 3) SSH key is configured"
        exit 1
    fi
fi

# Install system dependencies
echo ""
echo "[2/8] Installing system dependencies..."
eval "$SSH_CMD $SSH_USER@$DROPLET_IP" << 'ENDSSH'
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y python3 python3-pip python3-venv nodejs npm nginx postgresql-client git curl ufw
    npm install -g pm2
    echo "  ✓ System dependencies installed"
ENDSSH

# Setup firewall
echo ""
echo "[3/8] Configuring firewall..."
eval "$SSH_CMD $SSH_USER@$DROPLET_IP" << ENDSSH
    ufw --force enable
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    ufw allow 8000/tcp  # Backend (temporary, will use Nginx)
    echo "  ✓ Firewall configured"
ENDSSH

# Create application directory
echo ""
echo "[4/8] Setting up application directory..."
eval "$SSH_CMD $SSH_USER@$DROPLET_IP" << 'ENDSSH'
    mkdir -p /var/www/crm-app/{backend,frontend,logs}
    chown -R $USER:$USER /var/www/crm-app
    echo "  ✓ Application directory created"
ENDSSH

# Transfer files
echo ""
echo "[5/8] Transferring application files..."
echo "  This may take a few minutes..."

# Create a temporary directory for transfer
TEMP_DIR=$(mktemp -d)
cp -r backend/* "$TEMP_DIR/backend/" 2>/dev/null || true
cp -r frontend/* "$TEMP_DIR/frontend/" 2>/dev/null || true

# Transfer backend
if [[ "$USE_PASSWORD" =~ ^[Yy]$ ]]; then
    rsync -avz -e "$RSYNC_SSH" --exclude 'venv' --exclude '__pycache__' --exclude '*.pyc' \
        backend/ $SSH_USER@$DROPLET_IP:/var/www/crm-app/backend/
else
    rsync -avz --exclude 'venv' --exclude '__pycache__' --exclude '*.pyc' \
        backend/ $SSH_USER@$DROPLET_IP:/var/www/crm-app/backend/
fi

# Transfer frontend
if [[ "$USE_PASSWORD" =~ ^[Yy]$ ]]; then
    rsync -avz -e "$RSYNC_SSH" --exclude 'node_modules' --exclude 'dist' \
        frontend/ $SSH_USER@$DROPLET_IP:/var/www/crm-app/frontend/
else
    rsync -avz --exclude 'node_modules' --exclude 'dist' \
        frontend/ $SSH_USER@$DROPLET_IP:/var/www/crm-app/frontend/
fi

echo "  ✓ Files transferred"

# Setup backend
echo ""
echo "[6/8] Setting up backend..."
eval "$SSH_CMD $SSH_USER@$DROPLET_IP" << ENDSSH
    cd /var/www/crm-app/backend
    
    # Create virtual environment
    python3 -m venv venv
    source venv/bin/activate
    
    # Install dependencies
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # Generate secret key
    SECRET_KEY=\$(python manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" 2>/dev/null || echo "change-me-\$(date +%s)")
    
    # Create .env file
    cat > .env << EOF
SECRET_KEY=\$SECRET_KEY
DEBUG=False
ALLOWED_HOSTS=$DROPLET_IP,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://$DROPLET_IP,http://$DROPLET_IP:80
CSRF_TRUSTED_ORIGINS=http://$DROPLET_IP,http://$DROPLET_IP:80
DATABASE_URL=sqlite:///db.sqlite3
EOF
    
    # Run migrations
    python manage.py migrate --noinput
    
    # Collect static files
    python manage.py collectstatic --noinput
    
    echo "  ✓ Backend setup complete"
ENDSSH

# Setup frontend
echo ""
echo "[7/8] Setting up frontend..."
eval "$SSH_CMD $SSH_USER@$DROPLET_IP" << ENDSSH
    cd /var/www/crm-app/frontend
    
    # Create .env file
    cat > .env << EOF
VITE_API_BASE_URL=http://$DROPLET_IP/api/v1
EOF
    
    # Install dependencies
    npm install --legacy-peer-deps --silent
    
    # Build for production
    npm run build
    
    # Copy to nginx directory
    mkdir -p /var/www/html
    cp -r dist/* /var/www/html/
    
    echo "  ✓ Frontend setup complete"
ENDSSH

# Setup Nginx
echo ""
echo "[8/8] Configuring Nginx..."
eval "$SSH_CMD $SSH_USER@$DROPLET_IP" << ENDSSH
    cat > /etc/nginx/sites-available/crm << 'EOF'
server {
    listen 80;
    server_name $DROPLET_IP;
    
    # Increase upload size limit (100MB)
    client_max_body_size 100M;
    
    # Frontend
    location / {
        root /var/www/html;
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        # Additional settings for large uploads
        client_max_body_size 100M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }
    
    # Admin panel
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        # Additional settings for large uploads
        client_max_body_size 100M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }
    
    # Static files
    location /static/ {
        alias /var/www/crm-app/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files (if needed)
    location /media/ {
        alias /var/www/crm-app/backend/media/;
        expires 30d;
        add_header Cache-Control "public";
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and restart nginx
    nginx -t && systemctl restart nginx
    
    echo "  ✓ Nginx configured"
ENDSSH

# Create systemd service for backend
echo ""
echo "[9/8] Creating systemd service for backend..."
eval "$SSH_CMD $SSH_USER@$DROPLET_IP" << 'ENDSSH'
    cat > /etc/systemd/system/crm-backend.service << 'EOF'
[Unit]
Description=Sharda CRM Backend (Gunicorn)
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/var/www/crm-app/backend
Environment="PATH=/var/www/crm-app/backend/venv/bin"
ExecStart=/var/www/crm-app/backend/venv/bin/gunicorn \
    --workers 3 \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/www/crm-app/logs/backend-access.log \
    --error-logfile /var/www/crm-app/logs/backend-error.log \
    sdpl_backend.wsgi:application

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable crm-backend
    systemctl start crm-backend
    
    echo "  ✓ Backend service started"
ENDSSH

# Wait for services to start
echo ""
echo "Waiting for services to start..."
sleep 5

# Verify deployment
echo ""
echo "============================================"
echo "  Verifying Deployment"
echo "============================================"

# Check backend health
HEALTH_CHECK=$(eval "$SSH_CMD $SSH_USER@$DROPLET_IP 'curl -s http://localhost:8000/api/health/ 2>&1'" || echo "failed")
if echo "$HEALTH_CHECK" | grep -q "healthy\|status"; then
    echo "  ✓ Backend health check passed"
else
    echo "  ⚠ Backend health check: $HEALTH_CHECK"
fi

# Check frontend
FRONTEND_CHECK=$(eval "$SSH_CMD $SSH_USER@$DROPLET_IP 'curl -s -o /dev/null -w '%{http_code}' http://localhost:80/'" || echo "000")
if [ "$FRONTEND_CHECK" = "200" ]; then
    echo "  ✓ Frontend is accessible"
else
    echo "  ⚠ Frontend returned HTTP $FRONTEND_CHECK"
fi

# Summary
echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "Application URLs:"
echo "  Frontend:    http://$DROPLET_IP"
echo "  API Health:  http://$DROPLET_IP/api/health/"
echo "  Admin:       http://$DROPLET_IP/admin/"
echo ""
echo "Next Steps:"
echo "  1. Open http://$DROPLET_IP in your browser"
echo "  2. Create admin user:"
if [[ "$USE_PASSWORD" =~ ^[Yy]$ ]]; then
    echo "     sshpass -p '***' ssh $SSH_USER@$DROPLET_IP"
else
    echo "     ssh $SSH_USER@$DROPLET_IP"
fi
echo "     cd /var/www/crm-app/backend"
echo "     source venv/bin/activate"
echo "     python manage.py createsuperuser"
echo ""
echo "Service Management:"
if [[ "$USE_PASSWORD" =~ ^[Yy]$ ]]; then
    echo "  Backend logs:  sshpass -p '***' ssh $SSH_USER@$DROPLET_IP 'journalctl -u crm-backend -f'"
    echo "  Restart backend: sshpass -p '***' ssh $SSH_USER@$DROPLET_IP 'systemctl restart crm-backend'"
    echo "  Nginx logs:    sshpass -p '***' ssh $SSH_USER@$DROPLET_IP 'tail -f /var/log/nginx/error.log'"
else
    echo "  Backend logs:  ssh $SSH_USER@$DROPLET_IP 'journalctl -u crm-backend -f'"
    echo "  Restart backend: ssh $SSH_USER@$DROPLET_IP 'systemctl restart crm-backend'"
    echo "  Nginx logs:    ssh $SSH_USER@$DROPLET_IP 'tail -f /var/log/nginx/error.log'"
fi
echo ""

