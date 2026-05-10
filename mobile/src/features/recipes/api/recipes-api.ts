import { apiRequest } from '@shared/api/http'
import type {
    RecipeCard,
    RecipeDetail,
    RecipeFilters,
    Tag,
} from '@entities/recipe/types'

type Paginated<T> = {
    count?: number
    next?: string | null
    previous?: string | null
    results: T[]
}

function buildQuery(filters: RecipeFilters | undefined): string {
    if (!filters) return ''
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.category) params.set('category', filters.category)
    if (filters.cuisine_type) params.set('cuisine_type', filters.cuisine_type)
    if (filters.max_time !== undefined) params.set('max_time', String(filters.max_time))
    if (filters.max_cost !== undefined) params.set('max_cost', String(filters.max_cost))
    if (filters.tags?.length) params.set('tags', filters.tags.join(','))
    const qs = params.toString()
    return qs ? `?${qs}` : ''
}

export async function listRecipes(filters?: RecipeFilters): Promise<RecipeCard[]> {
    const query = buildQuery(filters)
    const data = await apiRequest<RecipeCard[] | Paginated<RecipeCard>>(`/api/v1/recipes${query}`)
    if (Array.isArray(data)) return data
    return data.results ?? []
}

export async function getRecipe(recipeId: string): Promise<RecipeDetail> {
    return apiRequest<RecipeDetail>(`/api/v1/recipes/${recipeId}`)
}

export async function listTags(): Promise<Tag[]> {
    return apiRequest<Tag[]>('/api/v1/recipes/tags')
}

export async function listCategories(): Promise<string[]> {
    return apiRequest<string[]>('/api/v1/recipes/categories')
}

export async function listFavorites(): Promise<{
    recipe_id: string
    title: string
    image_url: string | null
    fit_score: number
}[]> {
    return apiRequest('/api/v1/favorites/recipes')
}

export async function addFavorite(recipeId: string): Promise<void> {
    await apiRequest('/api/v1/favorites/recipes', {
        method: 'POST',
        body: { recipe_id: recipeId },
    })
}

export async function removeFavorite(recipeId: string): Promise<void> {
    await apiRequest(`/api/v1/favorites/recipes/${recipeId}`, { method: 'DELETE' })
}
