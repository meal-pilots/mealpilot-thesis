import { apiRequest } from '@shared/api/http'
import { getStoredAuthSession } from '@shared/lib/secure-storage'
import type { AuthUser, StoredAuthSession } from '@shared/types/auth'

type LoginPayload = { email: string; password: string }
type SignUpPayload = { email: string; password: string; full_name: string }
type LoginResponse = { access: string; refresh: string; user: AuthUser }

function normalizeEmail(value: string): string {
    return value.trim().toLowerCase()
}

export async function login(payload: LoginPayload): Promise<StoredAuthSession> {
    const data = await apiRequest<LoginResponse>('/auth/log-in', {
        method: 'POST',
        body: {
            ...payload,
            email: normalizeEmail(payload.email),
        },
        auth: false,
    })
    return { access: data.access, refresh: data.refresh, user: data.user }
}

export async function signUp(payload: SignUpPayload): Promise<AuthUser> {
    return apiRequest<AuthUser>('/auth/sign-up', {
        method: 'POST',
        body: {
            ...payload,
            email: normalizeEmail(payload.email),
        },
        auth: false,
    })
}

export async function fetchMe(): Promise<AuthUser> {
    return apiRequest<AuthUser>('/auth/me')
}

export async function logout(): Promise<void> {
    const beforeLogout = await getStoredAuthSession()

    if (!beforeLogout?.refresh) {
        return
    }

    await apiRequest<unknown>('/auth/log-out', {
        method: 'POST',
        body: {
            refresh_token: beforeLogout.refresh,
        },
    })

    const afterLogout = await getStoredAuthSession()

    if (afterLogout?.refresh && afterLogout.refresh !== beforeLogout.refresh) {
        await apiRequest<unknown>('/auth/log-out', {
            method: 'POST',
            body: {
                refresh_token: afterLogout.refresh,
            },
            retryOnUnauthorized: false,
        })
    }
}

export async function deleteAccount(payload: { password: string; confirm: true }): Promise<void> {
    await apiRequest<unknown>('/auth/account/delete', {
        method: 'DELETE',
        body: payload,
    })
}
