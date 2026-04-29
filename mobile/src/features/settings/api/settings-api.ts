import { apiRequest } from '@shared/api/http'

export type UserSettings = {
    preferred_language: string
    notifications_enabled: boolean
    measurement_system: 'metric' | 'imperial'
    currency_code: string
}

export type UserProfile = {
    id: string
    email: string
    full_name: string
    preferred_language: string
    avatar_url: string | null
    created_at: string
}

export async function getSettings(): Promise<UserSettings> {
    return apiRequest<UserSettings>('/api/v1/settings')
}

export async function updateSettings(payload: Partial<UserSettings>): Promise<UserSettings> {
    return apiRequest<UserSettings>('/api/v1/settings', {
        method: 'PATCH',
        body: payload,
    })
}

export async function getProfile(): Promise<UserProfile> {
    return apiRequest<UserProfile>('/api/v1/profile')
}

export async function updateProfile(payload: Partial<Pick<UserProfile, 'full_name' | 'preferred_language' | 'avatar_url'>>): Promise<UserProfile> {
    return apiRequest<UserProfile>('/api/v1/profile', {
        method: 'PATCH',
        body: payload,
    })
}
