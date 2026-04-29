export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type MealPlanStatus = 'draft' | 'generated' | 'approved' | 'modified' | 'archived'
export type GenerationStatus = 'pending' | 'completed' | 'failed'

export type AdaptationType =
    | 'portion_change'
    | 'ingredient_remove'
    | 'ingredient_replace'
    | 'low_carb'
    | 'high_protein'
    | 'child_friendly'
    | 'allergen_free'
    | 'cheaper_version'

export type ExplanationType = 'budget' | 'nutrition' | 'diversity' | 'group_fit' | 'tradeoff'

export type MealItemAdaptation = {
    id: string
    meal_plan_item_id: string
    member_id: string
    member_name: string
    adaptation_type: AdaptationType
    description: string
    price_delta: string
    calorie_delta: string
    protein_delta_g: string
    fat_delta_g: string
    carb_delta_g: string
    before_snapshot_json?: Record<string, unknown>
    after_snapshot_json?: Record<string, unknown>
}

export type MealPlanItem = {
    id: string
    meal_type: MealType
    recipe_id: string
    recipe_title: string
    servings_total: string
    estimated_cost: string
    estimated_calories: string
    selection_score: string
    selection_reason_summary: string
    is_manually_replaced: boolean
    adaptations: MealItemAdaptation[]
}

export type MealPlanDay = {
    id: string
    day_index: number
    plan_date: string
    estimated_daily_cost: string
    estimated_daily_calories: string
    items: MealPlanItem[]
}

export type MealPlanSummary = {
    id: string
    group_id: string
    title: string
    start_date: string
    end_date: string
    days_count: number
    status: MealPlanStatus
    is_current: boolean
    optimizer_name: string
    optimizer_version: string
    estimated_total_cost: string
    estimated_total_calories: string
    nutrition_fit_score: string
    budget_fit_score: string
    group_fit_score: string
    diversity_score: string
    overall_score: string
    created_at: string
    updated_at: string
}

export type PlanExplanation = {
    id: string
    explanation_type: ExplanationType
    title: string
    explanation_text: string
    priority_order: number
    explanation_json?: Record<string, unknown>
}

export type MealPlanDetail = {
    summary: MealPlanSummary
    days: MealPlanDay[]
    top_explanations: PlanExplanation[]
}

export type PlanListItem = {
    id: string
    title: string
    start_date: string
    end_date: string
    status: MealPlanStatus
    overall_score: string
    estimated_total_cost: string
    is_current: boolean
    created_at: string
}

export type GenerationRunStatusResponse = {
    generation_run_id: string
    status: GenerationStatus
    execution_time_ms: number
    error_message: string
    meal_plan_id: string | null
}

export type GeneratePlanRequest = {
    optimizer?: 'cp_sat' | 'deterministic'
    start_date: string
    days_count: number
    meals_per_day: number
    include_snacks?: boolean
    budget_strictness?: 'strict' | 'medium' | 'flexible'
    cooking_time_strictness?: 'strict' | 'medium' | 'flexible'
    variety_level?: 'low' | 'medium' | 'high'
    repetition_allowed?: number
    optimization_focus: Array<'budget' | 'nutrition' | 'speed' | 'taste'>
}

export type GeneratePlanAsyncResponse = {
    mode: 'async'
    generation_run_id: string
    status: GenerationStatus
    poll_url: string
}

export type GeneratePlanSyncResponse = {
    mode: 'sync'
    meal_plan_id: string
    summary: MealPlanSummary
    top_explanations: PlanExplanation[]
}

export type ShoppingListItem = {
    id: string
    ingredient_id: string | null
    ingredient_name: string
    total_quantity: string
    unit: string
    estimated_price: string
    category_label: string
    is_checked: boolean
    availability_status: string
    store_prices: Array<{ store_name: string; price_amount: string; price_unit: string }>
}

export type ShoppingList = {
    id: string
    meal_plan_id: string
    group_id: string
    total_estimated_cost: string
    items: ShoppingListItem[]
    generated_at: string
}

export type BudgetAnalytics = {
    budget_limit: string
    planned_cost: string
    remaining: string
    cost_by_day: Array<{ day_index: number; plan_date: string; cost: string }>
    most_expensive_meals: Array<{
        meal_plan_item_id: string
        recipe_title: string
        cost: string
        meal_type: MealType
        day_index: number
    }>
    savings_opportunities: Array<{ meal_plan_item_id: string; suggestion: string }>
}

export type NutritionAnalytics = {
    weekly_target_fit: string
    macro_balance: Record<string, number>
    member_fit: Array<{
        member_id: string
        display_name: string
        target_calories: number
        actual_calories: number
        protein_ratio: number
        fat_ratio: number
        carb_ratio: number
    }>
    micronutrients: Record<string, number>
}

export type PantryItem = {
    id: string
    group_id: string
    ingredient_id: string
    ingredient_name: string
    quantity: string
    unit: string
    expires_at: string | null
    created_at: string
    updated_at: string
}
