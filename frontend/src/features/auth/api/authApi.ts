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

export const authApi = {
    signUp(input: SignUpInput) {
        return apiRequest<User>('/auth/sign-up', {
            method: 'POST',
            auth: false,
            body: {
                full_name: input.fullName.trim(),
                email: input.email.trim(),
                password: input.password,
            },
        })
    },

    logIn(input: LogInInput) {
        return apiRequest<StoredAuthSession>('/auth/log-in', {
            method: 'POST',
            auth: false,
            body: {
                email: input.email.trim(),
                password: input.password,
            },
        })
    },

    me() {
        return apiRequest<User>('/auth/me')
    },

    logOut() {
        const refreshToken = getStoredAuthSession()?.refresh

        if (!refreshToken) {
            return Promise.resolve({})
        }

        return apiRequest<Record<string, never>>('/auth/log-out', {
            method: 'POST',
            body: {
                refresh_token: refreshToken,
            },
        })
    },
}