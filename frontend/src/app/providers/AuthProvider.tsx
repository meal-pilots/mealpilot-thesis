import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from 'react'
import type { User } from '../../entities/user/model/types'
import { authApi, type LogInInput, type SignUpInput } from '../../features/auth/api/authApi'
import { dashboardApi } from '../../features/dashboard/api/dashboardApi'
import {
    clearStoredAuthSession,
    getStoredAuthSession,
    saveAuthSession,
    subscribeToAuthSessionCleared,
    updateStoredAuthUser,
} from '../../shared/lib/auth-storage'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: PropsWithChildren) {
    const [user, setUser] = useState<User | null>(() => getStoredAuthSession()?.user ?? null)
    const [isLoading, setIsLoading] = useState(true)
    const [isOnboardingStatusLoading, setIsOnboardingStatusLoading] = useState(false)
    const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null)

    const refreshUser = useCallback(async () => {
        try {
            const currentUser = await authApi.me()
            setUser(currentUser)
            updateStoredAuthUser(currentUser)
            return currentUser
        } catch {
            clearStoredAuthSession()
            setUser(null)
            setIsOnboardingComplete(null)
            return null
        }
    }, [])

    const refreshOnboardingStatus = useCallback(async () => {
        const storedSession = getStoredAuthSession()

        if (!storedSession) {
            setIsOnboardingComplete(null)
            return null
        }

        setIsOnboardingStatusLoading(true)

        try {
            const activeGroup = await dashboardApi.getActiveGroup()

            if (!activeGroup) {
                setIsOnboardingComplete(false)
                return false
            }

            const dashboard = await dashboardApi.getDashboard(activeGroup.id)
            const complete = Number(dashboard.setup_completeness) >= 1

            setIsOnboardingComplete(complete)
            return complete
        } catch {
            setIsOnboardingComplete(false)
            return false
        } finally {
            setIsOnboardingStatusLoading(false)
        }
    }, [])

    const handleAuthSessionCleared = useCallback(() => {
        setUser(null)
        setIsOnboardingComplete(null)
        setIsOnboardingStatusLoading(false)
        setIsLoading(false)
    }, [])

    useEffect(() => {
        return subscribeToAuthSessionCleared(handleAuthSessionCleared)
    }, [handleAuthSessionCleared])

    useEffect(() => {
        let isMounted = true

        const bootstrap = async () => {
            const storedSession = getStoredAuthSession()

            if (!storedSession) {
                if (isMounted) {
                    setIsLoading(false)
                }
                return
            }

            const nextUser = await refreshUser()

            if (nextUser) {
                await refreshOnboardingStatus()
            }

            if (isMounted) {
                setIsLoading(false)
            }
        }

        void bootstrap()

        return () => {
            isMounted = false
        }
    }, [refreshUser, refreshOnboardingStatus])

    const logIn = useCallback(
        async (input: LogInInput & { remember: boolean }) => {
            const session = await authApi.logIn(input)
            saveAuthSession(session, input.remember)
            setUser(session.user)
            await refreshOnboardingStatus()
            return session
        },
        [refreshOnboardingStatus],
    )

    const signUp = useCallback(
        async (input: SignUpInput & { remember: boolean }) => {
            await authApi.signUp(input)

            const session = await authApi.logIn({
                email: input.email,
                password: input.password,
            })

            saveAuthSession(session, input.remember)
            setUser(session.user)
            await refreshOnboardingStatus()
            return session
        },
        [refreshOnboardingStatus],
    )

    const logOut = useCallback(async () => {
        try {
            await authApi.logOut()
        } catch {
            // ignore logout API failures and always clear local session
        } finally {
            clearStoredAuthSession()
            setUser(null)
            setIsOnboardingComplete(null)
        }
    }, [])

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isAuthenticated: Boolean(user),
            isLoading,
            isOnboardingStatusLoading,
            isOnboardingComplete,
            logIn,
            signUp,
            logOut,
            refreshUser,
            refreshOnboardingStatus,
        }),
        [
            user,
            isLoading,
            isOnboardingStatusLoading,
            isOnboardingComplete,
            logIn,
            signUp,
            logOut,
            refreshUser,
            refreshOnboardingStatus,
        ],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
