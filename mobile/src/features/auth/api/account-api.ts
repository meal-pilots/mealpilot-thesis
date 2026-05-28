import { apiRequest } from '@shared/api/http'

export async function deleteAccount(payload: { password: string; confirm: true }): Promise<void> {
    await apiRequest<unknown>('/auth/account/delete', {
        method: 'DELETE',
        body: payload,
    })
}
