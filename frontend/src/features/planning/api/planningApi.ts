import { apiRequest } from '../../../shared/api/http'

export type OptimizationFocus = 'budget' | 'nutrition' | 'speed' | 'taste'
export type MealPlanStatus = 'draft' | 'generated' | 'approved' | 'modified' | 'archived'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type AdaptationType =
    | 'portion_change'
    | 'ingredient_remove'
    | 'ingredient_replace'
    | 'low_carb'
    | 'high_protein'
    | 'child_friendly'
    | 'allergen_free'
    | 'cheaper_version'

export interface MealPlanSummaryDto {
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
    estimated_total_cost: string | number
    estimated_total_calories: string | number
    nutrition_fit_score: string | number
    budget_fit_score: string | number
    group_fit_score: string | number
    diversity_score: string | number
    overall_score: string | number
    created_at: string
    updated_at: string
}

export interface PlanExplanationDto {
    id: string
    explanation_type: 'budget' | 'nutrition' | 'diversity' | 'group_fit' | 'tradeoff'
    title: string
    explanation_text: string
    priority_order: number
    explanation_json: Record<string, unknown>
    created_at: string
}

export interface MealItemAdaptationDto {
    id: string
    meal_plan_item_id: string
    member_id: string
    member_name: string
    adaptation_type: AdaptationType
    description: string
    price_delta: string | number
    calorie_delta: string | number
    protein_delta_g: string | number
    fat_delta_g: string | number
    carb_delta_g: string | number
    before_snapshot_json: Record<string, unknown>
    after_snapshot_json: Record<string, unknown>
    created_at: string
}

export interface MealPlanItemDto {
    id: string
    meal_type: MealType
    recipe_id: string
    recipe_title: string
    servings_total: string | number
    estimated_cost: string | number
    estimated_calories: string | number
    selection_score: string | number
    selection_reason_summary: string
    is_manually_replaced: boolean
    adaptations: MealItemAdaptationDto[]
    created_at: string
}

export interface MealPlanDayDto {
    id: string
    day_index: number
    plan_date: string
    estimated_daily_cost: string | number
    estimated_daily_calories: string | number
    items: MealPlanItemDto[]
}

export interface MealPlanDetailDto {
    summary: MealPlanSummaryDto
    days: MealPlanDayDto[]
    top_explanations: PlanExplanationDto[]
}

export interface CurrentMealPlanListItemDto {
    id: string
    title: string
    start_date: string
    end_date: string
    status: MealPlanStatus
    overall_score: string | number
    estimated_total_cost: string | number
    is_current: boolean
    created_at: string
}

export interface GenerateMealPlanInput {
    start_date: string
    days_count: number
    meals_per_day: number
    include_snacks: boolean
    budget_strictness: 'strict' | 'medium' | 'flexible'
    cooking_time_strictness: 'strict' | 'medium' | 'flexible'
    variety_level: 'low' | 'medium' | 'high'
    repetition_allowed: number
    optimization_focus: OptimizationFocus[]
}

export interface GenerateMealPlanResponse {
    meal_plan_id: string
    summary: MealPlanSummaryDto
    top_explanations: PlanExplanationDto[]
}

export interface CreateAdaptationInput {
    member_id: string
    adaptation_type: AdaptationType
}

export interface ShoppingListStorePriceDto {
    store_name: string
    price_amount: string | number
    price_unit: string
}

export interface ShoppingListItemDto {
    id: string
    ingredient_id: string | null
    ingredient_name: string
    total_quantity: string | number
    unit: string
    estimated_price: string | number
    category_label: string
    is_checked: boolean
    availability_status: string
    store_prices: ShoppingListStorePriceDto[]
    created_at: string
}

export interface ShoppingListDto {
    id: string
    meal_plan_id: string
    group_id: string
    total_estimated_cost: string | number
    items: ShoppingListItemDto[]
    generated_at: string
}

export interface ShoppingListItemUpdateInput {
    is_checked?: boolean
    total_quantity?: string | number
    estimated_price?: string | number
    category_label?: string
}

export interface BudgetAnalyticsDayDto {
    day_index: number
    plan_date: string
    cost: string | number
}

export interface BudgetAnalyticsMostExpensiveMealDto {
    meal_plan_item_id: string
    recipe_title: string
    estimated_cost: string | number
}

export interface BudgetAnalyticsSavingOpportunityDto {
    ingredient_name: string
    suggested_substitute: string
    estimated_savings: string | number
}

export interface BudgetAnalyticsDto {
    budget_limit: string | number
    planned_cost: string | number
    remaining: string | number
    cost_by_day: BudgetAnalyticsDayDto[]
    most_expensive_meals: BudgetAnalyticsMostExpensiveMealDto[]
    savings_opportunities: BudgetAnalyticsSavingOpportunityDto[]
}

export interface NutritionAnalyticsMemberFitDto {
    member_id: string
    member_name: string
    calorie_fit: string | number
    protein_fit: string | number
    fat_fit: string | number
    carb_fit: string | number
}

export interface NutritionAnalyticsDto {
    weekly_target_fit: string | number
    macro_balance: {
        protein_g: string | number
        fat_g: string | number
        carb_g: string | number
    }
    member_fit: NutritionAnalyticsMemberFitDto[]
    micronutrients: Record<string, string | number>
}

export const planningApi = {
    generateMealPlan(groupId: string, input: GenerateMealPlanInput) {
        return apiRequest<GenerateMealPlanResponse>(`/groups/${groupId}/meal-plans/generate`, {
            method: 'POST',
            body: input as unknown as Record<string, unknown>,
        })
    },

    getCurrentMealPlan(groupId: string) {
        return apiRequest<CurrentMealPlanListItemDto | null>(`/groups/${groupId}/meal-plans/current`)
    },

    getMealPlanDetail(mealPlanId: string) {
        return apiRequest<MealPlanDetailDto>(`/meal-plans/${mealPlanId}`)
    },

    getDayDetail(mealPlanId: string, dayIndex: number) {
        return apiRequest<MealPlanDayDto>(`/meal-plans/${mealPlanId}/days/${dayIndex}`)
    },

    createAdaptation(itemId: string, input: CreateAdaptationInput) {
        return apiRequest<MealItemAdaptationDto>(`/meal-plan-items/${itemId}/adaptations`, {
            method: 'POST',
            body: input as unknown as Record<string, unknown>,
        })
    },

    getShoppingList(mealPlanId: string) {
        return apiRequest<ShoppingListDto>(`/meal-plans/${mealPlanId}/shopping-list`)
    },

    regenerateShoppingList(mealPlanId: string) {
        return apiRequest<ShoppingListDto>(`/meal-plans/${mealPlanId}/shopping-list/regenerate`, {
            method: 'POST',
            body: { regenerate: true },
        })
    },

    updateShoppingListItem(itemId: string, input: ShoppingListItemUpdateInput) {
        return apiRequest<{
            id: string
            is_checked: boolean
            total_quantity: string | number
            estimated_price: string | number
            category_label: string
        }>(`/shopping-list-items/${itemId}`, {
            method: 'PATCH',
            body: input as unknown as Record<string, unknown>,
        })
    },

    getBudgetAnalytics(mealPlanId: string) {
        return apiRequest<BudgetAnalyticsDto>(`/meal-plans/${mealPlanId}/budget-analytics`)
    },

    getNutritionAnalytics(mealPlanId: string) {
        return apiRequest<NutritionAnalyticsDto>(`/meal-plans/${mealPlanId}/nutrition-analytics`)
    },

    getPlanExplanations(mealPlanId: string) {
        return apiRequest<PlanExplanationDto[]>(`/meal-plans/${mealPlanId}/explanations`)
    },
}
