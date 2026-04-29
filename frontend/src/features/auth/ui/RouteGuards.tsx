import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ROUTES } from '../../../app/router/paths'
import { useAuth } from '../../../shared/hooks/useAuth'
import { AppLoader } from '../../../shared/ui/AppLoader'

function getAuthorizedRedirectPath(isOnboardingComplete: boolean | null) {
    return isOnboardingComplete === true
        ? ROUTES.app.dashboard
        : ROUTES.onboarding.modeSelection
}

export function ProtectedRoute({
    children,
    requireCompletedOnboarding = false,
}: {
    children?: ReactNode
    requireCompletedOnboarding?: boolean
}) {
    const { isAuthenticated, isLoading, isOnboardingStatusLoading, isOnboardingComplete } = useAuth()
    const location = useLocation()

    if (isLoading || (isAuthenticated && isOnboardingStatusLoading)) {
        return <AppLoader message="Restoring your session..." />
    }

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.auth.login} replace state={{ from: location }} />
    }

    if (requireCompletedOnboarding && isOnboardingComplete !== true) {
        return <Navigate to={ROUTES.onboarding.modeSelection} replace />
    }

    return children ? <>{children}</> : <Outlet />
}

export function PublicOnlyRoute({ children }: { children?: ReactNode }) {
    const { isAuthenticated, isLoading, isOnboardingStatusLoading, isOnboardingComplete } = useAuth()

    if (isLoading || (isAuthenticated && isOnboardingStatusLoading)) {
        return <AppLoader message="Checking your session..." />
    }

    if (isAuthenticated) {
        return <Navigate to={getAuthorizedRedirectPath(isOnboardingComplete)} replace />
    }

    return children ? <>{children}</> : <Outlet />
}

export function WelcomeRoute({ children }: { children?: ReactNode }) {
    const { isAuthenticated, isLoading, isOnboardingStatusLoading, isOnboardingComplete } = useAuth()

    if (isLoading || (isAuthenticated && isOnboardingStatusLoading)) {
        return <AppLoader message="Preparing your kitchen..." />
    }

    if (isAuthenticated) {
        return <Navigate to={getAuthorizedRedirectPath(isOnboardingComplete)} replace />
    }

    return children ? <>{children}</> : <Outlet />
}

export function OnboardingOnlyRoute({ children }: { children?: ReactNode }) {
    const { isAuthenticated, isLoading, isOnboardingStatusLoading, isOnboardingComplete } = useAuth()
    const location = useLocation()

    if (isLoading || (isAuthenticated && isOnboardingStatusLoading)) {
        return <AppLoader message="Preparing your onboarding..." />
    }

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.auth.login} replace state={{ from: location }} />
    }

    if (isOnboardingComplete === true) {
        return <Navigate to={ROUTES.app.dashboard} replace />
    }

    return children ? <>{children}</> : <Outlet />
}