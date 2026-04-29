import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Device',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('expo_push_token', models.CharField(max_length=255, unique=True)),
                ('platform', models.CharField(choices=[('ios', 'iOS'), ('android', 'Android'), ('web', 'Web')], max_length=16)),
                ('app_version', models.CharField(blank=True, default='', max_length=32)),
                ('os_version', models.CharField(blank=True, default='', max_length=32)),
                ('device_name', models.CharField(blank=True, default='', max_length=128)),
                ('locale', models.CharField(blank=True, default='', max_length=16)),
                ('timezone', models.CharField(blank=True, default='', max_length=64)),
                ('last_seen_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('push_enabled', models.BooleanField(default=True)),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='devices',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'ordering': ['-last_seen_at'],
                'indexes': [
                    models.Index(fields=['user', 'is_active'], name='devices_user_act_idx'),
                    models.Index(fields=['platform', 'is_active'], name='devices_plat_act_idx'),
                ],
            },
        ),
    ]
