import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { fetchMe, login as loginRequest, signUp as signUpRequest } from '@features/auth/api/auth-api'
import { getActiveGroup, getGroupDashboard } from '@features/groups/api/groups-api'
import {
    clearStoredAuthSession,
    getStoredAuthSession,
    saveAuthSession,
    updateStoredAuthUser,
} from '@shared/lib/secure-storage'
import type { AuthUser, StoredAuthSession } from '@shared/types/auth'

type AuthState = {
    status: 'loading' | 'authenticated' | 'unauthenticated'
    user: AuthUser | null
    onboardingCompleted: boolean
}

type AuthContextValue = AuthState & {
    login: (input: { email: string; password: string }) => Promise<void>
    signUp: (input: { email: string; password: string; full_name: string }) => Promise<void>
    logout: () => Promise<void>
    refreshUser: () => Promise<void>
    refreshOnboardingStatus: () => Promise<boolean>
    markOnboardingCompleted: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        status: 'loading',
        user: null,
        onboardingCompleted: false,
    })

    const refreshOnboardingStatus = useCallback(async () => {
        try {
            const activeGroup = await getActiveGroup()
            if (!activeGroup) {
                setState((prev) => ({ ...prev, onboardingCompleted: false }))
                return false
            }

            const dashboard = await getGroupDashboard(activeGroup.id)
            const complete = Number(dashboard.setup_completeness) >= 1
            setState((prev) => ({ ...prev, onboardingCompleted: complete }))
            return complete
        } catch {
            setState((prev) => ({ ...prev, onboardingCompleted: false }))
            return false
        }
    }, [])

    const hydrate = useCallback(async () => {
        const stored = await getStoredAuthSession()
        if (!stored) {
            setState({ status: 'unauthenticated', user: null, onboardingCompleted: false })
            return
        }
        try {
            const fresh = await fetchMe()
            await updateStoredAuthUser(fresh)
            setState({ status: 'authenticated', user: fresh, onboardingCompleted: false })
            await refreshOnboardingStatus()
        } catch {
            // session may be expired; http client handled refresh / clear already
            const after = await getStoredAuthSession()
            if (!after) {
                setState({ status: 'unauthenticated', user: null, onboardingCompleted: false })
                return
            }

            setState({ status: 'authenticated', user: after.user, onboardingCompleted: false })
            await refreshOnboardingStatus()
        }
    }, [refreshOnboardingStatus])

    useEffect(() => {
        hydrate()
    }, [hydrate])

    const login = useCallback(async (input: { email: string; password: string }) => {
        const session = await loginRequest(input)
        await saveAuthSession(session)
        setState({ status: 'authenticated', user: session.user, onboardingCompleted: false })
        await refreshOnboardingStatus()
    }, [refreshOnboardingStatus])

    const signUp = useCallback(
        async (input: { email: string; password: string; full_name: string }) => {
            await signUpRequest(input)
            const session = await loginRequest({ email: input.email, password: input.password })
            await saveAuthSession(session)
            setState({ status: 'authenticated', user: session.user, onboardingCompleted: false })
            await refreshOnboardingStatus()
        },
        [refreshOnboardingStatus],
    )

    const logout = useCallback(async () => {
        await clearStoredAuthSession()
        setState({ status: 'unauthenticated', user: null, onboardingCompleted: false })
    }, [])

    const refreshUser = useCallback(async () => {
        const fresh = await fetchMe()
        await updateStoredAuthUser(fresh)
        setState((prev) => ({ ...prev, user: fresh }))
    }, [])

    const markOnboardingCompleted = useCallback(() => refreshOnboardingStatus(), [refreshOnboardingStatus])

    const value = useMemo<AuthContextValue>(
        () => ({
            ...state,
            login,
            signUp,
            logout,
            refreshUser,
            refreshOnboardingStatus,
            markOnboardingCompleted,
        }),
        [state, login, signUp, logout, refreshUser, refreshOnboardingStatus, markOnboardingCompleted],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
    return ctx
}

export type { StoredAuthSession }
