from django.urls import path

from .account_views import AccountDataExportAPIView, AccountDeleteAPIView
from .views import LoginAPIView, MeAPIView, ProfileAPIView, RefreshAPIView, SignUpAPIView

urlpatterns = [
    path('sign-up', SignUpAPIView.as_view(), name='sign-up'),
    path('log-in', LoginAPIView.as_view(), name='log-in'),
    path('refresh', RefreshAPIView.as_view(), name='refresh'),
    path('me', MeAPIView.as_view(), name='me'),
    path('profile', ProfileAPIView.as_view(), name='profile'),
    path('account/delete', AccountDeleteAPIView.as_view(), name='account-delete'),
    path('account/export', AccountDataExportAPIView.as_view(), name='account-export'),
]
