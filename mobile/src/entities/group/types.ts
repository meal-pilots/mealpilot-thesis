export type GroupType = 'solo' | 'two_adults' | 'adults_kids' | 'custom'
export type BudgetPeriodType = 'daily' | 'weekly'
export type MemberType = 'adult' | 'child' | 'teen' | 'custom'
export type GoalType =
    | 'weight_loss'
    | 'mass_gain'
    | 'maintenance'
    | 'low_carb'
    | 'healthy'
    | 'high_protein'

export type Group = {
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

export type ActiveGroup = {
    id: string
    name: string
    group_type: GroupType
}

export type GroupMember = {
    id: string
    group_id: string
    display_name: string
    member_type: MemberType
    sex: string
    age: number
    activity_level: string
    goal_type: GoalType
    priority_weight: string
    height_cm?: number | null
    weight_kg?: string | null
    daily_calorie_target?: number | null
    protein_target_g?: number | null
    fat_target_g?: number | null
    carb_target_g?: number | null
}

export type GroupMemberPayload = {
    display_name: string
    member_type: MemberType
    sex: string
    age: number
    activity_level: string
    goal_type: GoalType
    priority_weight?: string | number
    height_cm?: number | null
    weight_kg?: string | number | null
}

export type ConstraintType =
    | 'allergy'
    | 'intolerance'
    | 'religious'
    | 'dietary'
    | 'disliked'
    | 'preferred'

export type MemberConstraint = {
    id: string
    member_id: string
    constraint_type: ConstraintType
    ingredient_id?: string | null
    tag_key?: string | null
    value_text?: string | null
    severity_level: 'low' | 'medium' | 'high'
}

export type MemberConstraintPayload = {
    constraint_type: ConstraintType
    ingredient_id?: string | null
    tag_key?: string | null
    value_text?: string | null
    severity_level?: 'low' | 'medium' | 'high'
}

export type GroupPreferences = {
    id: string
    group_id: string
    spice_tolerance: 'none' | 'mild' | 'medium' | 'hot'
    max_cooking_time_minutes: number
    repeat_tolerance: number
    variety_preference: 'low' | 'medium' | 'high'
    local_cuisine_priority: string
    price_priority_weight: string
    nutrition_priority_weight: string
    taste_priority_weight: string
    speed_priority_weight: string
    preferred_cuisines: string[]
}
