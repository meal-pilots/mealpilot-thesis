import type {
    FavoriteRecipeListItem,
    RecipeCard,
    RecipeDetail,
    RecipeTagItem,
} from '../../../entities/recipe/model/types'
import { apiRequest } from '../../../shared/api/http'
import type { ApiEnvelope } from '../../../shared/types/api'

export interface ListRecipesParams {
    search?: string
    tagKey?: string | null
    page?: number
    pageSize?: number
}

export interface PaginationMeta {
    page: number
    page_size: number
    total: number
    total_pages: number
}

export interface PaginatedRecipesResponse {
    data: RecipeCard[]
    meta: PaginationMeta
}

function buildRecipesQuery(params: ListRecipesParams = {}) {
    const searchParams = new URLSearchParams()

    if (params.search?.trim()) {
        searchParams.set('search', params.search.trim())
    }

    if (params.tagKey?.trim()) {
        searchParams.set('tags', params.tagKey.trim())
    }

    if (params.page && params.page > 1) {
        searchParams.set('page', String(params.page))
    }

    searchParams.set('page_size', String(params.pageSize ?? 24))

    const queryString = searchParams.toString()
    return queryString ? `/recipes?${queryString}` : '/recipes'
}

export const recipesApi = {
    list(params: ListRecipesParams = {}) {
        return apiRequest<RecipeCard[]>(buildRecipesQuery(params))
    },

    listPaginated(params: ListRecipesParams = {}) {
        return apiRequest<ApiEnvelope<RecipeCard[]>>(buildRecipesQuery(params), { unwrap: false }).then((response) => ({
            data: response.data,
            meta: {
                page: Number(response.meta?.page ?? params.page ?? 1),
                page_size: Number(response.meta?.page_size ?? params.pageSize ?? response.data.length),
                total: Number(response.meta?.total ?? response.data.length),
                total_pages: Number(response.meta?.total_pages ?? 1),
            },
        }))
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
