from django.urls import path

from .health import LivenessAPIView, ReadinessAPIView

urlpatterns = [
    path('health/live', LivenessAPIView.as_view(), name='health-live'),
    path('health/ready', ReadinessAPIView.as_view(), name='health-ready'),
]
