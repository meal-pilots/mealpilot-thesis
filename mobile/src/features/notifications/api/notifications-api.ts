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
    return apiRequest<AppNotification[]>('/api/v1/notifications')
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
    return apiRequest<AppNotification>(`/api/v1/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllNotificationsRead(): Promise<void> {
    await apiRequest<void>('/api/v1/notifications/read-all', { method: 'PATCH' })
}
