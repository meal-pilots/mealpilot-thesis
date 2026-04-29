from django.db.models import Prefetch
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied

from apps.common.response import ok
from .models import Group, GroupMember, GroupPreference, MemberConstraint
from .selectors import get_group_setup_summary
from .serializers import (
    GroupCreateSerializer,
    GroupMemberSerializer,
    GroupPreferenceSerializer,
    GroupSerializer,
    MemberConstraintSerializer,
    SetupSummarySerializer,
)


class OwnedGroupMixin:
    def get_group(self):
        group = Group.objects.filter(owner_user=self.request.user).get(pk=self.kwargs['group_id'])
        return group

    def ensure_member_owned(self, member: GroupMember):
        if member.group.owner_user_id != self.request.user.id:
            raise PermissionDenied('You do not have access to this member.')


class GroupListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(owner_user=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return GroupCreateSerializer
        return GroupSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return ok(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group = serializer.save()
        return ok(GroupSerializer(group).data, status_code=status.HTTP_201_CREATED)


class GroupRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = GroupSerializer
    lookup_url_kwarg = 'group_id'

    def get_queryset(self):
        return Group.objects.filter(owner_user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        return ok(response.data)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        return ok(response.data)
    


class GroupActivateAPIView(OwnedGroupMixin, generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        Group.objects.filter(owner_user=request.user, is_active=True).update(is_active=False)
        group = self.get_group()
        group.is_active = True
        group.save(update_fields=['is_active', 'updated_at'])
        return ok({'active_group_id': str(group.id)})


class ActiveGroupAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        group = Group.objects.filter(owner_user=request.user, is_active=True).first()
        if group is None:
            return ok(None)
        return ok({'id': str(group.id), 'name': group.name, 'group_type': group.group_type})


class GroupMemberListCreateAPIView(OwnedGroupMixin, generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = GroupMemberSerializer

    def get_queryset(self):
        return self.get_group().members.all().order_by('created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['group'] = self.get_group()
        return context

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return ok(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = serializer.save()
        return ok(GroupMemberSerializer(member).data, status_code=status.HTTP_201_CREATED)


class MemberRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = GroupMemberSerializer
    lookup_url_kwarg = 'member_id'

    def get_queryset(self):
        return GroupMember.objects.select_related('group').filter(group__owner_user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        return ok(response.data)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        return ok(response.data)

    def destroy(self, request, *args, **kwargs):
        super().destroy(request, *args, **kwargs)
        return ok(status_code=status.HTTP_204_NO_CONTENT)


class MemberConstraintListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MemberConstraintSerializer

    def get_member(self):
        return GroupMember.objects.select_related('group').get(pk=self.kwargs['member_id'], group__owner_user=self.request.user)

    def get_queryset(self):
        return self.get_member().constraints.all().order_by('created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['member'] = self.get_member()
        return context

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return ok(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        constraint = serializer.save()
        return ok(MemberConstraintSerializer(constraint).data, status_code=status.HTTP_201_CREATED)


class MemberConstraintUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MemberConstraintSerializer
    lookup_url_kwarg = 'constraint_id'

    def get_queryset(self):
        return MemberConstraint.objects.select_related('member__group').filter(member__group__owner_user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        return ok(response.data)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        return ok(response.data)

    def destroy(self, request, *args, **kwargs):
        super().destroy(request, *args, **kwargs)
        return ok(status_code=status.HTTP_204_NO_CONTENT)


class GroupPreferenceRetrieveUpdateAPIView(OwnedGroupMixin, generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = GroupPreferenceSerializer

    def get_object(self):
        return GroupPreference.objects.filter(group=self.get_group()).first()

    def get(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance is None:
            return ok(None)
        return ok(self.get_serializer(instance).data)

    def put(self, request, *args, **kwargs):
        group = self.get_group()
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, context={'group': group})
        serializer.is_valid(raise_exception=True)
        if instance is None:
            preferences = serializer.save()
            return ok(GroupPreferenceSerializer(preferences).data, status_code=status.HTTP_201_CREATED)
        preferences = serializer.save()
        return ok(GroupPreferenceSerializer(preferences).data)


class GroupSetupSummaryAPIView(OwnedGroupMixin, generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SetupSummarySerializer

    def get(self, request, *args, **kwargs):
        group = (
            Group.objects.filter(owner_user=request.user)
            .prefetch_related(
                Prefetch('members', queryset=GroupMember.objects.prefetch_related('constraints'))
            )
            .get(pk=self.kwargs['group_id'])
        )
        summary = get_group_setup_summary(group)
        serializer = self.get_serializer(summary)
        return ok(serializer.data)
