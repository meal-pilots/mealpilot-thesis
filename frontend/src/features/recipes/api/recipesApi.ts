import type {
    FavoriteRecipeListItem,
    RecipeCard,
    RecipeDetail,
    RecipeTagItem,
} from '../../../entities/recipe/model/types'
import { apiRequest } from '../../../shared/api/http'

export interface ListRecipesParams {
    search?: string
    tagKey?: string | null
    pageSize?: number
}

function buildRecipesQuery(params: ListRecipesParams = {}) {
    const searchParams = new URLSearchParams()

    if (params.search?.trim()) {
        searchParams.set('search', params.search.trim())
    }

    if (params.tagKey?.trim()) {
        searchParams.set('tags', params.tagKey.trim())
    }

    searchParams.set('page_size', String(params.pageSize ?? 24))

    const queryString = searchParams.toString()
    return queryString ? `/recipes?${queryString}` : '/recipes'
}

export const recipesApi = {
    list(params: ListRecipesParams = {}) {
        return apiRequest<RecipeCard[]>(buildRecipesQuery(params))
    },

    getById(recipeId: string) {
        return apiRequest<RecipeDetail>(`/recipes/${recipeId}`)
    },

    listTags() {
        return apiRequest<RecipeTagItem[]>('/recipes/tags')
    },

    listFavorites() {
        return apiRequest<FavoriteRecipeListItem[]>('/favorites/recipes')
    },

    addFavorite(recipeId: string) {
        return apiRequest<{ id: string; recipe_id: string; created_at: string }>('/favorites/recipes', {
            method: 'POST',
            body: { recipe_id: recipeId },
        })
    },

    removeFavorite(recipeId: string) {
        return apiRequest<Record<string, never>>(`/favorites/recipes/${recipeId}`, {
            method: 'DELETE',
        })
    },
}
