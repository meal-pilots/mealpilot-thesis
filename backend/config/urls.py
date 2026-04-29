from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path(settings.ADMIN_URL_PREFIX, admin.site.urls),
    path('api/v1/', include('apps.common.urls')),
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/', include('apps.groups.urls')),
    path('api/v1/', include('apps.catalog.urls')),
    path('api/v1/', include('apps.planning.urls')),
    path('api/v1/', include('apps.feedback.urls')),
    path('api/v1/', include('apps.users.product_urls')),
    path('api/v1/', include('apps.devices.urls')),
]
