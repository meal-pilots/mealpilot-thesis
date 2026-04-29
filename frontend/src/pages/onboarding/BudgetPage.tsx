import { useEffect, useMemo } from 'react'
import { saveBudgetFromDraft, useOnboardingFlow } from '../../features/onboarding/model/OnboardingFlowContext'
import './OnboardingPage.css'
import {
    HeartPulseIcon,
    PlusIcon,
    RestaurantIcon,
    SavingsIcon,
    TimerIcon,
} from './OnboardingIcons'

const priorityOptions = [
    {
        id: 'price',
        title: 'Price',
        description: 'Prioritizes bulk buys and seasonal discounts.',
        icon: SavingsIcon,
    },
    {
        id: 'nutrition',
        title: 'Nutrition',
        description: 'Focus on macro balance and organic sourcing.',
        icon: HeartPulseIcon,
    },
    {
        id: 'taste',
        title: 'Taste',
        description: 'Complexity of flavors and premium ingredients.',
        icon: RestaurantIcon,
    },
    {
        id: 'speed',
        title: 'Speed',
        description: 'One-pot meals and under 20-minute prep.',
        icon: TimerIcon,
    },
] as const

const cuisineOptions = [
    'kazakh',
    'central_asian',
    'mediterranean',
    'japanese',
    'thai',
    'indian',
    'latin_american',
] as const

export function BudgetPage() {
    const { draft, setDraft, registerStepSubmit, refreshSetupSummary } = useOnboardingFlow()

    const budgetPercent = useMemo(
        () => `${((draft.budgetAmount - 10000) / 190000) * 100}%`,
        [draft.budgetAmount],
    )

    useEffect(() => {
        return registerStepSubmit(async () => {
            if (!draft.groupId) {
                throw new Error('Please create your household first.')
            }

            if (draft.budgetAmount <= 0) {
                throw new Error('Please enter a valid budget.')
            }

            await saveBudgetFromDraft(draft.groupId, draft)
            await refreshSetupSummary()
        })
    }, [draft, registerStepSubmit, refreshSetupSummary])

    function toggleCuisine(cuisine: string) {
        setDraft((current) => ({
            ...current,
            preferredCuisines: current.preferredCuisines.includes(cuisine)
                ? current.preferredCuisines.filter((item) => item !== cuisine)
                : [...current.preferredCuisines, cuisine],
        }))
    }

    return (
        <section className="onboarding-page onboarding-page--wide">
            <p className="onboarding-page__intro">
                Every kitchen has its own rhythm. Define yours by balancing cost, nutrition, and the cultural flavors that inspire your weekly harvest.
            </p>

            <div className="onboarding-page__section onboarding-page__budget-card">
                <div className="onboarding-page__budget-top">
                    <div>
                        <h2 className="onboarding-page__panel-title">Weekly Investment</h2>
                        <p className="onboarding-page__budget-caption">Set your grocery budget limit</p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div className="onboarding-page__budget-value">{draft.budgetAmount.toLocaleString()}</div>
                        <div className="onboarding-page__budget-subtext">
                            {draft.currencyCode} / {draft.budgetPeriodType}
                        </div>
                    </div>
                </div>

                <input
                    type="range"
                    min="10000"
                    max="200000"
                    step="1000"
                    value={draft.budgetAmount}
                    onChange={(event) =>
                        setDraft((current) => ({
                            ...current,
                            budgetAmount: Number(event.target.value),
                        }))
                    }
                    className="onboarding-page__slider"
                    style={{ ['--range-percent' as string]: budgetPercent }}
                />

                <div className="onboarding-page__legend">
                    <span>10k</span>
                    <span>105k</span>
                    <span>200k</span>
                </div>
            </div>

            <div className="onboarding-page__section">
                <h2 className="onboarding-page__section-title">Strategic Priorities</h2>
                <div className="onboarding-page__card-grid">
                    {priorityOptions.map((priority) => {
                        const Icon = priority.icon
                        const selected = draft.selectedPriority === priority.id

                        return (
                            <button
                                key={priority.id}
                                type="button"
                                className={`onboarding-page__priority ${selected ? 'onboarding-page__priority--selected' : ''}`}
                                onClick={() =>
                                    setDraft((current) => ({
                                        ...current,
                                        selectedPriority: priority.id,
                                    }))
                                }
                            >
                                <Icon className="onboarding-page__icon" style={{ color: '#446347' }} />
                                <div className="onboarding-page__priority-title">{priority.title}</div>
                                <p className="onboarding-page__body-small">{priority.description}</p>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="onboarding-page__section onboarding-page__toggle-card">
                <h2 className="onboarding-page__panel-title">Repeat Tolerance</h2>
                <div className="onboarding-page__toggle-row" style={{ marginTop: 18 }}>
                    <span className="onboarding-page__selectable-label">Daily Variety</span>
                    <button
                        type="button"
                        className="onboarding-page__switch"
                        onClick={() =>
                            setDraft((current) => ({
                                ...current,
                                dailyVariety: !current.dailyVariety,
                            }))
                        }
                        style={{
                            justifyContent: draft.dailyVariety ? 'flex-end' : 'flex-start',
                            background: draft.dailyVariety ? '#446347' : '#c2c8c1',
                        }}
                        aria-pressed={draft.dailyVariety}
                    >
                        <span className="onboarding-page__switch-thumb" />
                    </button>
                </div>
            </div>

            <div className="onboarding-page__section">
                <h2 className="onboarding-page__section-title">Cuisine Preferences</h2>
                <div className="onboarding-page__chip-row">
                    {cuisineOptions.map((cuisine) => {
                        const selected = draft.preferredCuisines.includes(cuisine)

                        return (
                            <button
                                key={cuisine}
                                type="button"
                                className={`onboarding-page__chip ${selected ? 'onboarding-page__chip--selected' : ''}`}
                                onClick={() => toggleCuisine(cuisine)}
                            >
                                {cuisine.replace('_', ' ')}
                            </button>
                        )
                    })}

                    <button type="button" className="onboarding-page__chip onboarding-page__chip--explore" disabled>
                        <PlusIcon className="onboarding-page__icon--xs" />
                        Explore More
                    </button>
                </div>
            </div>
        </section>
    )
}
