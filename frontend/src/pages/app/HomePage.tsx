import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../app/router/paths'
import { dashboardApi, type GroupDashboard } from '../../features/dashboard/api/dashboardApi'
import { getApiErrorMessage } from '../../shared/lib/get-api-error-message'
import { AppLoader } from '../../shared/ui/AppLoader'
import './AppPages.css'
import {
    ChevronRightIcon,
    ClockIcon,
    FireIcon,
    RecipesIcon,
    ShoppingCartIcon,
    SparkIcon,
} from './AppIcons'
import type { RecipeCard } from '../../entities/recipe/model/types'

function formatCurrency(value: string | number | null | undefined) {
    if (value == null) {
        return '—'
    }

    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
        return String(value)
    }

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(numeric)
}

function formatPercent(value: string | number | null | undefined) {
    if (value == null) {
        return '—'
    }

    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
        return String(value)
    }

    return `${Math.round(numeric * 100)}%`
}

function formatDateRange(startDate?: string, endDate?: string) {
    if (!startDate || !endDate) {
        return 'No active planning window yet.'
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return `${startDate} — ${endDate}`
    }

    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

function getRecipeSummary(recipe: RecipeCard | undefined) {
    if (!recipe) {
        return null
    }

    return {
        id: recipe.id,
        title: recipe.title,
        subtitle: `${Math.round(Number(recipe.protein_per_serving_g ?? 0))} g protein · ${recipe.cuisine_type.replace(/_/g, ' ')}`,
        imageUrl: recipe.image_url ?? null,
        tags: recipe.tags,
        cookTime: `${recipe.total_time_minutes} min`,
        calories: `${Math.round(Number(recipe.calories_per_serving ?? 0))} kcal`,
    }
}

export function HomePage() {
    const [dashboard, setDashboard] = useState<GroupDashboard | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        let isMounted = true

        async function loadDashboard() {
            setIsLoading(true)
            setErrorMessage('')

            try {
                const activeGroup = await dashboardApi.getActiveGroup()

                if (!activeGroup) {
                    if (isMounted) {
                        setDashboard(null)
                        setIsLoading(false)
                    }
                    return
                }

                const data = await dashboardApi.getDashboard(activeGroup.id)

                if (isMounted) {
                    setDashboard(data)
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load the dashboard right now.'))
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void loadDashboard()

        return () => {
            isMounted = false
        }
    }, [])

    const featuredRecipes = useMemo(
        () => dashboard?.recommendation_preview.slice(0, 3) ?? [],
        [dashboard],
    )

    const recommendationA = getRecipeSummary(featuredRecipes[0])
    const recommendationB = getRecipeSummary(featuredRecipes[1])

    if (isLoading) {
        return <AppLoader message="Loading your kitchen dashboard..." />
    }

    if (errorMessage) {
        return (
            <section className="app-page">
                <div className="app-page__section">
                    <article className="app-page__detail-card app-page__error-card">
                        <p className="app-page__eyebrow">Dashboard</p>
                        <h1 className="app-page__title">We couldn&apos;t load your home screen</h1>
                        <p className="app-page__body">{errorMessage}</p>
                        <Link className="app-page__button" to={ROUTES.app.recipes}>
                            Browse recipes instead
                        </Link>
                    </article>
                </div>
            </section>
        )
    }

    if (!dashboard) {
        return (
            <section className="app-page">
                <div className="app-page__section">
                    <article className="app-page__hero">
                        <div className="app-page__hero-inner">
                            <p className="app-page__eyebrow">Household studio</p>
                            <h1 className="app-page__display">Set up your first household</h1>
                            <p className="app-page__body">
                                You need an active household before the dashboard can tailor recipes, budgets, and weekly plan insights to your preferences.
                            </p>
                            <div className="app-page__hero-actions">
                                <Link className="app-page__button" to={ROUTES.onboarding.modeSelection}>
                                    Complete onboarding
                                </Link>
                                <Link className="app-page__button--secondary" to={ROUTES.app.recipes}>
                                    Explore recipes
                                </Link>
                            </div>
                        </div>
                    </article>
                </div>
            </section>
        )
    }

    return (
        <section className="app-page">
            <div className="app-page__section">
                <article className="app-page__hero">
                    <div className="app-page__hero-inner">
                        <p className="app-page__eyebrow">Household studio</p>
                        <h1 className="app-page__display">{dashboard.active_group.name}</h1>
                        <p className="app-page__body">
                            Your dashboard is now tuned to this household. We&apos;re using your active group to balance recipes, cost, and nutrition recommendations.
                        </p>

                        <div className="app-page__hero-actions">
                            <Link className="app-page__button" to={ROUTES.app.mealPlans.generate}>
                                Generate this week&apos;s plan
                            </Link>
                            <Link className="app-page__button--secondary" to={ROUTES.app.recipes}>
                                Explore recipes
                            </Link>
                        </div>
                    </div>

                    <div className="app-page__stats">
                        <div className="app-page__stat">
                            <p className="app-page__stat-label">Budget status</p>
                            <p className="app-page__stat-value">
                                {dashboard.budget_status ? `Remaining ${formatCurrency(dashboard.budget_status.remaining)}` : 'No active plan yet'}
                            </p>
                        </div>
                        <div className="app-page__stat">
                            <p className="app-page__stat-label">Protein fit</p>
                            <p className="app-page__stat-value">
                                {dashboard.nutrition_status ? formatPercent(dashboard.nutrition_status.protein_fit) : '—'}
                            </p>
                        </div>
                    </div>
                </article>
            </div>

            <div className="app-page__section">
                <div className="app-page__section-header">
                    <div>
                        <p className="app-page__eyebrow">Start somewhere soft</p>
                        <h2 className="app-page__title">Quick actions</h2>
                    </div>
                </div>

                <div className="app-page__quick-grid">
                    <Link className="app-page__quick-card" to={ROUTES.app.recipes}>
                        <div className="app-page__quick-card-content">
                            <span className="app-page__icon-badge">
                                <RecipesIcon className="app-page__meta-icon" />
                            </span>
                            <h3 className="app-page__card-title">Browse recipes</h3>
                            <p className="app-page__muted">Pulled from the published recipe catalog and scored against your active household.</p>
                        </div>
                    </Link>

                    <Link className="app-page__quick-card" to={ROUTES.app.mealPlans.generate}>
                        <div className="app-page__quick-card-content">
                            <span className="app-page__icon-badge">
                                <SparkIcon className="app-page__meta-icon" />
                            </span>
                            <h3 className="app-page__card-title">Refresh the plan</h3>
                            <p className="app-page__muted">Generate a new week with tighter costs, more variety, or faster prep.</p>
                        </div>
                    </Link>

                    <Link className="app-page__quick-card" to={dashboard.current_plan_summary ? ROUTES.app.mealPlans.shoppingList(dashboard.current_plan_summary.id) : ROUTES.app.mealPlans.generate}>
                        <div className="app-page__quick-card-content">
                            <span className="app-page__icon-badge">
                                <ShoppingCartIcon className="app-page__meta-icon" />
                            </span>
                            <h3 className="app-page__card-title">Generate shopping list</h3>
                            <p className="app-page__muted">Generate a shopping list for the week.</p>
                        </div>
                    </Link>
                </div>
            </div>

            <div className="app-page__section">
                <div className="app-page__pair">
                    <div>
                        <p className="app-page__eyebrow">Current plan</p>
                        <h2 className="app-page__title">{dashboard.current_plan_summary ? dashboard.current_plan_summary.title : 'No weekly plan yet'}</h2>
                    </div>
                    <Link className="app-page__action-link" to={dashboard.current_plan_summary ? ROUTES.app.mealPlans.details(dashboard.current_plan_summary.id) : ROUTES.app.mealPlans.generate}>
                        {dashboard.current_plan_summary ? 'Open full plan' : 'Generate now'}
                    </Link>
                </div>

                <div className="app-page__cards">
                    <article className="app-page__feature-card">
                        {recommendationA?.imageUrl ? (
                            <img className="app-page__feature-image" src={recommendationA.imageUrl} alt={recommendationA.title} />
                        ) : null}
                        <div className="app-page__feature-body">
                            <p className="app-page__eyebrow">Planning window</p>
                            <h3 className="app-page__card-title">
                                {dashboard.current_plan_summary ? formatDateRange(dashboard.current_plan_summary.start_date, dashboard.current_plan_summary.end_date) : 'Your dashboard is ready for a fresh plan'}
                            </h3>
                            <div className="app-page__meta">
                                <span className="app-page__meta-item">
                                    <ClockIcon className="app-page__meta-icon" />
                                    <span className="app-page__meta-text">
                                        {dashboard.current_plan_summary ? `Budget fit ${formatPercent(dashboard.current_plan_summary.budget_fit_score)}` : 'No date range yet'}
                                    </span>
                                </span>
                                <span className="app-page__meta-item">
                                    <FireIcon className="app-page__meta-icon" />
                                    <span className="app-page__meta-text">
                                        {dashboard.current_plan_summary ? `Nutrition ${formatPercent(dashboard.current_plan_summary.nutrition_fit_score)}` : 'Create a plan to see scores'}
                                    </span>
                                </span>
                            </div>
                            <p className="app-page__muted">
                                {dashboard.current_plan_summary
                                    ? `Estimated total cost ${formatCurrency(dashboard.current_plan_summary.estimated_total_cost)}.`
                                    : 'Generate your first weekly plan to unlock budget and nutrition insights on the home screen.'}
                            </p>
                        </div>
                    </article>

                    {recommendationB ? (
                        <article className="app-page__feature-card">
                            {recommendationB.imageUrl ? (
                                <img className="app-page__feature-image" src={recommendationB.imageUrl} alt={recommendationB.title} />
                            ) : null}
                            <div className="app-page__feature-body">
                                <p className="app-page__eyebrow">Recommended now</p>
                                <h3 className="app-page__card-title">{recommendationB.title}</h3>
                                <div className="app-page__meta">
                                    <span className="app-page__meta-item">
                                        <ClockIcon className="app-page__meta-icon" />
                                        <span className="app-page__meta-text">{recommendationB.cookTime}</span>
                                    </span>
                                    <span className="app-page__meta-item">
                                        <FireIcon className="app-page__meta-icon" />
                                        <span className="app-page__meta-text">{recommendationB.calories}</span>
                                    </span>
                                </div>
                                <p className="app-page__muted">{recommendationB.subtitle}</p>
                            </div>
                        </article>
                    ) : null}
                </div>
            </div>

            <div className="app-page__section">
                <div className="app-page__section-header">
                    <div>
                        <p className="app-page__eyebrow">Curated recipes</p>
                        <h2 className="app-page__title">Seasonal kitchen favourites</h2>
                    </div>
                    <Link className="app-page__action-link" to={ROUTES.app.recipes}>
                        View all <ChevronRightIcon className="app-page__inline-icon" />
                    </Link>
                </div>

                <div className="app-page__cards">
                    {featuredRecipes.map((recipe) => (
                        <Link key={recipe.id} className="app-page__recipe-card" to={ROUTES.app.recipeDetails(recipe.id)}>
                            {recipe.image_url ? (
                                <img className="app-page__recipe-image" src={recipe.image_url} alt={recipe.title} />
                            ) : null}
                            <div className="app-page__recipe-body">
                                <div className="app-page__chips">
                                    {recipe.tags.slice(0, 2).map((tag) => (
                                        <span key={tag} className="app-page__recipe-tag">
                                            {tag.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                                <h3 className="app-page__recipe-title">{recipe.title}</h3>
                                <p className="app-page__muted">{recipe.cuisine_type.replace(/_/g, ' ')} · Fit score {formatPercent(recipe.fit_score)}</p>
                                <div className="app-page__meta">
                                    <span className="app-page__meta-item">
                                        <ClockIcon className="app-page__meta-icon" />
                                        <span className="app-page__meta-text">{recipe.total_time_minutes} min</span>
                                    </span>
                                    <span className="app-page__meta-item">
                                        <FireIcon className="app-page__meta-icon" />
                                        <span className="app-page__meta-text">{Math.round(Number(recipe.calories_per_serving ?? 0))} kcal</span>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}
