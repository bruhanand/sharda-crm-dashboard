#!/bin/bash
# Restart CRM Backend service

echo "🔄 Restarting CRM Backend..."

# Check if systemd service exists
if systemctl list-units --type=service 2>/dev/null | grep -q "crm-backend"; then
    echo "⚙️  Using systemd service..."
    sudo systemctl restart crm-backend
    echo "✅ Backend service restarted"
    sudo systemctl status crm-backend
    
elif systemctl list-units --type=service 2>/dev/null | grep -q "gunicorn"; then
    echo "⚙️  Using Gunicorn systemd service..."
    sudo systemctl restart gunicorn
    echo "✅ Gunicorn service restarted"
    sudo systemctl status gunicorn
    
else
    # Manual restart - find and kill existing process
    echo "🔄 Restarting Gunicorn manually..."
    
    # Find and kill existing Gunicorn process
    echo "Stopping existing Gunicorn process..."
    pkill -f "gunicorn.*sdpl_backend.wsgi" || echo "No existing process found"
    sleep 2
    
    # Navigate to backend directory
    if [ -d "backend" ]; then
        cd backend
        
        # Activate virtual environment if it exists
        if [ -d "venv" ]; then
            source venv/bin/activate
        fi
        
        # Start Gunicorn
        echo "Starting Gunicorn..."
        if [ -f "gunicorn.conf.py" ]; then
            nohup gunicorn --config gunicorn.conf.py sdpl_backend.wsgi:application > /tmp/gunicorn.log 2>&1 &
        else
            nohup gunicorn sdpl_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 > /tmp/gunicorn.log 2>&1 &
        fi
        
        echo "✅ Gunicorn started (PID: $!)"
        echo "📋 Logs: tail -f /tmp/gunicorn.log"
        cd ..
    else
        echo "❌ Backend directory not found. Please run from project root."
        exit 1
    fi
fi

echo ""
echo "✅ Backend restart complete!"
echo ""
echo "📊 Check status:"
ps aux | grep -E "gunicorn.*sdpl_backend" | grep -v grep || echo "No Gunicorn process found"
