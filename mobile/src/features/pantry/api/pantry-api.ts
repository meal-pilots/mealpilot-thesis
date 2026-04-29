import { apiRequest } from '@shared/api/http'

export type PantryItem = {
    id: string
    group_id: string
    ingredient_id: string
    ingredient_name: string
    quantity: string
    unit: string
    expires_at: string | null
    created_at: string
    updated_at: string
}

export type PantryItemCreatePayload = {
    ingredient_id: string
    quantity: number | string
    unit: string
    expires_at?: string | null
}

export type PantryItemUpdatePayload = {
    quantity?: number | string
    unit?: string
    expires_at?: string | null
}

export async function listPantryItems(groupId: string): Promise<PantryItem[]> {
    return apiRequest<PantryItem[]>(`/api/v1/groups/${groupId}/pantry-items`)
}

export async function createPantryItem(groupId: string, payload: PantryItemCreatePayload): Promise<PantryItem> {
    return apiRequest<PantryItem>(`/api/v1/groups/${groupId}/pantry-items`, {
        method: 'POST',
        body: payload,
    })
}

export async function updatePantryItem(itemId: string, payload: PantryItemUpdatePayload): Promise<PantryItem> {
    return apiRequest<PantryItem>(`/api/v1/pantry-items/${itemId}`, {
        method: 'PATCH',
        body: payload,
    })
}

export async function deletePantryItem(itemId: string): Promise<void> {
    await apiRequest(`/api/v1/pantry-items/${itemId}`, { method: 'DELETE' })
}
