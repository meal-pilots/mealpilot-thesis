import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/paths'
import { planningApi, type MealPlanDetailDto, type NutritionAnalyticsDto } from '../../../features/planning/api/planningApi'
import { getApiErrorMessage } from '../../../shared/lib/get-api-error-message'
import { AppLoader } from '../../../shared/ui/AppLoader'
import {
    BrainIcon,
    CheckBadgeIcon,
    ChevronRightIcon,
    CoinStackIcon,
    PantryIcon,
    ProteinBoltIcon,
    SparkIcon,
    TrendUpBarsIcon,
} from '../AppIcons'
import '../AppPages.css'

function formatNumber(value: string | number | null | undefined) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
        return '—'
    }
    return Math.round(numeric).toLocaleString()
}

function formatPercent(value: string | number | null | undefined) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
        return '—'
    }
    const scaled = numeric <= 1 ? numeric * 100 : numeric
    return `${Math.round(scaled)}%`
}

function nutrientIcon(state: string) {
    if (state === 'Optimal') {
        return SparkIcon
    }

    if (state === 'Excelling') {
        return CoinStackIcon
    }

    if (state === 'Low') {
        return BrainIcon
    }

    return ProteinBoltIcon
}

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
}

export function NutritionAnalyticsPage() {
    const { mealPlanId } = useParams<{ mealPlanId: string }>()
    const [analytics, setAnalytics] = useState<NutritionAnalyticsDto | null>(null)
    const [mealPlanDetail, setMealPlanDetail] = useState<MealPlanDetailDto | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        if (!mealPlanId) {
            setIsLoading(false)
            setErrorMessage('Meal plan was not found.')
            return
        }

        let isMounted = true

        async function loadNutritionAnalytics() {
            if (!mealPlanId) {
                setIsLoading(false)
                setErrorMessage('Meal plan was not found.')
                return
            }

            setIsLoading(true)
            setErrorMessage('')

            try {
                const [nutritionData, detail] = await Promise.all([
                    planningApi.getNutritionAnalytics(mealPlanId),
                    planningApi.getMealPlanDetail(mealPlanId),
                ])

                if (!isMounted) {
                    return
                }

                setAnalytics(nutritionData)
                setMealPlanDetail(detail)
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load nutrition analytics.'))
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void loadNutritionAnalytics()

        return () => {
            isMounted = false
        }
    }, [mealPlanId])

    const energyConsumed = useMemo(() => Number(mealPlanDetail?.summary.estimated_total_calories ?? 0), [mealPlanDetail])

    const energyTarget = useMemo(() => {
        const fit = Number(analytics?.weekly_target_fit ?? 0)
        if (!fit || Number.isNaN(fit) || fit <= 0) {
            return 0
        }
        const normalizedFit = fit <= 1 ? fit : fit / 100
        return normalizedFit > 0 ? energyConsumed / normalizedFit : 0
    }, [analytics, energyConsumed])

    const energyProgress = useMemo(() => {
        if (!energyTarget) {
            return 0
        }
        return Math.min((energyConsumed / energyTarget) * 100, 100)
    }, [energyConsumed, energyTarget])

    const macros = useMemo(() => {
        if (!analytics) {
            return []
        }

        const protein = Number(analytics.macro_balance.protein_g)
        const fat = Number(analytics.macro_balance.fat_g)
        const carb = Number(analytics.macro_balance.carb_g)
        const total = protein + fat + carb || 1

        return [
            { name: 'Protein', percent: Math.round((protein / total) * 100), status: 'Tracked', grams: `${formatNumber(protein)}g` },
            { name: 'Carbs', percent: Math.round((carb / total) * 100), status: 'Tracked', grams: `${formatNumber(carb)}g` },
            { name: 'Fats', percent: Math.round((fat / total) * 100), status: 'Tracked', grams: `${formatNumber(fat)}g` },
        ]
    }, [analytics])

    const micronutrients = useMemo(() => {
        if (!analytics) {
            return []
        }

        return Object.entries(analytics.micronutrients)
            .slice(0, 6)
            .map(([name, value]) => ({
                id: name,
                name,
                state: 'Tracked',
                description: `${formatNumber(value)} total across the selected plan.`,
            }))
    }, [analytics])

    if (isLoading) {
        return <AppLoader message="Loading nutrition analytics..." />
    }

    if (!mealPlanId || !analytics || !mealPlanDetail) {
        return (
            <section className="atelier-page atelier-page--nutrition">
                <section className="atelier-page__card atelier-page__hero-card">
                    <h1 className="atelier-page__headline">We couldn&apos;t load nutrition analytics</h1>
                    <p className="atelier-page__body-copy atelier-page__body-copy--centered">{errorMessage || 'This meal plan is unavailable.'}</p>
                    <Link className="atelier-page__button atelier-page__button--wide" to={ROUTES.app.mealPlans.current}>
                        Back to weekly plan
                    </Link>
                </section>
            </section>
        )
    }

    return (
        <section className="atelier-page atelier-page--nutrition">
            <section className="atelier-page__hero atelier-page__hero--nutrition">
                <h1 className="atelier-page__display atelier-page__display--compact">Household Nutrition</h1>
                <p className="atelier-page__body-copy">
                    {mealPlanDetail.summary.title} is pacing toward your nutritional targets with {formatPercent(analytics.weekly_target_fit)} precision.
                </p>
            </section>

            <section className="atelier-page__card atelier-page__summary-card">
                <p className="atelier-page__eyebrow">Weekly Harvest Goal</p>
                <h2 className="atelier-page__headline">Energy Consumption</h2>
                <div className="atelier-page__nutrition-energy-row">
                    <div>
                        <p className="atelier-page__summary-value">{formatNumber(energyConsumed)}</p>
                        <p className="atelier-page__caption">Consumed kcal</p>
                    </div>
                    <div className="atelier-page__energy-target">
                        <strong>{formatNumber(energyTarget)}</strong>
                        <span className="atelier-page__caption">Weekly target</span>
                    </div>
                </div>
                <div className="atelier-page__progress">
                    <span className="atelier-page__progress-fill" style={{ width: `${energyProgress}%` }} />
                </div>
                <div className="atelier-page__shopping-inline-note atelier-page__shopping-inline-note--plain">
                    <CheckBadgeIcon className="atelier-page__mini-icon atelier-page__mini-icon--green" />
                    <p className="atelier-page__caption">
                        Weekly target fit currently sits at <strong>{formatPercent(analytics.weekly_target_fit)}</strong>.
                    </p>
                </div>
            </section>

            <section className="atelier-page__note-card">
                <div className="atelier-page__group-heading">
                    <span className="atelier-page__mini-icon-badge atelier-page__mini-icon-badge--dark">
                        <SparkIcon className="atelier-page__mini-icon" />
                    </span>
                    <h2 className="atelier-page__headline atelier-page__headline--inverse">Nutritionist&apos;s Note</h2>
                </div>
                <p className="atelier-page__note-copy">
                    Macronutrients are distributed across the week, while member fit stays visible for each household profile below.
                </p>
                <button type="button" className="atelier-page__pill-button atelier-page__pill-button--soft" disabled>
                    Adjust Preferences
                </button>
            </section>

            <section className="atelier-page__card atelier-page__chart-card">
                <h2 className="atelier-page__headline">Macronutrient Balance</h2>
                <div className="atelier-page__macro-stack">
                    {macros.map((macro) => (
                        <div key={macro.name} className="atelier-page__macro-row-card">
                            <div className="atelier-page__macro-head">
                                <div className="atelier-page__group-heading">
                                    <span className="atelier-page__macro-dot" />
                                    <span className="atelier-page__item-title atelier-page__item-title--small">{macro.name}</span>
                                </div>
                                <strong className="atelier-page__macro-percent">{macro.percent}%</strong>
                            </div>
                            <div className="atelier-page__progress atelier-page__progress--thin">
                                <span className="atelier-page__progress-fill" style={{ width: `${macro.percent}%` }} />
                            </div>
                            <div className="atelier-page__macro-foot">
                                <span className="atelier-page__caption atelier-page__caption--strong">{macro.status}</span>
                                <span className="atelier-page__caption">{macro.grams}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="atelier-page__group">
                <div className="atelier-page__group-header">
                    <h2 className="atelier-page__headline">Household Members</h2>
                    <Link className="atelier-page__helper-link" to={ROUTES.app.profile}>
                        View details
                        <ChevronRightIcon className="atelier-page__inline-icon" />
                    </Link>
                </div>

                <div className="atelier-page__list-stack">
                    {analytics.member_fit.map((member) => (
                        <Link key={member.member_id} className="atelier-page__member-card" to={ROUTES.app.memberDetails(member.member_id)}>
                            <div className="atelier-page__member-avatar atelier-page__member-avatar--placeholder">{initials(member.member_name)}</div>
                            <div className="atelier-page__member-copy">
                                <h3 className="atelier-page__item-title">{member.member_name}</h3>
                                <p className="atelier-page__caption">Profile alignment across calories and macros</p>
                                <div className="atelier-page__member-metrics">
                                    <div>
                                        <strong>{formatPercent(member.calorie_fit)}</strong>
                                        <span>calorie fit</span>
                                    </div>
                                    <div>
                                        <strong>{formatPercent(member.protein_fit)}</strong>
                                        <span>protein fit</span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRightIcon className="atelier-page__inline-icon" />
                        </Link>
                    ))}
                </div>
            </section>

            <section className="atelier-page__card atelier-page__chart-card">
                <h2 className="atelier-page__headline">Micronutrient Focus</h2>
                <div className="atelier-page__list-stack">
                    {micronutrients.map((nutrient) => {
                        const Icon = nutrientIcon(nutrient.state)

                        return (
                            <article key={nutrient.id} className="atelier-page__micro-card">
                                <div className="atelier-page__insight-top">
                                    <span className="atelier-page__mini-icon-badge atelier-page__mini-icon-badge--soft">
                                        <Icon className="atelier-page__mini-icon" />
                                    </span>
                                    <div>
                                        <div className="atelier-page__shopping-item-title-row atelier-page__shopping-item-title-row--tight">
                                            <h3 className="atelier-page__item-title">{nutrient.name}</h3>
                                            <span className={`atelier-page__token atelier-page__token--${nutrient.state.toLowerCase()}`}>
                                                {nutrient.state}
                                            </span>
                                        </div>
                                        <p className="atelier-page__caption">{nutrient.description}</p>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </div>
            </section>

            <div className="atelier-page__helper-links">
                <Link className="atelier-page__helper-link" to={ROUTES.app.mealPlans.explanations(mealPlanId)}>
                    <SparkIcon className="atelier-page__inline-icon" />
                    Why this plan
                </Link>
                <Link className="atelier-page__helper-link" to={ROUTES.app.mealPlans.budgetAnalytics(mealPlanId)}>
                    <TrendUpBarsIcon className="atelier-page__inline-icon" />
                    Budget analysis
                </Link>
                <Link className="atelier-page__helper-link" to={ROUTES.app.mealPlans.shoppingList(mealPlanId)}>
                    <PantryIcon className="atelier-page__inline-icon" />
                    Shopping list
                </Link>
            </div>
        </section>
    )
}
