import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, useParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/paths'
import type { RecipeDetail } from '../../../entities/recipe/model/types'
import { dashboardApi } from '../../../features/dashboard/api/dashboardApi'
import { onboardingApi, type GroupMemberDto } from '../../../features/onboarding/api/onboardingApi'
import {
    planningApi,
    type AdaptationType,
    type MealItemAdaptationDto,
    type MealPlanItemDto,
} from '../../../features/planning/api/planningApi'
import { recipesApi } from '../../../features/recipes/api/recipesApi'
import { getApiErrorMessage } from '../../../shared/lib/get-api-error-message'
import { AppLoader } from '../../../shared/ui/AppLoader'
import {
    BellIcon,
    CoinStackIcon,
    LeafCircleIcon,
    MagicWandIcon,
    ProteinBoltIcon,
    ShoppingCartIcon,
    SparkIcon,
    SwapArrowsIcon,
} from '../AppIcons'
import '../AppPages.css'


const adaptationCatalog: Record<
    AdaptationType,
    {
        title: string
        subtitle: string
        impact: string
        icon: 'coin' | 'child' | 'protein' | 'leaf'
    }
> = {
    cheaper_version: {
        title: 'Cheaper Version',
        subtitle: 'Bias toward lower-cost ingredients and stores',
        impact: 'Budget-first swap',
        icon: 'coin',
    },
    child_friendly: {
        title: 'Child-Friendly',
        subtitle: 'Soften textures and simplify flavors',
        impact: 'Family smoother',
        icon: 'child',
    },
    high_protein: {
        title: 'High Protein',
        subtitle: 'Increase protein density where possible',
        impact: 'Recovery support',
        icon: 'protein',
    },
    low_carb: {
        title: 'Low Carb',
        subtitle: 'Reduce carb load while keeping satiety',
        impact: 'Lighter macro profile',
        icon: 'leaf',
    },
    allergen_free: {
        title: 'Allergen-Free',
        subtitle: 'Remove or replace triggering components',
        impact: 'Safety-first adjustment',
        icon: 'leaf',
    },
    ingredient_remove: {
        title: 'Remove Ingredient',
        subtitle: 'Strip out a component that conflicts',
        impact: 'Minimalist edit',
        icon: 'leaf',
    },
    ingredient_replace: {
        title: 'Replace Ingredient',
        subtitle: 'Swap one element for a closer fit',
        impact: 'Targeted change',
        icon: 'coin',
    },
    portion_change: {
        title: 'Portion Change',
        subtitle: 'Adjust serving size for a member',
        impact: 'Portion alignment',
        icon: 'protein',
    },
}

const optionIconMap = {
    coin: CoinStackIcon,
    child: BellIcon,
    protein: ProteinBoltIcon,
    leaf: LeafCircleIcon,
} as const

function formatMoney(value: string | number | null | undefined) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
        return '—'
    }

    const sign = numeric > 0 ? '+' : ''
    return `${sign}${new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(numeric)}`
}

function formatNumberDelta(value: string | number | null | undefined, suffix: string) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
        return `0 ${suffix}`
    }

    const sign = numeric > 0 ? '+' : ''
    return `${sign}${Math.round(numeric)} ${suffix}`
}

function titleCase(value: string) {
    return value
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

export function MealAdaptationPage() {
    const { mealPlanItemId } = useParams()
    const [searchParams] = useSearchParams()

    const [mealPlanId, setMealPlanId] = useState<string | null>(searchParams.get('mealPlanId'))
    const [dayIndex, setDayIndex] = useState<number | null>(searchParams.get('dayIndex') ? Number(searchParams.get('dayIndex')) : null)
    const [mealItem, setMealItem] = useState<MealPlanItemDto | null>(null)
    const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
    const [members, setMembers] = useState<GroupMemberDto[]>([])
    const [adaptations, setAdaptations] = useState<MealItemAdaptationDto[]>([])
    const [selectedAdaptationType, setSelectedAdaptationType] = useState<AdaptationType>('cheaper_version')
    const [selectedMemberId, setSelectedMemberId] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    useEffect(() => {
        let isMounted = true

        async function loadContext() {
            if (!mealPlanItemId) {
                setErrorMessage('Meal adaptation requires a meal plan item id.')
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setErrorMessage('')
            setSuccessMessage('')

            try {
                let resolvedMealPlanId = mealPlanId

                if (!resolvedMealPlanId) {
                    const activeGroup = await dashboardApi.getActiveGroup()
                    if (!activeGroup) {
                        throw new Error('No active household found for this adaptation.')
                    }
                    const currentPlan = await planningApi.getCurrentMealPlan(activeGroup.id)
                    if (!currentPlan) {
                        throw new Error('No current meal plan found for this adaptation.')
                    }
                    resolvedMealPlanId = currentPlan.id
                }

                const detail = await planningApi.getMealPlanDetail(resolvedMealPlanId)
                const matchingDay =
                    detail.days.find((day) => day.items.some((item) => item.id === mealPlanItemId)) ??
                    (dayIndex != null ? detail.days.find((day) => day.day_index === dayIndex) : null)

                const matchingItem = matchingDay?.items.find((item) => item.id === mealPlanItemId)

                if (!matchingDay || !matchingItem) {
                    throw new Error('Could not find the selected meal item inside the meal plan.')
                }

                const [recipeDetail, groupMembers] = await Promise.all([
                    recipesApi.getById(matchingItem.recipe_id),
                    onboardingApi.listMembers(detail.summary.group_id),
                ])

                if (!isMounted) {
                    return
                }

                setMealPlanId(detail.summary.id)
                setDayIndex(matchingDay.day_index)
                setMealItem(matchingItem)
                setAdaptations(matchingItem.adaptations)
                setRecipe(recipeDetail)
                setMembers(groupMembers)
                setSelectedMemberId(groupMembers[0]?.id ?? '')
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load meal adaptations.'))
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void loadContext()

        return () => {
            isMounted = false
        }
    }, [dayIndex, mealPlanId, mealPlanItemId])

    const selectedOption = adaptationCatalog[selectedAdaptationType]
    const latestAdaptation = useMemo(() => {
        if (!adaptations.length) {
            return null
        }

        return adaptations[adaptations.length - 1]
    }, [adaptations])

    async function handleApplyAdaptation() {
        if (!mealPlanItemId || !selectedMemberId) {
            setErrorMessage('Choose a member before applying an adaptation.')
            return
        }

        setIsSubmitting(true)
        setErrorMessage('')
        setSuccessMessage('')

        try {
            const created = await planningApi.createAdaptation(mealPlanItemId, {
                member_id: selectedMemberId,
                adaptation_type: selectedAdaptationType,
            })
            setAdaptations((current) => [...current, created])
            setSuccessMessage('Adaptation applied successfully.')
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error, 'Unable to apply this adaptation.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return <AppLoader message="Loading meal adaptation..." />
    }

    if (errorMessage && (!mealItem || !mealPlanId)) {
        return (
            <section className="plan-page">
                <section className="app-page__section">
                    <article className="app-page__detail-card app-page__error-card">
                        <p className="app-page__eyebrow">Meal adaptation</p>
                        <h1 className="app-page__title">We couldn&apos;t load this meal</h1>
                        <p className="app-page__body">{errorMessage}</p>
                        <Link className="app-page__button" to={ROUTES.app.mealPlans.current}>
                            Back to weekly plan
                        </Link>
                    </article>
                </section>
            </section>
        )
    }

    if (!mealItem || !mealPlanId) {
        return null
    }

    const backToDayRoute = dayIndex != null
        ? ROUTES.app.mealPlans.dayDetails(mealPlanId, String(dayIndex))
        : ROUTES.app.mealPlans.details(mealPlanId)

    return (
        <section className="plan-page plan-page--adaptation">
            <header className="plan-page__header-shell">
                <div className="plan-page__brand-row">
                    <div className="plan-page__avatar-dot plan-page__avatar-dot--warm" aria-hidden="true" />
                    <span className="plan-page__brand">The Editorial Kitchen</span>
                </div>

                <button type="button" className="plan-page__icon-button" aria-label="Notifications">
                    <BellIcon className="plan-page__icon" />
                </button>
            </header>

            <section className="plan-page__stack plan-page__stack--adaptation">
                <article className="plan-page__card plan-page__card--soft plan-page__adaptation-hero">
                    <span className="plan-page__mini-tag">Original Recipe</span>
                    {recipe?.image_url ? (
                        <img className="plan-page__adaptation-image" src={recipe.image_url} alt={mealItem.recipe_title} />
                    ) : null}
                </article>

                <section className="plan-page__block">
                    <p className="plan-page__eyebrow">Current Selection</p>
                    <h1 className="plan-page__adaptation-title">{mealItem.recipe_title}</h1>
                    <p className="plan-page__body">
                        {recipe?.short_description || mealItem.selection_reason_summary || 'This meal is part of the current plan and can be adapted member-by-member.'}
                    </p>
                </section>

                <section className="plan-page__adaptation-stats">
                    <article className="plan-page__adaptation-stat">
                        <span className="plan-page__mini-label">Cost / Serving</span>
                        <strong>{formatMoney(mealItem.estimated_cost)}</strong>
                    </article>
                    <article className="plan-page__adaptation-stat">
                        <span className="plan-page__mini-label">Calories</span>
                        <strong>{Math.round(Number(mealItem.estimated_calories) || 0)} kcal</strong>
                    </article>
                    <article className="plan-page__adaptation-stat">
                        <span className="plan-page__mini-label">Prep Time</span>
                        <strong>{recipe?.total_time_minutes ?? '—'} min</strong>
                    </article>
                </section>

                <section className="plan-page__block">
                    <h2 className="plan-page__headline">Choose Member</h2>
                    <div className="plan-page__chips-row">
                        {members.map((member) => (
                            <button
                                key={member.id}
                                type="button"
                                className={`plan-page__pill ${selectedMemberId === member.id ? 'plan-page__pill--active' : ''}`}
                                onClick={() => setSelectedMemberId(member.id)}
                            >
                                {member.display_name}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="plan-page__block">
                    <h2 className="plan-page__headline">Select Adaptation</h2>
                    <div className="plan-page__adaptation-grid">
                        {(Object.keys(adaptationCatalog) as AdaptationType[]).map((adaptationType) => {
                            const option = adaptationCatalog[adaptationType]
                            const Icon = optionIconMap[option.icon]
                            const active = selectedAdaptationType === adaptationType

                            return (
                                <button
                                    key={adaptationType}
                                    type="button"
                                    className={`plan-page__adaptation-option ${active ? 'plan-page__adaptation-option--active' : ''}`}
                                    onClick={() => setSelectedAdaptationType(adaptationType)}
                                >
                                    <span className="plan-page__adaptation-option-icon">
                                        <Icon className="plan-page__inline-icon" />
                                    </span>
                                    <div className="plan-page__adaptation-option-copy">
                                        <strong>{option.title}</strong>
                                        <span>{option.subtitle}</span>
                                        <small>{option.impact}</small>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </section>

                <section className="plan-page__card plan-page__card--soft plan-page__change-card">
                    <div className="plan-page__change-heading">
                        <SwapArrowsIcon className="plan-page__inline-icon" />
                        <h2 className="plan-page__headline">What&apos;s Changing?</h2>
                    </div>

                    <div className="plan-page__changes-list">
                        {adaptations.length ? (
                            adaptations.map((change) => (
                                <article key={change.id} className="plan-page__change-item">
                                    <span className="plan-page__change-badge">
                                        <SparkIcon className="plan-page__inline-icon" />
                                    </span>
                                    <div>
                                        <h3 className="plan-page__change-title">{titleCase(change.adaptation_type)}</h3>
                                        <p className="plan-page__change-copy">{change.description}</p>
                                        <p className="plan-page__caption">Applied for {change.member_name}</p>
                                    </div>
                                </article>
                            ))
                        ) : (
                            <article className="plan-page__change-item">
                                <span className="plan-page__change-badge">
                                    <SparkIcon className="plan-page__inline-icon" />
                                </span>
                                <div>
                                    <h3 className="plan-page__change-title">{selectedOption.title}</h3>
                                    <p className="plan-page__change-copy">{selectedOption.subtitle}</p>
                                    <p className="plan-page__caption">{selectedOption.impact}</p>
                                </div>
                            </article>
                        )}
                    </div>
                </section>

                <section className="plan-page__block">
                    <h2 className="plan-page__headline">Delta Metrics</h2>
                    <div className="plan-page__delta-stack">
                        <div className="plan-page__delta-row">
                            <div>
                                <span className="plan-page__mini-label">Price Delta</span>
                                <strong className={`plan-page__delta-value ${Number(latestAdaptation?.price_delta ?? 0) <= 0 ? 'plan-page__delta-value--positive' : ''}`}>
                                    {formatMoney(latestAdaptation?.price_delta ?? 0)}
                                </strong>
                                <small className="plan-page__caption">per serving</small>
                            </div>
                            <span className="plan-page__delta-bar">
                                <span className="plan-page__delta-bar-fill" />
                            </span>
                        </div>
                        <div className="plan-page__delta-row">
                            <div>
                                <span className="plan-page__mini-label">Calorie Shift</span>
                                <strong className="plan-page__delta-value">{formatNumberDelta(latestAdaptation?.calorie_delta ?? 0, 'kcal')}</strong>
                                <small className="plan-page__caption">energy impact</small>
                            </div>
                            <small className="plan-page__caption plan-page__caption--caps">
                                {formatNumberDelta(latestAdaptation?.protein_delta_g ?? 0, 'g protein')}
                            </small>
                        </div>
                        <div className="plan-page__delta-row plan-page__delta-row--card">
                            <div className="plan-page__ring-card">
                                <span className="plan-page__ring">Macro</span>
                                <div>
                                    <strong className="plan-page__change-title">Latest adaptation snapshot</strong>
                                    <p className="plan-page__caption">
                                        {latestAdaptation
                                            ? `${formatNumberDelta(latestAdaptation.fat_delta_g, 'g fat')} · ${formatNumberDelta(latestAdaptation.carb_delta_g, 'g carbs')}`
                                            : 'Apply an adaptation to see the resulting macro shift here.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </section>

            {errorMessage ? (
                <section className="app-page__section" style={{ marginTop: 0 }}>
                    <article className="app-page__detail-card app-page__error-card">
                        <p className="app-page__body">{errorMessage}</p>
                    </article>
                </section>
            ) : null}

            {successMessage ? (
                <section className="app-page__section" style={{ marginTop: 0 }}>
                    <article className="app-page__detail-card">
                        <p className="app-page__body">{successMessage}</p>
                    </article>
                </section>
            ) : null}

            <div className="plan-page__footer-cta plan-page__footer-cta--stacked">
                <button type="button" className="app-page__button plan-page__primary-link" onClick={handleApplyAdaptation} disabled={isSubmitting || !selectedMemberId}>
                    <MagicWandIcon className="plan-page__inline-icon" />
                    <span>{isSubmitting ? 'Applying...' : 'Apply Adaptation'}</span>
                </button>
                <Link className="plan-page__subtle-link" to={backToDayRoute}>
                    Keep original recipe
                </Link>
                <Link className="plan-page__helper-link" to={ROUTES.app.mealPlans.details(mealPlanId)}>
                    <ShoppingCartIcon className="plan-page__inline-icon" />
                    Back to weekly plan
                </Link>
            </div>
        </section>
    )
}
