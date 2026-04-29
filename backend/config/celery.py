from __future__ import annotations

import os

from celery import Celery
from celery.signals import setup_logging

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.task_routes = {
    'apps.planning.tasks.*': {'queue': 'planning'},
    'apps.common.push_tasks.*': {'queue': 'push'},
    'apps.devices.tasks.*': {'queue': 'push'},
}


@setup_logging.connect
def configure_celery_logging(**_kwargs):
    """Defer logging configuration to Django LOGGING dict."""
    import logging.config

    from django.conf import settings as django_settings

    logging.config.dictConfig(django_settings.LOGGING)
