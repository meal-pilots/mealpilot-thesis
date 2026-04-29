import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/paths'
import { type RecipeDetail } from '../../../entities/recipe/model/types'
import { dashboardApi } from '../../../features/dashboard/api/dashboardApi'
import {
    planningApi,
    type MealPlanDayDto,
    type MealPlanDetailDto,
    type MealPlanItemDto,
} from '../../../features/planning/api/planningApi'
import { recipesApi } from '../../../features/recipes/api/recipesApi'
import { getApiErrorMessage } from '../../../shared/lib/get-api-error-message'
import { AppLoader } from '../../../shared/ui/AppLoader'
import {
    BellIcon,
    PlanIcon,
    PriceTagIcon,
    ShoppingCartIcon,
} from '../AppIcons'
import '../AppPages.css'

type RecipeDetailsMap = Record<string, RecipeDetail>

type MealUiGroup = {
    mealType: string
    items: MealPlanItemDto[]
}

function loadRecipeDetailsMap(recipeIds: string[]) {
    return Promise.allSettled(recipeIds.map((recipeId) => recipesApi.getById(recipeId))).then((results) => {
        return results.reduce<RecipeDetailsMap>((accumulator, result) => {
            if (result.status === 'fulfilled') {
                accumulator[result.value.id] = result.value
            }
            return accumulator
        }, {})
    })
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

function formatScore(value: string | number | null | undefined) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
        return '—'
    }

    const normalized = numeric <= 1 ? numeric * 100 : numeric
    return `${Math.round(normalized)}%`
}

function formatDateLabel(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    })
}

function mealTypeLabel(mealType: string) {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1)
}

function mealTypeTime(mealType: string) {
    if (mealType === 'breakfast') return '08:00 AM'
    if (mealType === 'lunch') return '01:00 PM'
    if (mealType === 'dinner') return '07:00 PM'
    return '04:00 PM'
}

function getMealBadge(item: MealPlanItemDto, recipe?: RecipeDetail) {
    if (item.adaptations.length) {
        return `${item.adaptations.length} adaptation${item.adaptations.length > 1 ? 's' : ''}`
    }

    if (recipe?.tags?.length) {
        return recipe.tags[0]
    }

    if (item.is_manually_replaced) {
        return 'Manually replaced'
    }

    return 'Planned meal'
}

export function WeeklyPlanPage() {
    const navigate = useNavigate()
    const { mealPlanId } = useParams()
    const [mealPlan, setMealPlan] = useState<MealPlanDetailDto | null>(null)
    const [dayDetailsMap, setDayDetailsMap] = useState<Record<number, MealPlanDayDto>>({})
    const [recipeMap, setRecipeMap] = useState<RecipeDetailsMap>({})
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isDayLoading, setIsDayLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        let isMounted = true

        async function loadMealPlan() {
            setIsLoading(true)
            setErrorMessage('')

            try {
                let resolvedMealPlanId = mealPlanId

                if (!resolvedMealPlanId) {
                    const activeGroup = await dashboardApi.getActiveGroup()

                    if (!activeGroup) {
                        navigate(ROUTES.app.mealPlans.generate, { replace: true })
                        return
                    }

                    const currentPlan = await planningApi.getCurrentMealPlan(activeGroup.id)

                    if (!currentPlan?.id) {
                        navigate(ROUTES.app.mealPlans.generate, { replace: true })
                        return
                    }

                    resolvedMealPlanId = currentPlan.id
                }

                const detail = await planningApi.getMealPlanDetail(resolvedMealPlanId)

                if (!isMounted) {
                    return
                }

                setMealPlan(detail)
                setDayDetailsMap({})
                setRecipeMap({})
                setSelectedDayIndex(detail.days[0]?.day_index ?? null)
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load the weekly plan.'))
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void loadMealPlan()

        return () => {
            isMounted = false
        }
    }, [mealPlanId, navigate])

    useEffect(() => {
        let isMounted = true

        async function loadSelectedDay() {
            if (!mealPlan?.summary.id || selectedDayIndex == null || dayDetailsMap[selectedDayIndex]) {
                return
            }

            setIsDayLoading(true)

            try {
                const detail = await planningApi.getDayDetail(mealPlan.summary.id, selectedDayIndex)
                const uniqueRecipeIds = Array.from(new Set(detail.items.map((item) => item.recipe_id).filter(Boolean)))
                const recipes = uniqueRecipeIds.length ? await loadRecipeDetailsMap(uniqueRecipeIds) : {}

                if (!isMounted) {
                    return
                }

                setDayDetailsMap((current) => ({
                    ...current,
                    [detail.day_index]: detail,
                }))
                setRecipeMap((current) => ({
                    ...current,
                    ...recipes,
                }))
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load the selected day.'))
                }
            } finally {
                if (isMounted) {
                    setIsDayLoading(false)
                }
            }
        }

        void loadSelectedDay()

        return () => {
            isMounted = false
        }
    }, [dayDetailsMap, mealPlan?.summary.id, selectedDayIndex])

    const selectedDaySummary = useMemo<MealPlanDayDto | null>(() => {
        if (!mealPlan?.days.length) {
            return null
        }

        return mealPlan.days.find((day) => day.day_index === selectedDayIndex) ?? mealPlan.days[0]
    }, [mealPlan, selectedDayIndex])

    const selectedDay = useMemo<MealPlanDayDto | null>(() => {
        if (selectedDayIndex == null) {
            return null
        }

        return dayDetailsMap[selectedDayIndex] ?? null
    }, [dayDetailsMap, selectedDayIndex])

    const groups = useMemo<MealUiGroup[]>(() => {
        if (!selectedDay) {
            return []
        }

        const grouped = selectedDay.items.reduce<Record<string, MealPlanItemDto[]>>((accumulator, item) => {
            const key = item.meal_type
            accumulator[key] = accumulator[key] ? [...accumulator[key], item] : [item]
            return accumulator
        }, {})

        return Object.entries(grouped).map(([mealType, items]) => ({ mealType, items }))
    }, [selectedDay])

    if (isLoading) {
        return <AppLoader message="Loading the weekly plan..." />
    }

    if (errorMessage) {
        return (
            <section className="plan-page">
                <section className="app-page__section">
                    <article className="app-page__detail-card app-page__error-card">
                        <p className="app-page__eyebrow">Weekly plan</p>
                        <h1 className="app-page__title">We couldn&apos;t load this plan</h1>
                        <p className="app-page__body">{errorMessage}</p>
                        <Link className="app-page__button" to={ROUTES.app.mealPlans.generate}>
                            Generate a new plan
                        </Link>
                    </article>
                </section>
            </section>
        )
    }

    if (!mealPlan || selectedDayIndex == null) {
        return <AppLoader message="Preparing your weekly plan..." />
    }

    return (
        <section className="plan-page plan-page--weekly">
            <section className="plan-page__hero plan-page__hero--weekly">
                <div className="plan-page__hero-copy-block">
                    <p className="plan-page__eyebrow">Current plan</p>
                    <h1 className="plan-page__weekly-title">{mealPlan.summary.title}</h1>
                    <p className="plan-page__hero-copy">
                        {formatDateLabel(mealPlan.summary.start_date)} — {formatDateLabel(mealPlan.summary.end_date)}
                    </p>
                </div>

                <div className="plan-page__weekly-summary-grid">
                    <article className="plan-page__weekly-card plan-page__card--soft">
                        <span className="plan-page__mini-label plan-page__caption--caps">Household fit score</span>
                        <div className="plan-page__score-row">
                            <span className="plan-page__score-value">{formatScore(mealPlan.summary.group_fit_score)}</span>
                        </div>
                        <p className="plan-page__caption">Perfectly aligned with your high-protein goals.</p>
                    </article>

                    <article className="plan-page__weekly-card plan-page__weekly-card--green">
                        <span className="plan-page__mini-label plan-page__mini-label--inverse plan-page__caption--caps">Weekly budget</span>
                        <div>
                            <p className="plan-page__budget-value">{formatCurrency(mealPlan.summary.estimated_total_cost)}</p>
                            <p className="plan-page__caption plan-page__caption--inverse">Estimated total cost</p>
                        </div>
                        <div className="plan-page__caption-row plan-page__caption-row--inverse">
                            <span>{formatScore(mealPlan.summary.budget_fit_score)} budget fit</span>
                        </div>
                    </article>

                    <article className="plan-page__weekly-card plan-page__card--soft">
                        <span className="plan-page__mini-label plan-page__caption--caps">Nutrition fit score</span>
                        <div className="plan-page__score-row">
                            <span className="plan-page__score-value">{formatScore(mealPlan.summary.nutrition_fit_score)}</span>
                        </div>
                        <p className="plan-page__caption">Optimal macro balance achieved.</p>
                    </article>
                </div>
            </section>

            <nav className="plan-page__days-scroll" aria-label="Weekly days">
                {mealPlan.days.map((day) => (
                    <button
                        key={day.id}
                        type="button"
                        className={`plan-page__day-chip ${selectedDayIndex === day.day_index ? 'plan-page__day-chip--active' : ''}`}
                        onClick={() => setSelectedDayIndex(day.day_index)}
                    >
                        {formatDateLabel(day.plan_date)}
                    </button>
                ))}
            </nav>

            <div className="plan-page__stack plan-page__stack--spacious">
                <section className="plan-page__meal-group">
                    <div className="plan-page__meal-heading-row">
                        <div>
                            <p className="plan-page__eyebrow">Selected day</p>
                            <h2 className="plan-page__meal-heading">
                                {formatDateLabel(selectedDay?.plan_date ?? selectedDaySummary?.plan_date ?? '')}
                            </h2>
                        </div>

                        <Link
                            className="plan-page__text-button"
                            to={ROUTES.app.mealPlans.dayDetails(mealPlan.summary.id, String(selectedDayIndex))}
                        >
                            Open day details
                        </Link>
                    </div>
                </section>

                {isDayLoading && !selectedDay ? (
                    <section className="plan-page__meal-group">
                        <article className="app-page__detail-card">
                            <p className="app-page__body">Loading selected day...</p>
                        </article>
                    </section>
                ) : null}

                {selectedDay ? groups.map((group) => (
                    <section key={group.mealType} className="plan-page__meal-group">
                        <div className="plan-page__meal-heading-row">
                            <h2 className="plan-page__meal-heading">{mealTypeLabel(group.mealType)}</h2>
                            <span className="plan-page__meal-time">{mealTypeTime(group.mealType)}</span>
                        </div>

                        <div className="plan-page__meal-cards">
                            {group.items.map((item) => {
                                const recipe = recipeMap[item.recipe_id]
                                const imageUrl = recipe?.image_url || null
                                const adaptationLink = `${ROUTES.app.mealPlanItems.adaptations(item.id)}?mealPlanId=${mealPlan.summary.id}&dayIndex=${selectedDay.day_index}`

                                return (
                                    <article key={item.id} className="plan-page__meal-card">
                                        {imageUrl && (
                                            <div className="plan-page__meal-image-wrap">
                                                <img
                                                    className="plan-page__meal-image"
                                                    src={imageUrl}
                                                    alt={item.recipe_title}
                                                />
                                                <span className="plan-page__floating-tag">
                                                    {getMealBadge(item, recipe)}
                                                </span>
                                            </div>
                                        )}

                                        <div className="plan-page__meal-body">
                                            <h3 className="plan-page__meal-title">{item.recipe_title}</h3>

                                            <p className="plan-page__meal-copy">
                                                {recipe?.short_description ||
                                                    recipe?.long_description ||
                                                    item.selection_reason_summary ||
                                                    'A curated recipe chosen for your current goals.'}
                                            </p>

                                            <p className="plan-page__meal-copy">
                                                <PriceTagIcon className="plan-page__inline-icon" />
                                                {formatCurrency(item.estimated_cost)}
                                                {' · '}
                                                <BellIcon className="plan-page__inline-icon" />
                                                {Math.round(Number(item.estimated_calories) || 0)} kcal
                                                {' · '}
                                                <PlanIcon className="plan-page__inline-icon" />
                                                {formatScore(item.selection_score)}
                                            </p>

                                            <div className="plan-page__meal-actions">
                                                <Link
                                                    className="plan-page__small-button plan-page__small-button--primary"
                                                    to={ROUTES.app.recipeDetails(item.recipe_id)}
                                                >
                                                    View recipe
                                                </Link>

                                                <Link
                                                    className="plan-page__small-button plan-page__small-button--soft"
                                                    to={adaptationLink}
                                                >
                                                    Adapt meal
                                                </Link>

                                                <Link
                                                    className="plan-page__text-button"
                                                    to={ROUTES.app.mealPlans.explanations(mealPlan.summary.id)}
                                                >
                                                    View Why
                                                </Link>
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    </section>
                )) : null}

                <div className="plan-page__floating-cta-wrap">
                    <Link className="plan-page__floating-cta" to={ROUTES.app.mealPlans.shoppingList(mealPlan.summary.id)}>
                        <ShoppingCartIcon className="plan-page__inline-icon" />
                        <span>Build Shopping List</span>
                    </Link>
                </div>

                <div className="plan-page__helper-links">
                    <Link
                        className="plan-page__helper-link"
                        to={ROUTES.app.mealPlans.budgetAnalytics(mealPlan.summary.id)}
                    >
                        <PriceTagIcon className="plan-page__inline-icon" />
                        Budget analysis
                    </Link>

                    <Link
                        className="plan-page__helper-link"
                        to={ROUTES.app.mealPlans.nutritionAnalytics(mealPlan.summary.id)}
                    >
                        <BellIcon className="plan-page__inline-icon" />
                        Nutrition analysis
                    </Link>
                </div>
            </div>
        </section>
    )
}