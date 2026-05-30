import { apiRequest } from '@shared/api/http'
import type {
    BudgetAnalytics,
    GeneratePlanAsyncResponse,
    GeneratePlanRequest,
    GeneratePlanSyncResponse,
    GenerationRunStatusResponse,
    MealItemAdaptation,
    MealPlanDay,
    MealPlanDetail,
    MealPlanItem,
    NutritionAnalytics,
    PlanExplanation,
    PlanListItem,
    ShoppingList,
} from '@entities/plan/types'

export async function listPlansForGroup(groupId: string): Promise<PlanListItem[]> {
    return apiRequest<PlanListItem[]>(`/groups/${groupId}/meal-plans`)
}

export async function getCurrentPlanForGroup(groupId: string): Promise<PlanListItem | null> {
    return apiRequest<PlanListItem | null>(`/groups/${groupId}/meal-plans/current`)
}

export async function getPlanDetail(planId: string): Promise<MealPlanDetail> {
    return apiRequest<MealPlanDetail>(`/meal-plans/${planId}`)
}

export async function getPlanDay(planId: string, dayIndex: number): Promise<MealPlanDay> {
    return apiRequest<MealPlanDay>(`/meal-plans/${planId}/days/${dayIndex}`)
}

export async function generatePlanAsync(
    groupId: string,
    request: GeneratePlanRequest,
): Promise<GeneratePlanAsyncResponse> {
    return apiRequest<GeneratePlanAsyncResponse>(
        `/groups/${groupId}/meal-plans/generate?async=1`,
        {
            method: 'POST',
            body: request,
        },
    )
}

export async function generatePlanSync(
    groupId: string,
    request: GeneratePlanRequest,
): Promise<GeneratePlanSyncResponse> {
    return apiRequest<GeneratePlanSyncResponse>(
        `/groups/${groupId}/meal-plans/generate?async=0`,
        {
            method: 'POST',
            body: request,
        },
    )
}

export async function getGenerationRunStatus(runId: string): Promise<GenerationRunStatusResponse> {
    return apiRequest<GenerationRunStatusResponse>(`/meal-plans/generation-run/${runId}`)
}

export async function replaceMealPlanItem(
    itemId: string,
    replacementRecipeId: string,
): Promise<MealPlanItem> {
    return apiRequest<MealPlanItem>(`/meal-plan-items/${itemId}/replace`, {
        method: 'POST',
        body: { replacement_recipe_id: replacementRecipeId },
    })
}

export async function createAdaptation(
    itemId: string,
    payload: { member_id: string; adaptation_type: string },
): Promise<MealItemAdaptation> {
    return apiRequest<MealItemAdaptation>(`/meal-plan-items/${itemId}/adaptations`, {
        method: 'POST',
        body: payload,
    })
}

export async function deleteAdaptation(itemId: string, adaptationId: string): Promise<void> {
    await apiRequest(`/meal-plan-items/${itemId}/adaptations/${adaptationId}`, {
        method: 'DELETE',
    })
}

export async function getShoppingList(planId: string): Promise<ShoppingList> {
    return apiRequest<ShoppingList>(`/meal-plans/${planId}/shopping-list`)
}

export async function regenerateShoppingList(planId: string): Promise<ShoppingList> {
    return apiRequest<ShoppingList>(
        `/meal-plans/${planId}/shopping-list/regenerate`,
        { method: 'POST', body: { regenerate: true } },
    )
}

export async function getBudgetAnalytics(planId: string): Promise<BudgetAnalytics> {
    return apiRequest<BudgetAnalytics>(`/meal-plans/${planId}/budget-analytics`)
}

export async function getNutritionAnalytics(planId: string): Promise<NutritionAnalytics> {
    return apiRequest<NutritionAnalytics>(`/meal-plans/${planId}/nutrition-analytics`)
}

export async function getPlanExplanations(planId: string): Promise<PlanExplanation[]> {
    return apiRequest<PlanExplanation[]>(`/meal-plans/${planId}/explanations`)
}

export async function approvePlan(planId: string): Promise<void> {
    await apiRequest(`/meal-plans/${planId}/approve`, {
        method: 'POST',
        body: { approve: true },
    })
}

export async function archivePlan(planId: string): Promise<void> {
    await apiRequest(`/meal-plans/${planId}/archive`, { method: 'POST' })
}

export async function updateShoppingItem(
    itemId: string,
    payload: Partial<{ is_checked: boolean; total_quantity: string; availability_status: string }>,
): Promise<void> {
    await apiRequest(`/shopping-list-items/${itemId}`, {
        method: 'PATCH',
        body: payload,
    })
}
