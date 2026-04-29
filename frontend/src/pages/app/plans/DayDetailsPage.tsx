import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/paths'
import type { RecipeDetail } from '../../../entities/recipe/model/types'
import { planningApi, type MealPlanDayDto } from '../../../features/planning/api/planningApi'
import { recipesApi } from '../../../features/recipes/api/recipesApi'
import { getApiErrorMessage } from '../../../shared/lib/get-api-error-message'
import { AppLoader } from '../../../shared/ui/AppLoader'
import {
    ArrowLeftIcon,
    ClockIcon,
    FireIcon,
    MoonSmallIcon,
    PriceTagIcon,
    SunIcon,
} from '../AppIcons'
import '../AppPages.css'


type RecipeMap = Record<string, RecipeDetail>

function mealTypeIcon(mealType: string) {
    if (mealType === 'dinner') {
        return MoonSmallIcon
    }

    return SunIcon
}

function mealTypeLabel(mealType: string) {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1)
}

function formatCurrency(value: string | number | null | undefined) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
        return '—'
    }

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(numeric)
}

function formatDayTitle(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    })
}

export function DayDetailsPage() {
    const { mealPlanId, dayIndex } = useParams()
    const [day, setDay] = useState<MealPlanDayDto | null>(null)
    const [recipeMap, setRecipeMap] = useState<RecipeMap>({})
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        let isMounted = true

        async function loadDay() {
            if (!mealPlanId || !dayIndex) {
                setErrorMessage('Day details need both a meal plan id and a day index.')
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setErrorMessage('')

            try {
                const detail = await planningApi.getDayDetail(mealPlanId, Number(dayIndex))
                const uniqueRecipeIds = Array.from(new Set(detail.items.map((item) => item.recipe_id)))
                const recipeResults = await Promise.allSettled(uniqueRecipeIds.map((recipeId) => recipesApi.getById(recipeId)))
                const nextRecipeMap = recipeResults.reduce<RecipeMap>((accumulator, result) => {
                    if (result.status === 'fulfilled') {
                        accumulator[result.value.id] = result.value
                    }
                    return accumulator
                }, {})

                if (!isMounted) {
                    return
                }

                setDay(detail)
                setRecipeMap(nextRecipeMap)
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load the day details.'))
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void loadDay()

        return () => {
            isMounted = false
        }
    }, [mealPlanId, dayIndex])

    const totalAdaptations = useMemo(() => {
        if (!day) {
            return 0
        }

        return day.items.reduce((sum, item) => sum + item.adaptations.length, 0)
    }, [day])

    if (isLoading) {
        return <AppLoader message="Loading the day details..." />
    }

    if (errorMessage || !day || !mealPlanId) {
        return (
            <section className="plan-page">
                <section className="app-page__section">
                    <article className="app-page__detail-card app-page__error-card">
                        <p className="app-page__eyebrow">Day details</p>
                        <h1 className="app-page__title">We couldn&apos;t load this day</h1>
                        <p className="app-page__body">{errorMessage || 'The selected day is unavailable.'}</p>
                        <Link className="app-page__button" to={ROUTES.app.mealPlans.current}>
                            Back to weekly plan
                        </Link>
                    </article>
                </section>
            </section>
        )
    }

    return (
        <section className="plan-page plan-page--day-details">
            <header className="plan-page__topbar plan-page__topbar--centered">
                <Link
                    className="plan-page__icon-button"
                    to={ROUTES.app.mealPlans.details(mealPlanId)}
                    aria-label="Back to weekly plan"
                >
                    <ArrowLeftIcon className="plan-page__icon" />
                </Link>
                <span className="plan-page__topbar-title">Day {String(day.day_index).padStart(2, '0')} Plan</span>
                <span className="plan-page__topbar-spacer" aria-hidden="true" />
            </header>

            <section className="plan-page__hero plan-page__hero--compact">
                <h1 className="plan-page__weekly-title">{formatDayTitle(day.plan_date)}</h1>
            </section>

            <section className="plan-page__metrics-bar">
                <article className="plan-page__metric-card">
                    <span className="plan-page__metric-large">{formatCurrency(day.estimated_daily_cost)}</span>
                    <span className="plan-page__metric-label">Budget Spent</span>
                </article>
                <article className="plan-page__metric-card">
                    <span className="plan-page__metric-large">{Math.round(Number(day.estimated_daily_calories) || 0)}</span>
                    <span className="plan-page__metric-label">Total kcal</span>
                </article>
                <article className="plan-page__metric-card plan-page__metric-card--accent">
                    <span className="plan-page__metric-large">{totalAdaptations}</span>
                    <span className="plan-page__metric-label">Adaptations</span>
                </article>
            </section>

            <div className="plan-page__stack plan-page__stack--detail">
                {day.items.map((meal) => {
                    const Icon = mealTypeIcon(meal.meal_type)
                    const recipe = recipeMap[meal.recipe_id]
                    const adaptationLink = `${ROUTES.app.mealPlanItems.adaptations(meal.id)}?mealPlanId=${mealPlanId}&dayIndex=${day.day_index}`

                    return (
                        <section key={meal.id} className="plan-page__detail-section">
                            <div className="plan-page__meal-heading-row">
                                <div className="plan-page__meal-heading-main">
                                    <Icon className="plan-page__inline-icon" />
                                    <h2 className="plan-page__meal-heading">{mealTypeLabel(meal.meal_type)}</h2>
                                </div>
                            </div>

                            <article className="plan-page__detail-card">
                                {recipe?.image_url ? (
                                    <div className="plan-page__detail-image-wrap">
                                        <img
                                            className="plan-page__detail-image"
                                            src={recipe.image_url}
                                            alt={meal.recipe_title}
                                        />
                                        {meal.adaptations.length ? (
                                            <span className="plan-page__floating-tag">{meal.adaptations.length} adaptation{meal.adaptations.length > 1 ? 's' : ''}</span>
                                        ) : null}
                                    </div>
                                ) : null}

                                <div className="plan-page__detail-body">
                                    <h3 className="plan-page__meal-title">{meal.recipe_title}</h3>
                                    <p className="plan-page__meal-copy">
                                        {recipe?.short_description || meal.selection_reason_summary || 'Selected to fit the day budget, variety, and group nutrition targets.'}
                                    </p>

                                    <div className="plan-page__detail-meta-row">
                                        <span className="plan-page__meta-pill">
                                            <PriceTagIcon className="plan-page__inline-icon" />
                                            {formatCurrency(meal.estimated_cost)}
                                        </span>
                                        <span className="plan-page__meta-pill">
                                            <FireIcon className="plan-page__inline-icon" />
                                            {Math.round(Number(meal.estimated_calories) || 0)} kcal
                                        </span>
                                        <span className="plan-page__meta-pill">
                                            <ClockIcon className="plan-page__inline-icon" />
                                            {recipe?.total_time_minutes ?? '—'} min
                                        </span>
                                    </div>

                                    <div className="plan-page__detail-actions-row">
                                        <Link className="plan-page__button-soft" to={adaptationLink}>
                                            Adapt Meal
                                        </Link>
                                        <Link className="plan-page__button-solid" to={ROUTES.app.recipeDetails(meal.recipe_id)}>
                                            View Recipe
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        </section>
                    )
                })}
            </div>
        </section>
    )
}
