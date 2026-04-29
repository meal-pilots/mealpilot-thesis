import { useQuery } from '@tanstack/react-query'

import { searchIngredients } from './api/ingredients-api'

export const catalogKeys = {
    ingredients: (search: string) => ['catalog', 'ingredients', search] as const,
}

export function useIngredientSearch(search: string, enabled = true) {
    return useQuery({
        queryKey: catalogKeys.ingredients(search),
        queryFn: () => searchIngredients(search, 20),
        enabled: enabled && search.length >= 1,
        staleTime: 30_000,
    })
}
