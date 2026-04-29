from rest_framework import permissions, status
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from apps.common.response import ok
from .models import Notification
from .notification_serializers import NotificationSerializer


class NotificationListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user).order_by('is_read', '-created_at')
        return ok(NotificationSerializer(notifications, many=True).data)


class NotificationReadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, notification_id):
        notification = get_object_or_404(Notification, id=notification_id, user=request.user)
        notification.is_read = True
        notification.save(update_fields=['is_read', 'updated_at'])
        return ok(NotificationSerializer(notification).data)


class NotificationReadAllAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return ok(status_code=status.HTTP_204_NO_CONTENT)