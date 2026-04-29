import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/paths'
import type { RecipeDetail } from '../../../entities/recipe/model/types'
import { recipesApi } from '../../../features/recipes/api/recipesApi'
import { planningApi, type BudgetAnalyticsDto, type MealPlanDetailDto } from '../../../features/planning/api/planningApi'
import { getApiErrorMessage } from '../../../shared/lib/get-api-error-message'
import { AppLoader } from '../../../shared/ui/AppLoader'
import {
    ArrowLeftIcon,
    ChevronRightIcon,
    CoinStackIcon,
    PriceTagIcon,
    ShoppingCartIcon,
    SparkIcon,
    TrendUpBarsIcon,
} from '../AppIcons'
import '../AppPages.css'

function formatCurrency(value: string | number | null | undefined) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
        return '—'
    }
    return `${numeric.toFixed(2)}`
}

function titleCase(value: string) {
    return value
        .split(/[_-]/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

type TopMealCard = {
    id: string
    title: string
    subtitle: string
    tag: string
    price: number
    imageUrl: string | null
}

export function BudgetAnalyticsPage() {
    const { mealPlanId } = useParams<{ mealPlanId: string }>()
    const [analytics, setAnalytics] = useState<BudgetAnalyticsDto | null>(null)
    const [mealPlanDetail, setMealPlanDetail] = useState<MealPlanDetailDto | null>(null)
    const [topMealCards, setTopMealCards] = useState<TopMealCard[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        if (!mealPlanId) {
            setIsLoading(false)
            setErrorMessage('Meal plan was not found.')
            return
        }

        let isMounted = true

        async function loadAnalytics() {
            if (!mealPlanId) {
                setIsLoading(false)
                setErrorMessage('Meal plan was not found.')
                return
            }

            setIsLoading(true)
            setErrorMessage('')

            try {
                const [budgetData, detail] = await Promise.all([
                    planningApi.getBudgetAnalytics(mealPlanId),
                    planningApi.getMealPlanDetail(mealPlanId),
                ])

                if (!isMounted) {
                    return
                }

                setAnalytics(budgetData)
                setMealPlanDetail(detail)

                const itemToRecipeId = new Map(
                    detail.days
                        .flatMap((day) => day.items)
                        .map((item) => [item.id, item.recipe_id] as const),
                )

                const cards = await Promise.all(
                    budgetData.most_expensive_meals.slice(0, 3).map(async (entry) => {
                        const recipeId = itemToRecipeId.get(entry.meal_plan_item_id)
                        let recipe: RecipeDetail | null = null

                        if (recipeId) {
                            try {
                                recipe = await recipesApi.getById(recipeId)
                            } catch {
                                recipe = null
                            }
                        }

                        return {
                            id: entry.meal_plan_item_id,
                            title: entry.recipe_title,
                            subtitle: recipe
                                ? `${titleCase(recipe.category)} · ${recipe.total_time_minutes} min`
                                : 'Highest-cost meal in this plan',
                            tag: recipe ? titleCase(recipe.cuisine_type) : 'Meal plan item',
                            price: Number(entry.estimated_cost),
                            imageUrl: recipe?.image_url ?? null,
                        }
                    }),
                )

                if (isMounted) {
                    setTopMealCards(cards)
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load budget analytics.'))
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void loadAnalytics()

        return () => {
            isMounted = false
        }
    }, [mealPlanId])

    const progress = useMemo(() => {
        if (!analytics) {
            return 0
        }
        const limit = Number(analytics.budget_limit)
        const planned = Number(analytics.planned_cost)
        if (!limit || Number.isNaN(limit) || Number.isNaN(planned)) {
            return 0
        }
        return Math.min((planned / limit) * 100, 100)
    }, [analytics])

    const dailyExpenditure = useMemo(() => {
        if (!analytics?.cost_by_day.length) {
            return []
        }

        const maxCost = Math.max(...analytics.cost_by_day.map((entry) => Number(entry.cost) || 0), 1)

        return analytics.cost_by_day.map((entry) => ({
            day: new Date(entry.plan_date).toLocaleDateString(undefined, { weekday: 'short' }),
            amount: Number(entry.cost),
            intensity: Math.max((Number(entry.cost) / maxCost) * 100, 12),
        }))
    }, [analytics])

    if (isLoading) {
        return <AppLoader message="Loading budget analytics..." />
    }

    if (!mealPlanId || !analytics || !mealPlanDetail) {
        return (
            <section className="atelier-page atelier-page--budget">
                <header className="atelier-page__topbar">
                    <div className="atelier-page__topbar-main">
                        <Link className="atelier-page__icon-button" to={ROUTES.app.mealPlans.current} aria-label="Back to weekly plan">
                            <ArrowLeftIcon className="atelier-page__icon" />
                        </Link>
                        <span className="atelier-page__brand">Weekly Harvest</span>
                    </div>
                </header>

                <section className="atelier-page__card atelier-page__hero-card">
                    <h1 className="atelier-page__headline">We couldn&apos;t load budget analytics</h1>
                    <p className="atelier-page__body-copy atelier-page__body-copy--centered">{errorMessage || 'This meal plan is unavailable.'}</p>
                    <Link className="atelier-page__button atelier-page__button--wide" to={ROUTES.app.mealPlans.current}>
                        Back to weekly plan
                    </Link>
                </section>
            </section>
        )
    }

    const remaining = Number(analytics.remaining)
    const status = remaining >= 0 ? 'On Track' : 'Over Budget'

    return (
        <section className="atelier-page atelier-page--budget">
            <section className="atelier-page__hero atelier-page__hero--budget">
                <p className="atelier-page__eyebrow">Financial Atelier</p>
                <h1 className="atelier-page__display atelier-page__display--compact">Budget Analytics</h1>
                <p className="atelier-page__body-copy">
                    {mealPlanDetail.summary.title} · {new Date(mealPlanDetail.summary.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(mealPlanDetail.summary.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
            </section>

            <section className="atelier-page__card atelier-page__budget-card">
                <div className="atelier-page__section-heading-row">
                    <div>
                        <h2 className="atelier-page__headline">Weekly Harvest Limit</h2>
                    </div>
                </div>

                <div className="atelier-page__budget-ring-shell">
                    <div className="atelier-page__budget-ring" style={{ ['--ring-progress' as string]: `${progress}%` }}>
                        <div className="atelier-page__budget-ring-inner">
                            <p className="atelier-page__summary-value">{formatCurrency(analytics.planned_cost)}</p>
                            <p className="atelier-page__caption">Spent of {formatCurrency(analytics.budget_limit)}</p>
                        </div>
                    </div>
                </div>

                <div className="atelier-page__stats-grid">
                    <article className="atelier-page__mini-card">
                        <p className="atelier-page__eyebrow">Remaining</p>
                        <p className="atelier-page__item-title">{formatCurrency(analytics.remaining)}</p>
                    </article>
                    <article className="atelier-page__mini-card atelier-page__mini-card--accent">
                        <p className="atelier-page__eyebrow">Status</p>
                        <p className="atelier-page__item-title">{status}</p>
                    </article>
                </div>
            </section>

            <section className="atelier-page__card atelier-page__chart-card">
                <div className="atelier-page__section-heading-row">
                    <div>
                        <h2 className="atelier-page__headline">Daily Expenditure</h2>
                        <p className="atelier-page__caption">Investment spread across the current meal plan window</p>
                    </div>
                    <span className="atelier-page__filter-pill">{mealPlanDetail.summary.days_count} Days</span>
                </div>

                <div className="atelier-page__bar-chart" aria-label="Meal plan spending chart">
                    {dailyExpenditure.map((entry) => (
                        <div key={`${entry.day}-${entry.amount}`} className="atelier-page__bar-column">
                            <div className="atelier-page__bar-track">
                                <span className="atelier-page__bar-fill" style={{ height: `${entry.intensity}%` }} />
                            </div>
                            <span className="atelier-page__bar-label">{entry.day}</span>
                        </div>
                    ))}
                </div>

                <div className="atelier-page__shopping-inline-note">
                    <span className="atelier-page__mini-icon-badge atelier-page__mini-icon-badge--soft">
                        <SparkIcon className="atelier-page__mini-icon" />
                    </span>
                    <p className="atelier-page__caption">
                        Highest daily spend: {dailyExpenditure.length ? formatCurrency(Math.max(...dailyExpenditure.map((entry) => entry.amount))) : '—'} during this plan.
                    </p>
                </div>
            </section>

            <section className="atelier-page__group">
                <div className="atelier-page__group-header">
                    <h2 className="atelier-page__headline">Top Cost Drivers</h2>
                </div>

                <div className="atelier-page__list-stack">
                    {topMealCards.map((selection) => (
                        <article key={selection.id} className="atelier-page__selection-card">
                            {selection.imageUrl ? (
                                <img className="atelier-page__selection-image" src={selection.imageUrl} alt={selection.title} />
                            ) : null}
                            <div className="atelier-page__selection-copy">
                                <div className="atelier-page__shopping-item-title-row">
                                    <h3 className="atelier-page__item-title">{selection.title}</h3>
                                    <p className="atelier-page__item-price">{formatCurrency(selection.price)}</p>
                                </div>
                                <p className="atelier-page__caption">{selection.subtitle}</p>
                                <span className="atelier-page__token">{selection.tag}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="atelier-page__group">
                <div className="atelier-page__group-header">
                    <div className="atelier-page__group-heading">
                        <span className="atelier-page__mini-icon-badge atelier-page__mini-icon-badge--glow">
                            <SparkIcon className="atelier-page__mini-icon" />
                        </span>
                        <h2 className="atelier-page__headline">Savings Opportunities</h2>
                    </div>
                    <span className="atelier-page__token atelier-page__token--soft">Live Analysis</span>
                </div>

                <div className="atelier-page__list-stack">
                    {analytics.savings_opportunities.length ? (
                        analytics.savings_opportunities.map((insight, index) => {
                            const Icon = index % 2 === 0 ? CoinStackIcon : SparkIcon

                            return (
                                <article key={`${insight.ingredient_name}-${index}`} className="atelier-page__card atelier-page__insight-card">
                                    <div className="atelier-page__insight-top">
                                        <span className="atelier-page__mini-icon-badge atelier-page__mini-icon-badge--soft">
                                            <Icon className="atelier-page__mini-icon" />
                                        </span>
                                        <div>
                                            <h3 className="atelier-page__item-title">{insight.ingredient_name}</h3>
                                            <p className="atelier-page__caption">
                                                Swap to <strong>{insight.suggested_substitute}</strong> and save approximately {formatCurrency(insight.estimated_savings)}.
                                            </p>
                                        </div>
                                    </div>
                                    <button type="button" className="atelier-page__text-link-button" disabled>
                                        Suggested swap
                                        <ChevronRightIcon className="atelier-page__inline-icon" />
                                    </button>
                                </article>
                            )
                        })
                    ) : (
                        <article className="atelier-page__card atelier-page__insight-card">
                            <div className="atelier-page__insight-top">
                                <span className="atelier-page__mini-icon-badge atelier-page__mini-icon-badge--soft">
                                    <SparkIcon className="atelier-page__mini-icon" />
                                </span>
                                <div>
                                    <h3 className="atelier-page__item-title">No major savings opportunities found</h3>
                                    <p className="atelier-page__caption">This plan is already closely aligned with the configured budget ceiling.</p>
                                </div>
                            </div>
                        </article>
                    )}
                </div>
            </section>

            <div className="atelier-page__helper-links">
                <Link className="atelier-page__helper-link" to={ROUTES.app.mealPlans.shoppingList(mealPlanId)}>
                    <ShoppingCartIcon className="atelier-page__inline-icon" />
                    Open shopping list
                </Link>
                <Link className="atelier-page__helper-link" to={ROUTES.app.mealPlans.nutritionAnalytics(mealPlanId)}>
                    <TrendUpBarsIcon className="atelier-page__inline-icon" />
                    Nutrition analysis
                </Link>
                <Link className="atelier-page__helper-link" to={ROUTES.app.mealPlans.details(mealPlanId)}>
                    <PriceTagIcon className="atelier-page__inline-icon" />
                    Back to weekly plan
                </Link>
            </div>
        </section>
    )
}
