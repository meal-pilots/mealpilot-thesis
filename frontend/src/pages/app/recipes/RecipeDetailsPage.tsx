import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/paths'
import type { RecipeDetail } from '../../../entities/recipe/model/types'
import { recipesApi } from '../../../features/recipes/api/recipesApi'
import { getApiErrorMessage } from '../../../shared/lib/get-api-error-message'
import { AppLoader } from '../../../shared/ui/AppLoader'
import '../AppPages.css'
import {
    ArrowLeftIcon,
    ClockIcon,
    FireIcon,
    HeartIcon,
    SparkIcon,
} from '../AppIcons'

function formatTagLabel(tagKey: string) {
    return tagKey
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function formatNumber(value: string | number | null | undefined, suffix = '') {
    if (value == null) {
        return '—'
    }

    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
        return `${String(value)}${suffix}`
    }

    return `${Math.round(numeric)}${suffix}`
}

function formatEstimatedPrice(value: string | null | undefined) {
    if (!value) {
        return ''
    }

    const numeric = Number(String(value).replace(/[^\d.-]/g, ''))

    if (Number.isNaN(numeric)) {
        return String(value)
            .replace(/\$/g, '₸')
            .replace(/\bUSD\b/gi, 'KZT')
            .replace(/\bEUR\b/gi, 'KZT')
            .replace(/\bRUB\b/gi, 'KZT')
    }

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(numeric)
}

export function RecipeDetailsPage() {
    const { recipeId } = useParams()
    const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
    const [isLoading, setIsLoading] = useState(true)
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        let isMounted = true

        async function loadRecipeDetails() {
            if (!recipeId) {
                setErrorMessage('Recipe id is missing.')
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setErrorMessage('')

            try {
                const [detail, favorites] = await Promise.all([
                    recipesApi.getById(recipeId),
                    recipesApi.listFavorites(),
                ])

                if (!isMounted) {
                    return
                }

                setRecipe(detail)
                setFavoriteIds(new Set(favorites.map((item) => item.recipe_id)))
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load this recipe.'))
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void loadRecipeDetails()

        return () => {
            isMounted = false
        }
    }, [recipeId])

    const isFavorite = useMemo(() => {
        if (!recipe) {
            return false
        }

        return favoriteIds.has(recipe.id)
    }, [favoriteIds, recipe])

    async function handleToggleFavorite() {
        if (!recipe || isTogglingFavorite) {
            return
        }

        setIsTogglingFavorite(true)
        setErrorMessage('')

        try {
            if (isFavorite) {
                await recipesApi.removeFavorite(recipe.id)
                setFavoriteIds((current) => {
                    const next = new Set(current)
                    next.delete(recipe.id)
                    return next
                })
            } else {
                await recipesApi.addFavorite(recipe.id)
                setFavoriteIds((current) => new Set([...current, recipe.id]))
            }
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error, 'Unable to update favorites right now.'))
        } finally {
            setIsTogglingFavorite(false)
        }
    }

    if (isLoading) {
        return <AppLoader message="Loading recipe details..." />
    }

    if (!recipe) {
        return (
            <section className="app-page">
                <div className="app-page__section">
                    <Link className="app-page__back" to={ROUTES.app.recipes}>
                        <ArrowLeftIcon className="app-page__back-icon" /> Back to recipes
                    </Link>
                </div>
                <div className="app-page__section">
                    <article className="app-page__detail-card app-page__error-card">
                        <p className="app-page__body">{errorMessage || 'Recipe not found.'}</p>
                    </article>
                </div>
            </section>
        )
    }

    return (
        <section className="app-page">
            <div className="app-page__section">
                <Link className="app-page__back" to={ROUTES.app.recipes}>
                    <ArrowLeftIcon className="app-page__back-icon" /> Back to recipes
                </Link>
            </div>

            {errorMessage ? (
                <div className="app-page__section">
                    <article className="app-page__detail-card app-page__error-card">
                        <p className="app-page__body">{errorMessage}</p>
                    </article>
                </div>
            ) : null}

            <div className="app-page__section">
                <article className="app-page__detail-hero">
                    {recipe.image_url && <img className="app-page__detail-image" src={recipe.image_url} alt={recipe.title} />}

                    <div className="app-page__hero app-page__detail-card">
                        <div className="app-page__hero-inner">
                            <div className="app-page__chips">
                                {recipe.tags.map((tag) => (
                                    <span key={tag} className="app-page__detail-tag">
                                        {formatTagLabel(tag)}
                                    </span>
                                ))}
                            </div>

                            <div className="app-page__pair">
                                <div>
                                    <p className="app-page__eyebrow">{recipe.cuisine_type.replace(/_/g, ' ')}</p>
                                    <h1 className="app-page__title">{recipe.title}</h1>
                                </div>
                                <button
                                    type="button"
                                    className={`app-page__icon-button ${isFavorite ? 'app-page__favorite-button--active' : ''}`}
                                    aria-label={isFavorite ? 'Remove from favorites' : 'Save recipe'}
                                    aria-pressed={isFavorite}
                                    onClick={handleToggleFavorite}
                                    disabled={isTogglingFavorite}
                                >
                                    <HeartIcon className={`app-page__meta-icon ${isFavorite ? 'app-page__favorite-active' : ''}`} />
                                </button>
                            </div>

                            <p className="app-page__body">{recipe.long_description || recipe.short_description}</p>

                            <div className="app-page__meta">
                                <span className="app-page__meta-item">
                                    <ClockIcon className="app-page__meta-icon" />
                                    <span className="app-page__meta-text">{recipe.total_time_minutes} min</span>
                                </span>
                                <span className="app-page__meta-item">
                                    <FireIcon className="app-page__meta-icon" />
                                    <span className="app-page__meta-text">{formatNumber(recipe.nutrition.calories_per_serving, ' kcal')}</span>
                                </span>
                                <span className="app-page__meta-item">
                                    <SparkIcon className="app-page__meta-icon" />
                                    <span className="app-page__meta-text">{recipe.servings_default} servings</span>
                                </span>
                                <span className="app-page__meta-item">
                                    <SparkIcon className="app-page__meta-icon" />
                                    <span className="app-page__meta-text">{formatTagLabel(recipe.difficulty_level)}</span>
                                </span>
                            </div>
                        </div>

                        <div className="app-page__detail-actions">
                            <button type="button" className="app-page__button" onClick={handleToggleFavorite} disabled={isTogglingFavorite}>
                                {isFavorite ? 'Saved to favorites' : 'Save recipe'}
                            </button>
                            <Link className="app-page__button--secondary" to={ROUTES.app.mealPlans.generate}>
                                Add to this week&apos;s plan
                            </Link>
                        </div>
                    </div>
                </article>
            </div>

            <div className="app-page__section">
                <div className="app-page__detail-grid">
                    <article className="app-page__detail-card">
                        <p className="app-page__eyebrow">Ingredients</p>
                        <h2 className="app-page__detail-title">Everything you need</h2>
                        <ul className="app-page__ingredient-list">
                            {recipe.ingredients.map((ingredient) => (
                                <li key={ingredient.ingredient_id} className="app-page__ingredient app-page__ingredient--stacked">
                                    <span>
                                        {ingredient.quantity} {ingredient.unit} {ingredient.name}
                                        {ingredient.is_optional ? ' (optional)' : ''}
                                    </span>
                                    {(ingredient.estimated_price || ingredient.preparation_note) ? (
                                        <span className="app-page__ingredient-meta">
                                            {ingredient.estimated_price ? `~ ${formatEstimatedPrice(ingredient.estimated_price)}` : ''}
                                            {ingredient.estimated_price && ingredient.preparation_note ? ' · ' : ''}
                                            {ingredient.preparation_note ?? ''}
                                        </span>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    </article>

                    <article className="app-page__detail-card">
                        <p className="app-page__eyebrow">Nutrition</p>
                        <h2 className="app-page__detail-title">Balanced by design</h2>
                        <div className="app-page__nutrition-grid">
                            <div className="app-page__nutrition-card">
                                <p className="app-page__stat-label">Protein</p>
                                <p className="app-page__nutrition-value">{formatNumber(recipe.nutrition.protein_per_serving_g, ' g')}</p>
                            </div>
                            <div className="app-page__nutrition-card">
                                <p className="app-page__stat-label">Carbs</p>
                                <p className="app-page__nutrition-value">{formatNumber(recipe.nutrition.carb_per_serving_g, ' g')}</p>
                            </div>
                            <div className="app-page__nutrition-card">
                                <p className="app-page__stat-label">Fat</p>
                                <p className="app-page__nutrition-value">{formatNumber(recipe.nutrition.fat_per_serving_g, ' g')}</p>
                            </div>
                            <div className="app-page__nutrition-card">
                                <p className="app-page__stat-label">Fit score</p>
                                <p className="app-page__nutrition-value">{Math.round(recipe.suitability.fit_score * 100)}%</p>
                            </div>
                        </div>
                        {(recipe.suitability.matches.length || recipe.suitability.conflicts.length) ? (
                            <div className="app-page__helper-row">
                                {recipe.suitability.matches.length ? (
                                    <p className="app-page__helper">
                                        Matches: {recipe.suitability.matches.join(', ')}
                                    </p>
                                ) : null}
                                {recipe.suitability.conflicts.length ? (
                                    <p className="app-page__helper">
                                        Conflicts: {recipe.suitability.conflicts.join(', ')}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                    </article>
                </div>
            </div>

            {recipe.substitutions.length ? (
                <div className="app-page__section">
                    <article className="app-page__detail-card">
                        <p className="app-page__eyebrow">Smart substitutions</p>
                        <h2 className="app-page__detail-title">Keep the dish flexible</h2>
                        <div className="app-page__list">
                            {recipe.substitutions.map((substitution) => (
                                <div key={`${substitution.ingredient_id}-${substitution.substitute_ingredient_id}`} className="app-page__surface">
                                    <p className="app-page__subheading">{substitution.ingredient_name} → {substitution.substitute_name}</p>
                                    <p className="app-page__helper">{substitution.reason}</p>
                                </div>
                            ))}
                        </div>
                    </article>
                </div>
            ) : null}

            <div className="app-page__section">
                <article className="app-page__detail-card">
                    <p className="app-page__eyebrow">Method</p>
                    <h2 className="app-page__detail-title">Cook it with calm precision</h2>
                    <div className="app-page__steps">
                        {recipe.steps.map((step) => (
                            <div key={`${step.order}-${step.instruction_text}`} className="app-page__step">
                                <span className="app-page__step-index">{step.order}</span>
                                <div>
                                    <p className="app-page__step-text">{step.instruction_text}</p>
                                    {step.duration_minutes ? (
                                        <p className="app-page__helper">~ {step.duration_minutes} min</p>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </div>
        </section>
    )
}
