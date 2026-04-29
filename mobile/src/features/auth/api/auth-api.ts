import { apiRequest } from '@shared/api/http'
import type { AuthUser, StoredAuthSession } from '@shared/types/auth'

type LoginPayload = { email: string; password: string }
type SignUpPayload = { email: string; password: string; full_name: string }
type LoginResponse = { access: string; refresh: string; user: AuthUser }

export async function login(payload: LoginPayload): Promise<StoredAuthSession> {
    const data = await apiRequest<LoginResponse>('/api/v1/auth/log-in', {
        method: 'POST',
        body: payload,
        auth: false,
    })
    return { access: data.access, refresh: data.refresh, user: data.user }
}

export async function signUp(payload: SignUpPayload): Promise<AuthUser> {
    return apiRequest<AuthUser>('/api/v1/auth/sign-up', {
        method: 'POST',
        body: payload,
        auth: false,
    })
}

export async function fetchMe(): Promise<AuthUser> {
    return apiRequest<AuthUser>('/api/v1/auth/me')
}

export async function deleteAccount(payload: { password: string; confirm: true }): Promise<void> {
    await apiRequest<unknown>('/api/v1/auth/account/delete', {
        method: 'DELETE',
        body: payload,
    })
}
