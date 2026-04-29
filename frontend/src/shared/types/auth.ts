import type { User } from '../../entities/user/model/types'

export interface AuthTokens {
    access: string
    refresh: string
}

export interface StoredAuthSession extends AuthTokens {
    user: User
}