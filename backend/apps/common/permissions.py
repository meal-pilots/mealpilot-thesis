from rest_framework.permissions import BasePermission


class IsOwnerOfGroup(BasePermission):
    def has_object_permission(self, request, view, obj):
        owner_id = getattr(obj, 'owner_user_id', None)
        return owner_id == request.user.id
