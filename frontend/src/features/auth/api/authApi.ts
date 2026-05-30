import type { User } from '../../../entities/user/model/types'
import { apiRequest } from '../../../shared/api/http'
import { getStoredAuthSession } from '../../../shared/lib/auth-storage'
import type { StoredAuthSession } from '../../../shared/types/auth'

export interface SignUpInput {
    fullName: string
    email: string
    password: string
}

export interface LogInInput {
    email: string
    password: string
}

export interface DeleteAccountInput {
    password: string
    confirm: true
}

function normalizeEmail(value: string) {
    return value.trim().toLowerCase()
}

export const authApi = {
    signUp(input: SignUpInput) {
        return apiRequest<User>('/auth/sign-up', {
            method: 'POST',
            auth: false,
            body: {
                full_name: input.fullName.trim(),
                email: normalizeEmail(input.email),
                password: input.password,
            },
        })
    },

    logIn(input: LogInInput) {
        return apiRequest<StoredAuthSession>('/auth/log-in', {
            method: 'POST',
            auth: false,
            body: {
                email: normalizeEmail(input.email),
                password: input.password,
            },
        })
    },

    me() {
        return apiRequest<User>('/auth/me')
    },

    async logOut() {
        const beforeLogout = getStoredAuthSession()

        if (!beforeLogout?.refresh) {
            return {}
        }

        await apiRequest<Record<string, never>>('/auth/log-out', {
            method: 'POST',
            body: {
                refresh_token: beforeLogout.refresh,
            },
        })

        const afterLogout = getStoredAuthSession()

        if (afterLogout?.refresh && afterLogout.refresh !== beforeLogout.refresh) {
            await apiRequest<Record<string, never>>('/auth/log-out', {
                method: 'POST',
                body: {
                    refresh_token: afterLogout.refresh,
                },
                retryOnUnauthorized: false,
            })
        }

        return {}
    },

    deleteAccount(input: DeleteAccountInput) {
        return apiRequest<unknown>('/auth/account/delete', {
            method: 'DELETE',
            body: input as unknown as Record<string, unknown>,
        })
    },
}
