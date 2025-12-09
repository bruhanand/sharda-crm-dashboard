#!/bin/bash
# Restart CRM services on server (Non-Docker deployment)

echo "🔄 Restarting CRM services (Non-Docker)..."

# Check if systemd services are being used
if systemctl list-units --type=service 2>/dev/null | grep -q "crm-backend\|gunicorn"; then
    echo "⚙️  Using systemd services..."
    
    # Try common service names
    if systemctl list-units --type=service 2>/dev/null | grep -q "crm-backend"; then
        sudo systemctl restart crm-backend
        echo "✅ Backend service restarted"
    elif systemctl list-units --type=service 2>/dev/null | grep -q "gunicorn"; then
        sudo systemctl restart gunicorn
        echo "✅ Gunicorn service restarted"
    fi
    
    # Restart nginx (frontend)
    sudo systemctl restart nginx
    echo "✅ Nginx restarted"
    
    echo ""
    echo "📊 Check status:"
    systemctl status crm-backend 2>/dev/null || systemctl status gunicorn 2>/dev/null || echo "Backend service not found"
    systemctl status nginx
    
# If no systemd, restart processes manually
else
    echo "🔄 Restarting processes manually..."
    
    # Find and kill gunicorn processes
    echo "Stopping Gunicorn..."
    pkill -f "gunicorn.*sdpl_backend.wsgi" || echo "No Gunicorn process found"
    sleep 2
    
    # Restart Gunicorn (assuming standard paths)
    if [ -d "backend" ]; then
        cd backend
        if [ -d "venv" ]; then
            source venv/bin/activate
        fi
        
        echo "Starting Gunicorn..."
        nohup gunicorn --config gunicorn.conf.py sdpl_backend.wsgi:application > /tmp/gunicorn.log 2>&1 &
        echo "✅ Gunicorn started (PID: $!)"
        cd ..
    else
        echo "⚠️  Backend directory not found. Please navigate to app directory first."
    fi
    
    # Restart Nginx
    echo "Restarting Nginx..."
    sudo systemctl restart nginx || sudo service nginx restart || echo "⚠️  Could not restart Nginx"
    echo "✅ Nginx restarted"
    
    echo ""
    echo "📊 Check processes:"
    ps aux | grep -E "gunicorn|nginx" | grep -v grep
fi

echo ""
echo "✅ Restart complete!"
echo ""
echo "📋 Useful commands:"
echo "  - Check backend logs: tail -f /tmp/gunicorn.log"
echo "  - Check nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "  - Check processes: ps aux | grep gunicorn"

