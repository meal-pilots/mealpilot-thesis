export type AuthUser = {
    id: string
    email: string
    full_name: string
    preferred_language?: string | null
    avatar_url?: string | null
    created_at?: string
}

export type StoredAuthSession = {
    access: string
    refresh: string
    user: AuthUser
}

export type AuthTokens = {
    access: string
    refresh?: string
}
