#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/your-org/your-repo.git"  # replace with real repo
APP_DIR="/var/www/crm-sharda"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
NGINX_SITE="/etc/nginx/sites-available/crm-sharda"

echo "[1/6] Update apt and install base packages..."
sudo apt-get update -y
sudo apt-get install -y python3 python3-venv python3-pip nginx git curl

echo "[2/6] Clone or pull repository..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  sudo git pull
else
  sudo mkdir -p "$APP_DIR"
  cd "$(dirname "$APP_DIR")"
  sudo git clone "$REPO_URL" "$(basename "$APP_DIR")"
  cd "$APP_DIR"
fi

echo "[3/6] Backend setup (venv + deps + migrations + collectstatic)..."
cd "$BACKEND_DIR"
sudo python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Environment variables should be provided via systemd or shell before running.
python manage.py migrate --noinput
python manage.py collectstatic --noinput || true

echo "[4/6] Frontend build..."
cd "$FRONTEND_DIR"
sudo npm install
sudo npm run build

echo "[5/6] Install nginx site..."
sudo cp "$APP_DIR/deployment_config/nginx.conf" "$NGINX_SITE"
sudo ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/crm-sharda
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "[6/6] Launch Gunicorn (one-shot). For production, create a systemd unit."
cd "$BACKEND_DIR"
source venv/bin/activate
gunicorn -c "$APP_DIR/deployment_config/gunicorn_config.py" sdpl_backend.wsgi:application

echo "Deployment steps completed. For persistent services, add systemd units for gunicorn."


