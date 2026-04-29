import { apiRequest } from '../../../shared/api/http'
import type { RecipeCard } from '../../../entities/recipe/model/types'

export interface ActiveGroupSummary {
    id: string
    name: string
    group_type: string
}

export interface CurrentPlanSummary {
    id: string
    title: string
    start_date: string
    end_date: string
    estimated_total_cost: string | number
    nutrition_fit_score: string | number
    budget_fit_score: string | number
    overall_score: string | number
}

export interface BudgetStatus {
    limit: string | number
    planned: string | number
    remaining: string | number
}

export interface NutritionStatus {
    weekly_target_fit: string | number
    protein_fit: string | number
    carb_fit: string | number
    fat_fit: string | number
}

export interface GroupDashboard {
    active_group: ActiveGroupSummary
    current_plan_summary: CurrentPlanSummary | null
    budget_status: BudgetStatus | null
    nutrition_status: NutritionStatus | null
    recommendation_preview: RecipeCard[]
    setup_completeness: number
}

export const dashboardApi = {
    getActiveGroup() {
        return apiRequest<ActiveGroupSummary | null>('/groups/active')
    },

    getDashboard(groupId: string) {
        return apiRequest<GroupDashboard>(`/groups/${groupId}/dashboard`)
    },
}
