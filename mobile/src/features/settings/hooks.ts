import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
    getProfile,
    getSettings,
    updateProfile,
    updateSettings,
    type UserProfile,
    type UserSettings,
} from './api/settings-api'

export const settingsKeys = {
    all: ['user'] as const,
    settings: () => [...settingsKeys.all, 'settings'] as const,
    profile: () => [...settingsKeys.all, 'profile'] as const,
}

export function useUserSettings() {
    return useQuery({
        queryKey: settingsKeys.settings(),
        queryFn: getSettings,
        staleTime: 60_000,
    })
}

export function useUserProfile() {
    return useQuery({
        queryKey: settingsKeys.profile(),
        queryFn: getProfile,
        staleTime: 60_000,
    })
}

export function useUpdateSettings() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: Partial<UserSettings>) => updateSettings(payload),
        onSuccess: (data) => {
            queryClient.setQueryData(settingsKeys.settings(), data)
        },
    })
}

export function useUpdateProfile() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload: Partial<Pick<UserProfile, 'full_name' | 'preferred_language' | 'avatar_url'>>) =>
            updateProfile(payload),
        onSuccess: (data) => {
            queryClient.setQueryData(settingsKeys.profile(), data)
        },
    })
}
