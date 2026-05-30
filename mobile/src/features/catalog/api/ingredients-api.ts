import { apiRequest } from '@shared/api/http'

export type IngredientLookup = {
    id: string
    name: string
    unit: string
    category: string
}

export async function searchIngredients(search: string, limit = 20): Promise<IngredientLookup[]> {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('limit', String(limit))
    return apiRequest<IngredientLookup[]>(`/ingredients?${params.toString()}`)
}
