import type { User } from '../../../entities/user/model/types'
import { apiRequest } from '../../../shared/api/http'

export interface ProfileSettings {
    preferred_language: string
    notifications_enabled: boolean
    measurement_system: 'metric' | 'imperial'
    currency_code: string
}

export interface ActiveGroupSummary {
    id: string
    name: string
    group_type: string
}

export interface GroupDetails {
    id: string
    name: string
    group_type: string
    budget_amount: string
    budget_period_type: string
    currency_code: string
    planning_days_default: number
    meals_per_day_default: number
    region_code: string
    is_active: boolean
}

export interface GroupMemberSummary {
    id: string
    display_name: string
    member_type: string
    goal_type: string
    age: number
}

export interface GroupPreferenceSummary {
    spice_tolerance: string
    max_cooking_time_minutes: number
    repeat_tolerance: number
    variety_preference: string
    preferred_cuisines: string[]
}

export interface ProfileSnapshot {
    profile: User
    settings: ProfileSettings
    activeGroup: ActiveGroupSummary | null
    group: GroupDetails | null
    members: GroupMemberSummary[]
    preferences: GroupPreferenceSummary | null
}

export const profileApi = {
    getProfile() {
        return apiRequest<User>('/profile')
    },

    updateProfile(input: Partial<Pick<User, 'full_name' | 'preferred_language' | 'avatar_url'>>) {
        return apiRequest<User>('/profile', {
            method: 'PATCH',
            body: input,
        })
    },

    getSettings() {
        return apiRequest<ProfileSettings>('/settings')
    },

    updateSettings(input: Partial<ProfileSettings>) {
        return apiRequest<ProfileSettings>('/settings', {
            method: 'PATCH',
            body: input,
        })
    },

    getActiveGroup() {
        return apiRequest<ActiveGroupSummary | null>('/groups/active')
    },

    getGroup(groupId: string) {
        return apiRequest<GroupDetails>(`/groups/${groupId}`)
    },

    getGroupMembers(groupId: string) {
        return apiRequest<GroupMemberSummary[]>(`/groups/${groupId}/members`)
    },

    getGroupPreferences(groupId: string) {
        return apiRequest<GroupPreferenceSummary | null>(`/groups/${groupId}/preferences`)
    },

    async getSnapshot(): Promise<ProfileSnapshot> {
        const [profile, settings, activeGroup] = await Promise.all([
            this.getProfile(),
            this.getSettings(),
            this.getActiveGroup(),
        ])

        if (!activeGroup) {
            return {
                profile,
                settings,
                activeGroup: null,
                group: null,
                members: [],
                preferences: null,
            }
        }

        const [group, members, preferences] = await Promise.all([
            this.getGroup(activeGroup.id),
            this.getGroupMembers(activeGroup.id),
            this.getGroupPreferences(activeGroup.id),
        ])

        return {
            profile,
            settings,
            activeGroup,
            group,
            members,
            preferences,
        }
    },
}