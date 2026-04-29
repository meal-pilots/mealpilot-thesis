from .base import *  # noqa: F401,F403

DEBUG = True

ALLOWED_HOSTS = ['*']

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
]
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^exp://.*$',
    r'^http://192\.168\.\d+\.\d+(:\d+)?$',
    r'^http://10\.\d+\.\d+\.\d+(:\d+)?$',
]
CORS_ALLOW_CREDENTIALS = True

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}
