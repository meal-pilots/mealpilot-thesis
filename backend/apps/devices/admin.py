from django.contrib import admin

from .models import Device


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('user', 'platform', 'app_version', 'is_active', 'last_seen_at')
    list_filter = ('platform', 'is_active', 'push_enabled')
    search_fields = ('user__email', 'expo_push_token', 'device_name')
    readonly_fields = ('id', 'created_at', 'updated_at', 'last_seen_at', 'expo_push_token')
