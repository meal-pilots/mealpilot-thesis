from django.contrib import admin

from .models import Group, GroupMember, GroupPreference, MemberConstraint


class GroupMemberInline(admin.TabularInline):
    model = GroupMember
    extra = 0


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner_user', 'group_type', 'budget_amount', 'budget_period_type', 'is_active')
    list_filter = ('group_type', 'budget_period_type', 'is_active')
    search_fields = ('name', 'owner_user__email')
    inlines = [GroupMemberInline]


@admin.register(GroupMember)
class GroupMemberAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'group', 'member_type', 'goal_type', 'priority_weight')
    list_filter = ('member_type', 'goal_type')
    search_fields = ('display_name', 'group__name')


@admin.register(MemberConstraint)
class MemberConstraintAdmin(admin.ModelAdmin):
    list_display = ('member', 'constraint_type', 'value_text', 'severity_level')
    list_filter = ('constraint_type', 'severity_level')


@admin.register(GroupPreference)
class GroupPreferenceAdmin(admin.ModelAdmin):
    list_display = ('group', 'spice_tolerance', 'max_cooking_time_minutes', 'variety_preference')
