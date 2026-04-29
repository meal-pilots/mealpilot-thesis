import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../app/router/paths'
import { dashboardApi, type ActiveGroupSummary } from '../../../features/dashboard/api/dashboardApi'
import { planningApi, type GenerateMealPlanInput, type OptimizationFocus } from '../../../features/planning/api/planningApi'
import { getApiErrorMessage } from '../../../shared/lib/get-api-error-message'
import { AppLoader } from '../../../shared/ui/AppLoader'
import {
    BellIcon,
    ClockIcon,
    FireIcon,
    PriceTagIcon,
    SparkIcon,
    TrendUpBarsIcon,
} from '../AppIcons'
import '../AppPages.css'

type BudgetStrictness = 'flexible' | 'balanced' | 'strict'
type VarietyLevel = 'repeat' | 'balanced' | 'exploratory'
type FocusKey = OptimizationFocus

type FocusOption = {
    id: FocusKey
    title: string
    icon: typeof PriceTagIcon
}

const mealOptions = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const
const focusOptions: FocusOption[] = [
    { id: 'budget', title: 'Best Price', icon: PriceTagIcon },
    { id: 'nutrition', title: 'Nutrition', icon: TrendUpBarsIcon },
    { id: 'taste', title: 'Taste Fit', icon: SparkIcon },
    { id: 'speed', title: 'Max Speed', icon: FireIcon },
]

const varietyLabelMap: Record<VarietyLevel, string> = {
    repeat: 'Repeat Favorites',
    balanced: 'Balanced',
    exploratory: 'Exploratory',
}

function toIsoDate(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function mapBudgetStrictness(value: BudgetStrictness): GenerateMealPlanInput['budget_strictness'] {
    if (value === 'balanced') {
        return 'medium'
    }

    return value
}

function mapCookingStrictness(cookingTime: number): GenerateMealPlanInput['cooking_time_strictness'] {
    if (cookingTime <= 30) {
        return 'strict'
    }

    if (cookingTime <= 45) {
        return 'medium'
    }

    return 'flexible'
}

function mapVariety(value: VarietyLevel): GenerateMealPlanInput['variety_level'] {
    if (value === 'repeat') {
        return 'low'
    }

    if (value === 'balanced') {
        return 'medium'
    }

    return 'high'
}

function mapRepetitionAllowed(value: VarietyLevel) {
    if (value === 'repeat') {
        return 4
    }

    if (value === 'balanced') {
        return 2
    }

    return 0
}

export function GeneratePlanPage() {
    const navigate = useNavigate()

    const [activeGroup, setActiveGroup] = useState<ActiveGroupSummary | null>(null)
    const [isBootstrapping, setIsBootstrapping] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const [daysCount, setDaysCount] = useState(5)
    const [selectedMeals, setSelectedMeals] = useState<string[]>(['Breakfast', 'Dinner'])
    const [budgetStrictness, setBudgetStrictness] = useState<BudgetStrictness>('balanced')
    const [cookingTime, setCookingTime] = useState(45)
    const [varietyLevel, setVarietyLevel] = useState<VarietyLevel>('exploratory')
    const [focuses, setFocuses] = useState<FocusKey[]>(['budget', 'taste'])

    useEffect(() => {
        let isMounted = true

        async function loadContext() {
            setIsBootstrapping(true)
            setErrorMessage('')

            try {
                const group = await dashboardApi.getActiveGroup()

                if (isMounted) {
                    setActiveGroup(group)
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load your active household.'))
                }
            } finally {
                if (isMounted) {
                    setIsBootstrapping(false)
                }
            }
        }

        void loadContext()

        return () => {
            isMounted = false
        }
    }, [])

    const daysRangePercent = useMemo(() => `${((daysCount - 1) / 6) * 100}%`, [daysCount])
    const budgetRangePercent = useMemo(() => {
        const value = budgetStrictness === 'flexible' ? 0 : budgetStrictness === 'balanced' ? 50 : 100
        return `${value}%`
    }, [budgetStrictness])
    const cookingRangePercent = useMemo(() => `${((cookingTime - 15) / 105) * 100}%`, [cookingTime])
    const varietyRangePercent = useMemo(() => {
        const value = varietyLevel === 'repeat' ? 0 : varietyLevel === 'balanced' ? 50 : 100
        return `${value}%`
    }, [varietyLevel])

    function toggleMeal(meal: string) {
        setSelectedMeals((current) =>
            current.includes(meal) ? current.filter((item) => item !== meal) : [...current, meal],
        )
    }

    function toggleFocus(id: FocusKey) {
        setFocuses((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
    }

    async function handleGenerate() {
        if (!activeGroup) {
            setErrorMessage('Please complete onboarding and activate a household first.')
            return
        }

        if (!selectedMeals.length) {
            setErrorMessage('Select at least one daily meal before generating a plan.')
            return
        }

        if (!focuses.length) {
            setErrorMessage('Choose at least one optimization focus.')
            return
        }

        setIsSubmitting(true)
        setErrorMessage('')

        try {
            const payload: GenerateMealPlanInput = {
                start_date: toIsoDate(new Date()),
                days_count: daysCount,
                meals_per_day: selectedMeals.length,
                include_snacks: selectedMeals.includes('Snacks'),
                budget_strictness: mapBudgetStrictness(budgetStrictness),
                cooking_time_strictness: mapCookingStrictness(cookingTime),
                variety_level: mapVariety(varietyLevel),
                repetition_allowed: mapRepetitionAllowed(varietyLevel),
                optimization_focus: focuses,
            }

            const response = await planningApi.generateMealPlan(activeGroup.id, payload)
            navigate(ROUTES.app.mealPlans.details(response.meal_plan_id))
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error, 'Unable to generate a meal plan right now.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isBootstrapping) {
        return <AppLoader message="Preparing the planner..." />
    }

    if (!activeGroup) {
        return (
            <section className="plan-page plan-page--generate">
                <section className="app-page__section">
                    <article className="app-page__detail-card app-page__error-card">
                        <p className="app-page__eyebrow">Planner</p>
                        <h1 className="app-page__title">You need an active household first</h1>
                        <p className="app-page__body">
                            The planner uses your active household, member setup, and preferences to generate a weekly meal plan.
                        </p>
                        {errorMessage ? <p className="app-page__body">{errorMessage}</p> : null}
                        <Link className="app-page__button" to={ROUTES.onboarding.modeSelection}>
                            Complete onboarding
                        </Link>
                    </article>
                </section>
            </section>
        )
    }

    return (
        <section className="plan-page plan-page--generate">
            <section className="plan-page__hero plan-page__hero--editorial">
                <h1 className="plan-page__mega-title">
                    Curate Your <span>Next Journey.</span>
                </h1>
                <p className="plan-page__hero-copy">
                    Generating for <strong>{activeGroup.name}</strong>. Define the rhythm of your kitchen and we&apos;ll compose the plan around your household.
                </p>
            </section>

            {errorMessage ? (
                <section className="app-page__section" style={{ marginTop: 0 }}>
                    <article className="app-page__detail-card app-page__error-card">
                        <p className="app-page__body">{errorMessage}</p>
                    </article>
                </section>
            ) : null}

            <div className="plan-page__stack">
                <section className="plan-page__block">
                    <div className="plan-page__section-heading plan-page__section-heading--metric">
                        <div>
                            <p className="plan-page__eyebrow">Duration</p>
                            <h2 className="plan-page__headline">Number of Days</h2>
                        </div>
                        <span className="plan-page__metric-value">{String(daysCount).padStart(2, '0')}</span>
                    </div>

                    <div className="plan-page__card plan-page__card--soft">
                        <input
                            className="plan-page__range"
                            type="range"
                            min="1"
                            max="7"
                            step="1"
                            value={daysCount}
                            onChange={(event) => setDaysCount(Number(event.target.value))}
                            style={{ ['--range-percent' as string]: daysRangePercent }}
                        />
                        <div className="plan-page__range-labels plan-page__range-labels--compact">
                            <span>1 Day</span>
                            <span>3 Days</span>
                            <span>5 Days</span>
                            <span>7 Days</span>
                        </div>
                    </div>
                </section>

                <section className="plan-page__block">
                    <div className="plan-page__section-heading">
                        <div>
                            <p className="plan-page__eyebrow">Coverage</p>
                            <h2 className="plan-page__headline">Daily Meals</h2>
                        </div>
                    </div>

                    <div className="plan-page__chips-row">
                        {mealOptions.map((meal) => {
                            const isSelected = selectedMeals.includes(meal)

                            return (
                                <button
                                    key={meal}
                                    type="button"
                                    className={`plan-page__pill ${isSelected ? 'plan-page__pill--active' : ''}`}
                                    onClick={() => toggleMeal(meal)}
                                >
                                    {meal}
                                </button>
                            )
                        })}
                    </div>
                </section>

                <section className="plan-page__dual-grid">
                    <article className="plan-page__card plan-page__card--soft plan-page__setting-card">
                        <div className="plan-page__setting-head">
                            <span className="plan-page__setting-icon">
                                <PriceTagIcon className="plan-page__icon" />
                            </span>
                            <h3 className="plan-page__setting-title">Budget Strictness</h3>
                        </div>

                        <input
                            className="plan-page__range"
                            type="range"
                            min="0"
                            max="2"
                            step="1"
                            value={budgetStrictness === 'flexible' ? 0 : budgetStrictness === 'balanced' ? 1 : 2}
                            onChange={(event) => {
                                const nextValue = Number(event.target.value)
                                setBudgetStrictness(nextValue === 0 ? 'flexible' : nextValue === 1 ? 'balanced' : 'strict')
                            }}
                            style={{ ['--range-percent' as string]: budgetRangePercent }}
                        />
                        <div className="plan-page__range-labels">
                            <span>Flexible</span>
                            <span>Strict</span>
                        </div>
                    </article>

                    <article className="plan-page__card plan-page__card--soft plan-page__setting-card">
                        <div className="plan-page__setting-head">
                            <span className="plan-page__setting-icon">
                                <ClockIcon className="plan-page__icon" />
                            </span>
                            <h3 className="plan-page__setting-title">Cooking Time</h3>
                        </div>

                        <input
                            className="plan-page__range"
                            type="range"
                            min="15"
                            max="120"
                            step="15"
                            value={cookingTime}
                            onChange={(event) => setCookingTime(Number(event.target.value))}
                            style={{ ['--range-percent' as string]: cookingRangePercent }}
                        />
                        <div className="plan-page__range-labels">
                            <span>15 Min</span>
                            <span>2 Hours</span>
                        </div>
                    </article>
                </section>

                <section className="plan-page__block">
                    <article className="plan-page__card plan-page__card--ambient plan-page__setting-card">
                        <div className="plan-page__section-heading">
                            <div>
                                <p className="plan-page__eyebrow">Curation Style</p>
                                <h2 className="plan-page__headline">Variety Level</h2>
                            </div>
                            <span className="plan-page__floating-value">{varietyLabelMap[varietyLevel]}</span>
                        </div>

                        <input
                            className="plan-page__range"
                            type="range"
                            min="0"
                            max="2"
                            step="1"
                            value={varietyLevel === 'repeat' ? 0 : varietyLevel === 'balanced' ? 1 : 2}
                            onChange={(event) => {
                                const nextValue = Number(event.target.value)
                                setVarietyLevel(nextValue === 0 ? 'repeat' : nextValue === 1 ? 'balanced' : 'exploratory')
                            }}
                            style={{ ['--range-percent' as string]: varietyRangePercent }}
                        />
                        <div className="plan-page__range-labels">
                            <span>Repeat</span>
                            <span>Balanced</span>
                            <span>Explore</span>
                        </div>
                    </article>
                </section>

                <section className="plan-page__block">
                    <div className="plan-page__section-heading">
                        <div>
                            <p className="plan-page__eyebrow">Optimization</p>
                            <h2 className="plan-page__headline">Focus Areas</h2>
                        </div>
                    </div>

                    <div className="plan-page__focus-grid">
                        {focusOptions.map((option) => {
                            const Icon = option.icon
                            const active = focuses.includes(option.id)

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`plan-page__focus-card ${active ? 'plan-page__focus-card--active' : ''}`}
                                    onClick={() => toggleFocus(option.id)}
                                >
                                    <span className="plan-page__focus-main">
                                        <Icon className="plan-page__focus-icon" />
                                        <span className="plan-page__focus-title">{option.title}</span>
                                    </span>
                                    <span className={`plan-page__focus-check ${active ? 'plan-page__focus-check--active' : ''}`}>
                                        {active ? '✓' : ''}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </section>
            </div>

            <div className="plan-page__footer-cta">
                <button
                    type="button"
                    className="app-page__button plan-page__primary-link"
                    onClick={handleGenerate}
                    disabled={isSubmitting}
                >
                    <BellIcon className="plan-page__inline-icon" />
                    <span>{isSubmitting ? 'Generating...' : 'Generate Plan'}</span>
                </button>
            </div>
        </section>
    )
}
