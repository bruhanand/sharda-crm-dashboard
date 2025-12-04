"""
Django caching configuration for Redis.
Add to requirements.txt: django-redis>=5.4.0
"""

# settings.py - Add caching configuration

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'PARSER_CLASS': 'redis.connection.HiredisParser',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
        },
        'KEY_PREFIX': 'crm',
        'TIMEOUT': 300,  # 5 minutes default
    }
}

# Cache middleware (optional - for view caching)
MIDDLEWARE = [
    'django.middleware.cache.UpdateCacheMiddleware',  # First
    # ... other middleware
    'django.middleware.cache.FetchFromCacheMiddleware',  # Last
]

CACHE_MIDDLEWARE_SECONDS = 300  # 5 minutes
