import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppLoader } from '../../shared/ui/AppLoader'
import { useOnboardingFlow } from '../../features/onboarding/model/OnboardingFlowContext'
import { ROUTES } from '../router/paths'
import './OnboardingLayout.css'

type OnboardingStep = {
    path: string
    title: string
    description: string
    nextLabel?: string
}

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        path: ROUTES.onboarding.modeSelection,
        title: 'Model',
        description: 'Choose your household size',
    },
    {
        path: ROUTES.onboarding.createHousehold,
        title: 'Create Household',
        description: 'Set your household cadence',
    },
    {
        path: ROUTES.onboarding.members,
        title: 'Add Members',
        description: 'Define who is at the table',
    },
    {
        path: ROUTES.onboarding.preferences,
        title: 'Preferences',
        description: 'Teach the planner your taste',
    },
    {
        path: ROUTES.onboarding.budget,
        title: 'Priorities',
        description: 'Balance cost, taste, and speed',
    },
    {
        path: ROUTES.onboarding.summary,
        title: 'Finish',
        description: 'Review before entering the kitchen',
        nextLabel: 'Enter the Kitchen',
    },
]

function ArrowLeftIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="onboarding-layout__icon">
            <path
                d="M15 6L9 12L15 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function ChevronLeftIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="onboarding-layout__icon onboarding-layout__icon--sm">
            <path
                d="M14.5 7L9.5 12L14.5 17"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function ChevronRightIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="onboarding-layout__icon onboarding-layout__icon--sm">
            <path
                d="M9.5 7L14.5 12L9.5 17"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function OnboardingLayout() {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const { isBootstrapping, isSubmitting, errorMessage, submitCurrentStep } = useOnboardingFlow()

    const currentIndex = ONBOARDING_STEPS.findIndex((step) => step.path === pathname)
    const safeIndex = currentIndex >= 0 ? currentIndex : 0
    const currentStep = ONBOARDING_STEPS[safeIndex]
    const previousPath = safeIndex === 0 ? ROUTES.welcome : ONBOARDING_STEPS[safeIndex - 1].path
    const nextPath =
        safeIndex === ONBOARDING_STEPS.length - 1
            ? ROUTES.app.dashboard
            : ONBOARDING_STEPS[safeIndex + 1].path
    const progressPercent = ((safeIndex + 1) / ONBOARDING_STEPS.length) * 100

    async function handleContinue() {
        const canProceed = await submitCurrentStep()

        if (canProceed) {
            navigate(nextPath)
        }
    }

    if (isBootstrapping) {
        return <AppLoader message="Loading your onboarding progress..." />
    }

    return (
        <div className="onboarding-layout">
            <header className="onboarding-layout__header">
                <div className="onboarding-layout__header-inner">
                    <Link
                        to={previousPath}
                        className="onboarding-layout__brand-link"
                        aria-label="Go to previous step"
                    >
                        <ArrowLeftIcon />
                    </Link>

                    <Link to={ROUTES.welcome} className="onboarding-layout__brand">
                        The Editorial Kitchen
                    </Link>
                </div>
            </header>

            <div className="onboarding-layout__stepbar-wrap">
                <div className="onboarding-layout__stepbar">
                    <div className="onboarding-layout__step-row">
                        <span className="onboarding-layout__step-count">
                            Step {String(safeIndex + 1).padStart(2, '0')} of {String(ONBOARDING_STEPS.length).padStart(2, '0')}:
                        </span>
                        <span className="onboarding-layout__step-title">{currentStep.title}</span>
                    </div>

                    <div className="onboarding-layout__progress-track" aria-hidden="true">
                        <div
                            className="onboarding-layout__progress-fill"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            <main className="onboarding-layout__main">
                <div className="onboarding-layout__shell">
                    {errorMessage ? <div className="onboarding-layout__error">{errorMessage}</div> : null}
                    <Outlet />
                </div>
            </main>

            <nav className="onboarding-layout__footer">
                <div className="onboarding-layout__footer-inner">
                    <Link to={previousPath} className="onboarding-layout__nav-link">
                        <ChevronLeftIcon />
                        <span>Back</span>
                    </Link>

                    <button
                        type="button"
                        className="onboarding-layout__nav-button"
                        onClick={() => void handleContinue()}
                        disabled={isSubmitting}
                    >
                        <span>{isSubmitting ? 'Saving...' : currentStep.nextLabel ?? 'Continue'}</span>
                        <ChevronRightIcon />
                    </button>
                </div>
            </nav>

            <div className="onboarding-layout__ghost" aria-hidden="true" />
        </div>
    )
}
