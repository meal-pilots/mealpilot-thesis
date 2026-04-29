import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
    createPantryItem,
    deletePantryItem,
    listPantryItems,
    updatePantryItem,
    type PantryItemCreatePayload,
    type PantryItemUpdatePayload,
} from './api/pantry-api'

export const pantryKeys = {
    all: ['pantry'] as const,
    list: (groupId: string | undefined) => [...pantryKeys.all, 'list', groupId ?? 'none'] as const,
}

export function usePantryItems(groupId: string | undefined | null) {
    return useQuery({
        queryKey: pantryKeys.list(groupId ?? undefined),
        queryFn: () => listPantryItems(groupId as string),
        enabled: Boolean(groupId),
        staleTime: 30_000,
    })
}

export function useCreatePantryItem(groupId: string | undefined | null) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: PantryItemCreatePayload) => createPantryItem(groupId as string, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: pantryKeys.list(groupId ?? undefined) })
        },
    })
}

export function useUpdatePantryItem(groupId: string | undefined | null) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ itemId, payload }: { itemId: string; payload: PantryItemUpdatePayload }) =>
            updatePantryItem(itemId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: pantryKeys.list(groupId ?? undefined) })
        },
    })
}

export function useDeletePantryItem(groupId: string | undefined | null) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (itemId: string) => deletePantryItem(itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: pantryKeys.list(groupId ?? undefined) })
        },
    })
}
