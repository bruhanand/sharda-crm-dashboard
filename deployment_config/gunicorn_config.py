import multiprocessing
import os

# Directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bind = "0.0.0.0:8000"
chdir = os.path.join(BASE_DIR, "backend")
pythonpath = chdir

# Workers
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
threads = 2
timeout = 120
graceful_timeout = 30

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")

# Security / reliability
preload_app = True
capture_output = True
max_requests = 1000
max_requests_jitter = 50
keepalive = 5

