import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
    GeneratePlanRequest,
    GenerationRunStatusResponse,
} from '@entities/plan/types'

import {
    approvePlan,
    archivePlan,
    createAdaptation,
    deleteAdaptation,
    generatePlanAsync,
    getBudgetAnalytics,
    getCurrentPlanForGroup,
    getGenerationRunStatus,
    getNutritionAnalytics,
    getPlanDay,
    getPlanDetail,
    getPlanExplanations,
    getShoppingList,
    listPlansForGroup,
    regenerateShoppingList,
    replaceMealPlanItem,
    updateShoppingItem,
} from './api/plans-api'

export const planKeys = {
    all: ['plans'] as const,
    listByGroup: (groupId: string) => [...planKeys.all, 'group', groupId] as const,
    currentByGroup: (groupId: string) => [...planKeys.all, 'group', groupId, 'current'] as const,
    detail: (planId: string) => [...planKeys.all, 'detail', planId] as const,
    day: (planId: string, dayIndex: number) =>
        [...planKeys.all, 'detail', planId, 'day', dayIndex] as const,
    shoppingList: (planId: string) => [...planKeys.all, 'detail', planId, 'shopping-list'] as const,
    budget: (planId: string) => [...planKeys.all, 'detail', planId, 'budget'] as const,
    nutrition: (planId: string) => [...planKeys.all, 'detail', planId, 'nutrition'] as const,
    explanations: (planId: string) => [...planKeys.all, 'detail', planId, 'explanations'] as const,
    runStatus: (runId: string) => [...planKeys.all, 'run', runId] as const,
}

export function usePlansForGroup(groupId: string | undefined | null) {
    return useQuery({
        queryKey: groupId ? planKeys.listByGroup(groupId) : ['plans', 'group', 'none'],
        queryFn: () => listPlansForGroup(groupId as string),
        enabled: Boolean(groupId),
        staleTime: 30_000,
    })
}

export function useCurrentPlan(groupId: string | undefined | null) {
    return useQuery({
        queryKey: groupId ? planKeys.currentByGroup(groupId) : ['plans', 'group', 'none', 'current'],
        queryFn: () => getCurrentPlanForGroup(groupId as string),
        enabled: Boolean(groupId),
        staleTime: 30_000,
    })
}

export function usePlanDetail(planId: string | undefined | null) {
    return useQuery({
        queryKey: planId ? planKeys.detail(planId) : ['plans', 'detail', 'none'],
        queryFn: () => getPlanDetail(planId as string),
        enabled: Boolean(planId),
        staleTime: 30_000,
    })
}

export function usePlanDay(planId: string | undefined | null, dayIndex: number | undefined | null) {
    const enabled = Boolean(planId) && Number.isFinite(dayIndex)
    return useQuery({
        queryKey:
            planId && Number.isFinite(dayIndex)
                ? planKeys.day(planId, dayIndex as number)
                : ['plans', 'day', 'none'],
        queryFn: () => getPlanDay(planId as string, dayIndex as number),
        enabled,
        staleTime: 30_000,
    })
}

export function useShoppingList(planId: string | undefined | null) {
    return useQuery({
        queryKey: planId ? planKeys.shoppingList(planId) : ['plans', 'shop', 'none'],
        queryFn: () => getShoppingList(planId as string),
        enabled: Boolean(planId),
        staleTime: 30_000,
    })
}

export function useBudgetAnalytics(planId: string | undefined | null) {
    return useQuery({
        queryKey: planId ? planKeys.budget(planId) : ['plans', 'budget', 'none'],
        queryFn: () => getBudgetAnalytics(planId as string),
        enabled: Boolean(planId),
        staleTime: 60_000,
    })
}

export function useNutritionAnalytics(planId: string | undefined | null) {
    return useQuery({
        queryKey: planId ? planKeys.nutrition(planId) : ['plans', 'nutrition', 'none'],
        queryFn: () => getNutritionAnalytics(planId as string),
        enabled: Boolean(planId),
        staleTime: 60_000,
    })
}

export function usePlanExplanations(planId: string | undefined | null) {
    return useQuery({
        queryKey: planId ? planKeys.explanations(planId) : ['plans', 'explanations', 'none'],
        queryFn: () => getPlanExplanations(planId as string),
        enabled: Boolean(planId),
        staleTime: 60_000,
    })
}

export function useGenerationRunStatus(runId: string | undefined | null, options?: { pollMs?: number }) {
    const pollMs = options?.pollMs ?? 2000
    return useQuery<GenerationRunStatusResponse>({
        queryKey: runId ? planKeys.runStatus(runId) : ['plans', 'run', 'none'],
        queryFn: () => getGenerationRunStatus(runId as string),
        enabled: Boolean(runId),
        refetchInterval: (query) => {
            const data = query.state.data
            if (!data) return pollMs
            if (data.status === 'pending') return pollMs
            return false
        },
    })
}

export function useGeneratePlan() {
    return useMutation({
        mutationFn: (input: { groupId: string; request: GeneratePlanRequest }) =>
            generatePlanAsync(input.groupId, input.request),
    })
}

export function useReplaceMealItem() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: { itemId: string; replacementRecipeId: string; planId: string }) =>
            replaceMealPlanItem(input.itemId, input.replacementRecipeId),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: planKeys.detail(vars.planId) })
            queryClient.invalidateQueries({ queryKey: planKeys.shoppingList(vars.planId) })
        },
    })
}

export function useCreateAdaptation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: {
            itemId: string
            planId: string
            member_id: string
            adaptation_type: string
        }) =>
            createAdaptation(input.itemId, {
                member_id: input.member_id,
                adaptation_type: input.adaptation_type,
            }),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: planKeys.detail(vars.planId) })
        },
    })
}

export function useDeleteAdaptation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: { itemId: string; adaptationId: string; planId: string }) =>
            deleteAdaptation(input.itemId, input.adaptationId),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: planKeys.detail(vars.planId) })
        },
    })
}

export function useUpdateShoppingItem() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: {
            itemId: string
            planId: string
            payload: Parameters<typeof updateShoppingItem>[1]
        }) => updateShoppingItem(input.itemId, input.payload),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: planKeys.shoppingList(vars.planId) })
        },
    })
}

export function useRegenerateShoppingList() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (planId: string) => regenerateShoppingList(planId),
        onSuccess: (_, planId) => {
            queryClient.invalidateQueries({ queryKey: planKeys.shoppingList(planId) })
        },
    })
}

export function useApprovePlan() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (planId: string) => approvePlan(planId),
        onSuccess: (_, planId) => {
            queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) })
            queryClient.invalidateQueries({ queryKey: planKeys.all })
        },
    })
}

export function useArchivePlan() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (planId: string) => archivePlan(planId),
        onSuccess: (_, planId) => {
            queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) })
            queryClient.invalidateQueries({ queryKey: planKeys.all })
        },
    })
}
