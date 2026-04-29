from django.urls import path
from .dashboard_views import GroupDashboardAPIView
from .views import (
    ActiveGroupAPIView,
    GroupActivateAPIView,
    GroupListCreateAPIView,
    GroupMemberListCreateAPIView,
    GroupPreferenceRetrieveUpdateAPIView,
    GroupRetrieveUpdateAPIView,
    GroupSetupSummaryAPIView,
    MemberConstraintListCreateAPIView,
    MemberConstraintUpdateDestroyAPIView,
    MemberRetrieveUpdateDestroyAPIView,
)

urlpatterns = [
    path('groups', GroupListCreateAPIView.as_view(), name='group-list-create'),
    path('groups/active', ActiveGroupAPIView.as_view(), name='active-group'),
    path('groups/<uuid:group_id>', GroupRetrieveUpdateAPIView.as_view(), name='group-retrieve-update'),
    path('groups/<uuid:group_id>/activate', GroupActivateAPIView.as_view(), name='group-activate'),
    path('groups/<uuid:group_id>/members', GroupMemberListCreateAPIView.as_view(), name='group-members'),
    path('groups/<uuid:group_id>/preferences', GroupPreferenceRetrieveUpdateAPIView.as_view(), name='group-preferences'),
    path('groups/<uuid:group_id>/setup-summary', GroupSetupSummaryAPIView.as_view(), name='group-setup-summary'),
    path('members/<uuid:member_id>', MemberRetrieveUpdateDestroyAPIView.as_view(), name='member-rud'),
    path('members/<uuid:member_id>/constraints', MemberConstraintListCreateAPIView.as_view(), name='member-constraints'),
    path('constraints/<uuid:constraint_id>', MemberConstraintUpdateDestroyAPIView.as_view(), name='constraint-rud'),
    path('groups/<uuid:group_id>/dashboard', GroupDashboardAPIView.as_view(), name='group-dashboard'),
]
