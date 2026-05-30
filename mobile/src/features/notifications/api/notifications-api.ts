import { apiRequest } from '@shared/api/http'

export type AppNotification = {
    id: string
    type: string
    title: string
    message: string
    is_read: boolean
    metadata_json: Record<string, unknown> | null
    created_at: string
}

export async function listNotifications(): Promise<AppNotification[]> {
    return apiRequest<AppNotification[]>('/notifications')
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
    return apiRequest<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllNotificationsRead(): Promise<void> {
    await apiRequest<void>('/notifications/read-all', { method: 'PATCH' })
}
