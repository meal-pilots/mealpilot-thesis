import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { RecipeFilters } from '@entities/recipe/types'

import {
    addFavorite,
    getRecipe,
    listCategories,
    listFavorites,
    listRecipes,
    listTags,
    removeFavorite,
} from './api/recipes-api'

export const recipeKeys = {
    all: ['recipes'] as const,
    list: (filters?: RecipeFilters) => [...recipeKeys.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...recipeKeys.all, 'detail', id] as const,
    tags: () => [...recipeKeys.all, 'tags'] as const,
    categories: () => [...recipeKeys.all, 'categories'] as const,
    favorites: () => [...recipeKeys.all, 'favorites'] as const,
}

export function useRecipes(filters?: RecipeFilters) {
    return useQuery({
        queryKey: recipeKeys.list(filters),
        queryFn: () => listRecipes(filters),
        staleTime: 60_000,
    })
}

export function useRecipe(recipeId: string | undefined | null) {
    return useQuery({
        queryKey: recipeId ? recipeKeys.detail(recipeId) : ['recipes', 'detail', 'none'],
        queryFn: () => getRecipe(recipeId as string),
        enabled: Boolean(recipeId),
        staleTime: 60_000,
    })
}

export function useTags() {
    return useQuery({
        queryKey: recipeKeys.tags(),
        queryFn: listTags,
        staleTime: 5 * 60_000,
    })
}

export function useCategories() {
    return useQuery({
        queryKey: recipeKeys.categories(),
        queryFn: listCategories,
        staleTime: 5 * 60_000,
    })
}

export function useFavorites() {
    return useQuery({
        queryKey: recipeKeys.favorites(),
        queryFn: listFavorites,
        staleTime: 30_000,
    })
}

export function useToggleFavorite() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: { recipeId: string; currentlyFavorited: boolean }) => {
            if (input.currentlyFavorited) {
                await removeFavorite(input.recipeId)
            } else {
                await addFavorite(input.recipeId)
            }
            return input
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: recipeKeys.favorites() })
        },
    })
}
