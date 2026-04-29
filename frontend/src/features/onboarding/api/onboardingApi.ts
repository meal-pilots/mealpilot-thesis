import { apiRequest } from '../../../shared/api/http'

export type GroupType = 'solo' | 'two_adults' | 'adults_kids' | 'custom'
export type BudgetPeriodType = 'daily' | 'weekly'
export type MemberType = 'adult' | 'child'
export type GoalType =
    | 'weight_loss'
    | 'mass_gain'
    | 'maintenance'
    | 'low_carb'
    | 'healthy'
    | 'high_protein'
export type ConstraintType =
    | 'allergy'
    | 'intolerance'
    | 'religious'
    | 'dietary'
    | 'disliked'
    | 'preferred'
export type SeverityLevel = 'low' | 'medium' | 'high'
export type SpiceTolerance = 'none' | 'mild' | 'medium' | 'hot'
export type VarietyPreference = 'low' | 'medium' | 'high'

export interface ActiveGroupSummary {
    id: string
    name: string
    group_type: GroupType
}

export interface GroupDto {
    id: string
    owner_user_id: string
    name: string
    group_type: GroupType
    planning_days_default: number
    meals_per_day_default: number
    currency_code: string
    region_code: string
    budget_period_type: BudgetPeriodType
    budget_amount: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface CreateGroupInput {
    name: string
    group_type: GroupType
    planning_days_default: number
    meals_per_day_default: number
    currency_code: string
    region_code: string
    budget_period_type: BudgetPeriodType
    budget_amount: number
}

export type UpdateGroupInput = Partial<CreateGroupInput>

export interface GroupMemberDto {
    id: string
    group_id: string
    display_name: string
    member_type: MemberType
    sex: string
    age: number
    activity_level: string
    goal_type: GoalType
    priority_weight: string
    height_cm: number | null
    weight_kg: string | null
    daily_calorie_target: number | null
    protein_target_g: number | null
    fat_target_g: number | null
    carb_target_g: number | null
    created_at: string
    updated_at: string
}

export interface MemberPayload {
    display_name: string
    member_type: MemberType
    sex: string
    age: number
    activity_level: string
    goal_type: GoalType
    priority_weight?: number
    height_cm?: number | null
    weight_kg?: number | null
}

export interface MemberConstraintDto {
    id: string
    member_id: string
    constraint_type: ConstraintType
    ingredient_id: string | null
    tag_key: string | null
    value_text: string | null
    severity_level: SeverityLevel
    created_at: string
    updated_at: string
}

export interface MemberConstraintPayload {
    constraint_type: ConstraintType
    ingredient_id?: string | null
    tag_key?: string | null
    value_text?: string | null
    severity_level?: SeverityLevel
}

export interface GroupPreferenceDto {
    id: string
    group_id: string
    spice_tolerance: SpiceTolerance
    max_cooking_time_minutes: number
    repeat_tolerance: number
    variety_preference: VarietyPreference
    local_cuisine_priority: string
    price_priority_weight: string
    nutrition_priority_weight: string
    taste_priority_weight: string
    speed_priority_weight: string
    preferred_cuisines: string[]
    created_at: string
    updated_at: string
}

export interface GroupPreferencePayload {
    spice_tolerance: SpiceTolerance
    max_cooking_time_minutes: number
    repeat_tolerance: number
    variety_preference: VarietyPreference
    local_cuisine_priority: number
    price_priority_weight: number
    nutrition_priority_weight: number
    taste_priority_weight: number
    speed_priority_weight: number
    preferred_cuisines: string[]
}

export interface SetupSummaryDto {
    group: GroupDto
    members: GroupMemberDto[]
    constraints_by_member: Record<string, MemberConstraintDto[]>
    preferences: GroupPreferenceDto | null
    readiness_score: number
}

export const onboardingApi = {
    getActiveGroup() {
        return apiRequest<ActiveGroupSummary | null>('/groups/active')
    },

    getGroup(groupId: string) {
        return apiRequest<GroupDto>(`/groups/${groupId}`)
    },

    createGroup(input: CreateGroupInput) {
        return apiRequest<GroupDto>('/groups', {
            method: 'POST',
            body: input as unknown as Record<string, unknown>,
        })
    },

    updateGroup(groupId: string, input: UpdateGroupInput) {
        return apiRequest<GroupDto>(`/groups/${groupId}`, {
            method: 'PATCH',
            body: input as unknown as Record<string, unknown>,
        })
    },

    activateGroup(groupId: string) {
        return apiRequest<{ active_group_id: string }>(`/groups/${groupId}/activate`, {
            method: 'POST',
        })
    },

    getSetupSummary(groupId: string) {
        return apiRequest<SetupSummaryDto>(`/groups/${groupId}/setup-summary`)
    },

    listMembers(groupId: string) {
        return apiRequest<GroupMemberDto[]>(`/groups/${groupId}/members`)
    },

    createMember(groupId: string, input: MemberPayload) {
        return apiRequest<GroupMemberDto>(`/groups/${groupId}/members`, {
            method: 'POST',
            body: input as unknown as Record<string, unknown>,
        })
    },

    updateMember(memberId: string, input: Partial<MemberPayload>) {
        return apiRequest<GroupMemberDto>(`/members/${memberId}`, {
            method: 'PATCH',
            body: input as unknown as Record<string, unknown>,
        })
    },

    deleteMember(memberId: string) {
        return apiRequest<null>(`/members/${memberId}`, {
            method: 'DELETE',
        })
    },

    getPreferences(groupId: string) {
        return apiRequest<GroupPreferenceDto | null>(`/groups/${groupId}/preferences`)
    },

    putPreferences(groupId: string, input: GroupPreferencePayload) {
        return apiRequest<GroupPreferenceDto>(`/groups/${groupId}/preferences`, {
            method: 'PUT',
            body: input as unknown as Record<string, unknown>,
        })
    },

    listConstraints(memberId: string) {
        return apiRequest<MemberConstraintDto[]>(`/members/${memberId}/constraints`)
    },

    createConstraint(memberId: string, input: MemberConstraintPayload) {
        return apiRequest<MemberConstraintDto>(`/members/${memberId}/constraints`, {
            method: 'POST',
            body: input as unknown as Record<string, unknown>,
        })
    },

    updateConstraint(constraintId: string, input: Partial<MemberConstraintPayload>) {
        return apiRequest<MemberConstraintDto>(`/constraints/${constraintId}`, {
            method: 'PATCH',
            body: input as unknown as Record<string, unknown>,
        })
    },

    deleteConstraint(constraintId: string) {
        return apiRequest<null>(`/constraints/${constraintId}`, {
            method: 'DELETE',
        })
    },
}
