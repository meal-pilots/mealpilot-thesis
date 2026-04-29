import { apiRequest } from '@shared/api/http'
import type { ActiveGroup, Group, GroupMember, GroupPreferences } from '@entities/group/types'

export async function getActiveGroup(): Promise<ActiveGroup | null> {
    return apiRequest<ActiveGroup | null>('/api/v1/groups/active')
}

export async function listGroups(): Promise<Group[]> {
    return apiRequest<Group[]>('/api/v1/groups')
}

export async function getGroup(groupId: string): Promise<Group> {
    return apiRequest<Group>(`/api/v1/groups/${groupId}`)
}

export async function listGroupMembers(groupId: string): Promise<GroupMember[]> {
    return apiRequest<GroupMember[]>(`/api/v1/groups/${groupId}/members`)
}

export async function getGroupPreferences(groupId: string): Promise<GroupPreferences | null> {
    return apiRequest<GroupPreferences | null>(`/api/v1/groups/${groupId}/preferences`)
}

export async function activateGroup(groupId: string): Promise<{ active_group_id: string }> {
    return apiRequest<{ active_group_id: string }>(`/api/v1/groups/${groupId}/activate`, {
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
    return apiRequest<Group>('/api/v1/groups', {
        method: 'POST',
        body: input,
    })
}
