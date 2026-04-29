import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
    listNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from './api/notifications-api'

export const notificationKeys = {
    all: ['notifications'] as const,
    list: () => [...notificationKeys.all, 'list'] as const,
}

export function useNotifications() {
    return useQuery({
        queryKey: notificationKeys.list(),
        queryFn: listNotifications,
        staleTime: 30_000,
    })
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => markNotificationRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.list() })
        },
    })
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: () => markAllNotificationsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.list() })
        },
    })
}
