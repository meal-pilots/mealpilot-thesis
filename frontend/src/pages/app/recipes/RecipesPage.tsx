import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../app/router/paths'
import type { RecipeCard, RecipeTagItem } from '../../../entities/recipe/model/types'
import { recipesApi } from '../../../features/recipes/api/recipesApi'
import { getApiErrorMessage } from '../../../shared/lib/get-api-error-message'
import { AppLoader } from '../../../shared/ui/AppLoader'
import '../AppPages.css'
import { ClockIcon, FireIcon, SearchIcon, SparkIcon } from '../AppIcons'

function formatTagLabel(tagKey: string, allTags: RecipeTagItem[]) {
    const matchingTag = allTags.find((tag) => tag.key === tagKey)
    if (matchingTag) {
        return matchingTag.label
    }

    return tagKey
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function formatRecipeSubtitle(recipe: RecipeCard) {
    const protein = Math.round(Number(recipe.protein_per_serving_g ?? 0))
    const cost = Number(recipe.estimated_cost ?? 0)
    return `${protein} g protein · ${Number.isNaN(cost) ? 'Flexible budget' : `${cost.toFixed(0)} ₸ est.`}`
}

export function RecipesPage() {
    const [recipes, setRecipes] = useState<RecipeCard[]>([])
    const [tags, setTags] = useState<RecipeTagItem[]>([])
    const [activeTag, setActiveTag] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        let isMounted = true

        async function bootstrap() {
            setIsLoading(true)
            setErrorMessage('')

            try {
                const loadedTags = await recipesApi.listTags()

                if (!isMounted) {
                    return
                }

                setTags(loadedTags)
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load recipe filters.'))
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void bootstrap()

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        let isMounted = true

        async function loadRecipes() {
            setIsRefreshing(true)
            setErrorMessage('')

            try {
                const loadedRecipes = await recipesApi.list({
                    search: searchQuery,
                    tagKey: activeTag === 'all' ? null : activeTag,
                    pageSize: 24,
                })

                if (isMounted) {
                    setRecipes(loadedRecipes)
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load recipes right now.'))
                }
            } finally {
                if (isMounted) {
                    setIsRefreshing(false)
                }
            }
        }

        void loadRecipes()

        return () => {
            isMounted = false
        }
    }, [activeTag, searchQuery])

    const filters = useMemo(
        () => [{ key: 'all', label: 'All' }, ...tags.map((tag) => ({ key: tag.key, label: tag.label }))],
        [tags],
    )

    const featuredRecipe = recipes[0] ?? null
    const remainingRecipes = featuredRecipe ? recipes.slice(1) : recipes

    if (isLoading) {
        return <AppLoader message="Loading recipe archive..." />
    }

    return (
        <section className="app-page">
            <div className="app-page__section">
                <div className="app-page__pair">
                    <div>
                        <p className="app-page__eyebrow">Recipe archive</p>
                        <h1 className="app-page__title">Curated for your household</h1>
                    </div>
                </div>

                <div className="app-page__search">
                    <SearchIcon className="app-page__meta-icon" />
                    <input
                        className="app-page__search-field"
                        type="search"
                        placeholder="Search by title or description"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                </div>

                <div className="app-page__chips">
                    {filters.map((filter) => (
                        <button
                            key={filter.key}
                            type="button"
                            className={`app-page__chip-button ${activeTag === filter.key ? 'app-page__chip-button--active' : ''}`}
                            onClick={() => setActiveTag(filter.key)}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {errorMessage ? (
                <div className="app-page__section">
                    <article className="app-page__detail-card app-page__error-card">
                        <p className="app-page__body">{errorMessage}</p>
                    </article>
                </div>
            ) : null}

            {featuredRecipe ? (
                <div className="app-page__section">
                    <article className="app-page__recipe-hero app-page__feature-card">
                        {featuredRecipe.image_url && <img className="app-page__feature-image" src={featuredRecipe.image_url} alt={featuredRecipe.title} />}
                        <div className="app-page__feature-body">
                            <div className="app-page__chips">
                                {featuredRecipe.tags.map((tag) => (
                                    <span key={tag} className="app-page__recipe-tag">
                                        {formatTagLabel(tag, tags)}
                                    </span>
                                ))}
                            </div>
                            <h2 className="app-page__title">{featuredRecipe.title}</h2>
                            <p className="app-page__body">
                                {featuredRecipe.cuisine_type.replace(/_/g, ' ')} · Fit score {Math.round(featuredRecipe.fit_score * 100)}% · {featuredRecipe.is_child_friendly ? 'Child-friendly' : 'Chef-curated'}
                            </p>
                            <div className="app-page__meta">
                                <span className="app-page__meta-item">
                                    <ClockIcon className="app-page__meta-icon" />
                                    <span className="app-page__meta-text">{featuredRecipe.total_time_minutes} min</span>
                                </span>
                                <span className="app-page__meta-item">
                                    <FireIcon className="app-page__meta-icon" />
                                    <span className="app-page__meta-text">{Math.round(Number(featuredRecipe.calories_per_serving ?? 0))} kcal</span>
                                </span>
                                <span className="app-page__meta-item">
                                    <SparkIcon className="app-page__meta-icon" />
                                    <span className="app-page__meta-text">{formatRecipeSubtitle(featuredRecipe)}</span>
                                </span>
                            </div>
                            <Link className="app-page__button" to={ROUTES.app.recipeDetails(featuredRecipe.id)}>
                                Open recipe
                            </Link>
                        </div>
                    </article>
                </div>
            ) : null}

            <div className="app-page__section">
                <div className="app-page__section-header">
                    <div>
                        <p className="app-page__eyebrow">Browse more</p>
                        <h2 className="app-page__title">Kitchen library</h2>
                    </div>
                    <p className="app-page__helper">{isRefreshing ? 'Refreshing…' : `${recipes.length} recipes shown`}</p>
                </div>

                {recipes.length === 0 ? (
                    <article className="app-page__detail-card app-page__empty-state">
                        <p className="app-page__eyebrow">No matches</p>
                        <h3 className="app-page__card-title">No recipes fit this search yet</h3>
                        <p className="app-page__body">Try another tag or remove the search phrase to see more published recipes.</p>
                    </article>
                ) : (
                    <div className="app-page__list">
                        {remainingRecipes.map((recipe) => (
                            <Link key={recipe.id} className="app-page__recipe-card" to={ROUTES.app.recipeDetails(recipe.id)}>
                                {recipe.image_url && <img className="app-page__recipe-image" src={recipe.image_url} alt={recipe.title} />}
                                <div className="app-page__recipe-body">
                                    <div className="app-page__chips">
                                        {recipe.tags.slice(0, 3).map((tag) => (
                                            <span key={tag} className="app-page__recipe-tag">
                                                {formatTagLabel(tag, tags)}
                                            </span>
                                        ))}
                                    </div>
                                    <h3 className="app-page__recipe-title">{recipe.title}</h3>
                                    <p className="app-page__muted">{formatRecipeSubtitle(recipe)}</p>
                                    <div className="app-page__meta">
                                        <span className="app-page__meta-item">
                                            <ClockIcon className="app-page__meta-icon" />
                                            <span className="app-page__meta-text">{recipe.total_time_minutes} min</span>
                                        </span>
                                        <span className="app-page__meta-item">
                                            <FireIcon className="app-page__meta-icon" />
                                            <span className="app-page__meta-text">{Math.round(Number(recipe.calories_per_serving ?? 0))} kcal</span>
                                        </span>
                                        <span className="app-page__meta-item">
                                            <SparkIcon className="app-page__meta-icon" />
                                            <span className="app-page__meta-text">Fit {Math.round(recipe.fit_score * 100)}%</span>
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
