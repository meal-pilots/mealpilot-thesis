import { createContext } from 'react'
import type { User } from '../../entities/user/model/types'
import type { LogInInput, SignUpInput } from '../../features/auth/api/authApi'
import type { StoredAuthSession } from '../../shared/types/auth'

export interface AuthContextValue {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    isOnboardingStatusLoading: boolean
    isOnboardingComplete: boolean | null
    logIn: (input: LogInInput & { remember: boolean }) => Promise<StoredAuthSession>
    signUp: (input: SignUpInput & { remember: boolean }) => Promise<StoredAuthSession>
    logOut: () => Promise<void>
    refreshUser: () => Promise<User | null>
    refreshOnboardingStatus: () => Promise<boolean | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)