import { useEffect, useMemo } from 'react'
import { useAuth } from '../../shared/hooks/useAuth'
import {
    finalizeOnboarding,
    useOnboardingFlow,
} from '../../features/onboarding/model/OnboardingFlowContext'
import './OnboardingPage.css'
import {
    AlertIcon,
    CalendarIcon,
    FireIcon,
    HouseIcon,
    ShieldIcon,
} from './OnboardingIcons'

function titleCase(value: string) {
    return value
        .split(/[_-]/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(amount)
}

export function SummaryPage() {
    const { draft, setupSummary, registerStepSubmit, refreshSetupSummary } = useOnboardingFlow()
    const { refreshOnboardingStatus } = useAuth()

    useEffect(() => {
        if (draft.groupId) {
            void refreshSetupSummary()
        }
    }, [draft.groupId, refreshSetupSummary])

    useEffect(() => {
        return registerStepSubmit(async () => {
            if (!draft.groupId) {
                throw new Error('Please create a household before finishing setup.')
            }

            await finalizeOnboarding(draft.groupId, refreshOnboardingStatus)
            await refreshSetupSummary()
        })
    }, [draft.groupId, refreshOnboardingStatus, refreshSetupSummary, registerStepSubmit])

    const readinessPercent = useMemo(() => Math.round((setupSummary?.readiness_score ?? 0) * 100), [setupSummary])

    return (
        <section className="onboarding-page onboarding-page--wide">
            <h1 className="onboarding-page__hero-title">Your Atelier is Ready.</h1>
            <p className="onboarding-page__hero-subtitle">
                Review your household preferences fetched from the backend before activating your kitchen.
            </p>

            <div className="onboarding-page__section onboarding-page__setting-card onboarding-page__summary-card--spacious">
                <div className="onboarding-page__setting-top">
                    <div>
                        <p className="onboarding-page__micro-label">The Setting</p>
                        <h2 className="onboarding-page__setting-name">{draft.householdName || 'My Household'}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#424843' }}>
                            <CalendarIcon className="onboarding-page__icon--sm" style={{ color: '#446347' }} />
                            <span className="onboarding-page__body-small">
                                {draft.planningDuration === 'weekly'
                                    ? '7 Days'
                                    : draft.planningDuration === 'bi-weekly'
                                        ? '14 Days'
                                        : '30 Days'}{' '}
                                ({draft.meals.length} meals/day)
                            </span>
                        </div>
                    </div>

                    <span className="onboarding-page__setting-icon">
                        <HouseIcon className="onboarding-page__icon" />
                    </span>
                </div>
            </div>

            <div className="onboarding-page__section">
                <div className="onboarding-page__summary-inline">
                    <h2 className="onboarding-page__section-title" style={{ marginBottom: 0 }}>
                        Atelier Members
                    </h2>
                    <span className="onboarding-page__text-link">{draft.members.length} total</span>
                </div>

                {draft.members.map((member, index) => (
                    <div key={`summary-member-${index}`} className="onboarding-page__member-summary">
                        <div className="onboarding-page__member-summary-avatar onboarding-page__member-summary-avatar--placeholder">
                            {(member.display_name || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="onboarding-page__member-summary-name">{member.display_name}</h3>
                            <p className="onboarding-page__member-summary-role">
                                {titleCase(member.member_type)} · {member.age} yrs · {titleCase(member.goal_type)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <section className="onboarding-page__section onboarding-page__culinary-card">
                <h2 className="onboarding-page__section-title" style={{ marginBottom: 0 }}>
                    Culinary Profile
                </h2>

                <div className="onboarding-page__culinary-grid">
                    <div>
                        <p className="onboarding-page__restriction-heading">Loved Flavors</p>
                        <div className="onboarding-page__pills" style={{ marginTop: 12 }}>
                            {draft.lovedFlavors.length ? (
                                draft.lovedFlavors.map((item) => (
                                    <span key={item} className="onboarding-page__diet-pill">
                                        {item}
                                    </span>
                                ))
                            ) : (
                                <span className="onboarding-page__body-small">None selected</span>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="onboarding-page__restriction-heading">Restrictions</p>
                        <div style={{ marginTop: 12 }}>
                            {draft.selectedRestrictions.length ? (
                                draft.selectedRestrictions.map((item) => (
                                    <span key={item} className="onboarding-page__restriction-pill">
                                        <AlertIcon className="onboarding-page__icon--xs" />
                                        {titleCase(item)}
                                    </span>
                                ))
                            ) : (
                                <span className="onboarding-page__body-small">None selected</span>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="onboarding-page__restriction-heading">Spice Palette</p>
                        <div className="onboarding-page__spice-row" style={{ marginTop: 12 }}>
                            {[1, 2, 3].map((level) => {
                                const activeLevel =
                                    draft.spiceTolerance === 'hot'
                                        ? 3
                                        : draft.spiceTolerance === 'medium'
                                            ? 2
                                            : 1

                                return (
                                    <FireIcon
                                        key={level}
                                        className={`onboarding-page__icon--xs ${level > activeLevel ? 'onboarding-page__fire-muted' : ''}`}
                                        style={{ color: '#9b4f0f' }}
                                    />
                                )
                            })}
                            <span className="onboarding-page__spice-badge">{titleCase(draft.spiceTolerance)}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="onboarding-page__section onboarding-page__budget-card onboarding-page__summary-card--spacious">
                <div className="onboarding-page__budget-top">
                    <div>
                        <p className="onboarding-page__micro-label">Budget Snapshot</p>
                        <div className="onboarding-page__budget-value">
                            {formatCurrency(draft.budgetAmount)}
                        </div>
                    </div>
                    <span className="onboarding-page__budget-optimized">
                        <ShieldIcon className="onboarding-page__icon--xs" />
                        {readinessPercent}% Ready
                    </span>
                </div>

                <p className="onboarding-page__body-small" style={{ maxWidth: 260 }}>
                    Preferred cuisines: {draft.preferredCuisines.join(', ') || 'Not selected'}
                </p>
            </section>
        </section>
    )
}
