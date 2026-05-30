import { apiRequest } from '@shared/api/http'
import type {
    ActiveGroup,
    Group,
    GroupMember,
    GroupMemberPayload,
    GroupPreferences,
    MemberConstraint,
    MemberConstraintPayload,
} from '@entities/group/types'

export async function getActiveGroup(): Promise<ActiveGroup | null> {
    return apiRequest<ActiveGroup | null>('/groups/active')
}

export async function listGroups(): Promise<Group[]> {
    return apiRequest<Group[]>('/groups')
}

export async function getGroup(groupId: string): Promise<Group> {
    return apiRequest<Group>(`/groups/${groupId}`)
}

export async function listGroupMembers(groupId: string): Promise<GroupMember[]> {
    return apiRequest<GroupMember[]>(`/groups/${groupId}/members`)
}

export async function getGroupPreferences(groupId: string): Promise<GroupPreferences | null> {
    return apiRequest<GroupPreferences | null>(`/groups/${groupId}/preferences`)
}

export type GroupDashboard = {
    setup_completeness: number
}

export async function getGroupDashboard(groupId: string): Promise<GroupDashboard> {
    return apiRequest<GroupDashboard>(`/groups/${groupId}/dashboard`)
}

export type GroupSetupSummary = {
    group: Group
    members: GroupMember[]
    constraints_by_member: Record<string, MemberConstraint[]>
    preferences: GroupPreferences | null
    readiness_score: number
}

export async function getGroupSetupSummary(groupId: string): Promise<GroupSetupSummary> {
    return apiRequest<GroupSetupSummary>(`/groups/${groupId}/setup-summary`)
}

export async function activateGroup(groupId: string): Promise<{ active_group_id: string }> {
    return apiRequest<{ active_group_id: string }>(`/groups/${groupId}/activate`, {
        method: 'POST',
    })
}

export type CreateGroupInput = {
    name: string
    group_type: 'solo' | 'two_adults' | 'adults_kids' | 'custom'
    planning_days_default?: number
    meals_per_day_default?: number
    currency_code?: string
    region_code?: string
    budget_period_type?: 'daily' | 'weekly'
    budget_amount: string
}

export async function createGroup(input: CreateGroupInput): Promise<Group> {
    return apiRequest<Group>('/groups', {
        method: 'POST',
        body: input,
    })
}

export type UpdateGroupInput = Partial<CreateGroupInput>

export async function updateGroup(groupId: string, input: UpdateGroupInput): Promise<Group> {
    return apiRequest<Group>(`/groups/${groupId}`, {
        method: 'PATCH',
        body: input,
    })
}

export async function createGroupMember(groupId: string, input: GroupMemberPayload): Promise<GroupMember> {
    return apiRequest<GroupMember>(`/groups/${groupId}/members`, {
        method: 'POST',
        body: input,
    })
}

export async function updateGroupMember(memberId: string, input: Partial<GroupMemberPayload>): Promise<GroupMember> {
    return apiRequest<GroupMember>(`/members/${memberId}`, {
        method: 'PATCH',
        body: input,
    })
}

export async function deleteGroupMember(memberId: string): Promise<null> {
    return apiRequest<null>(`/members/${memberId}`, {
        method: 'DELETE',
    })
}

export async function listMemberConstraints(memberId: string): Promise<MemberConstraint[]> {
    return apiRequest<MemberConstraint[]>(`/members/${memberId}/constraints`)
}

export async function createMemberConstraint(
    memberId: string,
    input: MemberConstraintPayload,
): Promise<MemberConstraint> {
    return apiRequest<MemberConstraint>(`/members/${memberId}/constraints`, {
        method: 'POST',
        body: input,
    })
}

export async function updateMemberConstraint(
    constraintId: string,
    input: Partial<MemberConstraintPayload>,
): Promise<MemberConstraint> {
    return apiRequest<MemberConstraint>(`/constraints/${constraintId}`, {
        method: 'PATCH',
        body: input,
    })
}

export async function deleteMemberConstraint(constraintId: string): Promise<null> {
    return apiRequest<null>(`/constraints/${constraintId}`, {
        method: 'DELETE',
    })
}

export async function upsertGroupPreferences(
    groupId: string,
    input: Omit<GroupPreferences, 'id' | 'group_id'>,
): Promise<GroupPreferences> {
    return apiRequest<GroupPreferences>(`/groups/${groupId}/preferences`, {
        method: 'PUT',
        body: input,
    })
}
