import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../app/router/paths'
import type { RecipeCard, RecipeTagItem } from '../../../entities/recipe/model/types'
import { recipesApi, type PaginationMeta } from '../../../features/recipes/api/recipesApi'
import { getApiErrorMessage } from '../../../shared/lib/get-api-error-message'
import { AppLoader } from '../../../shared/ui/AppLoader'
import '../AppPages.css'
import { ClockIcon, FireIcon, SearchIcon, SparkIcon } from '../AppIcons'

const RECIPES_PAGE_SIZE = 24
const SEARCH_DEBOUNCE_MS = 350

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
    const catalogTopRef = useRef<HTMLDivElement | null>(null)
    const shouldScrollToCatalogTopRef = useRef(false)
    const [recipes, setRecipes] = useState<RecipeCard[]>([])
    const [tags, setTags] = useState<RecipeTagItem[]>([])
    const [activeTag, setActiveTag] = useState<string>('all')
    const [searchInput, setSearchInput] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null)
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
        const timeoutId = window.setTimeout(() => {
            setSearchQuery(searchInput.trim())
            setCurrentPage(1)
        }, SEARCH_DEBOUNCE_MS)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [searchInput])

    useEffect(() => {
        let isMounted = true

        async function loadRecipes() {
            setIsRefreshing(true)
            setErrorMessage('')

            try {
                const response = await recipesApi.listPaginated({
                    search: searchQuery,
                    tagKey: activeTag === 'all' ? null : activeTag,
                    page: currentPage,
                    pageSize: RECIPES_PAGE_SIZE,
                })

                if (isMounted) {
                    setRecipes(response.data)
                    setPaginationMeta(response.meta)

                    if (shouldScrollToCatalogTopRef.current) {
                        shouldScrollToCatalogTopRef.current = false

                        window.requestAnimationFrame(() => {
                            window.requestAnimationFrame(() => {
                                const catalogTop = catalogTopRef.current?.getBoundingClientRect().top

                                if (typeof catalogTop === 'number') {
                                    window.scrollTo({
                                        top: window.scrollY + catalogTop - 16,
                                        behavior: 'smooth',
                                    })
                                }
                            })
                        })
                    }
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load recipes right now.'))
                    setRecipes([])
                    setPaginationMeta(null)
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
    }, [activeTag, currentPage, searchQuery])

    const filters = useMemo(
        () => [{ key: 'all', label: 'All' }, ...tags.map((tag) => ({ key: tag.key, label: tag.label }))],
        [tags],
    )
    const paginationItems = useMemo<(number | 'ellipsis')[]>(() => {
        const totalPages = paginationMeta?.total_pages ?? 1

        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, index) => index + 1)
        }

        const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
        const sortedPages = Array.from(pages)
            .filter((page) => page >= 1 && page <= totalPages)
            .sort((left, right) => left - right)

        return sortedPages.reduce<(number | 'ellipsis')[]>((items, page) => {
            const previous = items[items.length - 1]

            if (typeof previous === 'number' && page - previous > 1) {
                items.push('ellipsis')
            }

            items.push(page)
            return items
        }, [])
    }, [currentPage, paginationMeta?.total_pages])

    const featuredRecipe = recipes[0] ?? null
    const remainingRecipes = featuredRecipe ? recipes.slice(1) : recipes
    const totalRecipes = paginationMeta?.total ?? recipes.length
    const totalPages = paginationMeta?.total_pages ?? 1
    const resolvedPage = paginationMeta?.page ?? currentPage
    const resolvedPageSize = paginationMeta?.page_size ?? RECIPES_PAGE_SIZE
    const pageStart = totalRecipes > 0 ? (resolvedPage - 1) * resolvedPageSize + 1 : 0
    const pageEnd = totalRecipes > 0 ? Math.min(pageStart + recipes.length - 1, totalRecipes) : 0

    function handleSearchChange(value: string) {
        setSearchInput(value)
    }

    function handleTagChange(tagKey: string) {
        setActiveTag(tagKey)
        setCurrentPage(1)
    }

    function handlePageChange(page: number) {
        if (page === currentPage || page < 1 || page > totalPages) {
            return
        }

        const shouldScrollToCatalogTop = page > currentPage

        shouldScrollToCatalogTopRef.current = shouldScrollToCatalogTop
        setCurrentPage(page)
    }

    if (isLoading) {
        return <AppLoader message="Loading recipe archive..." />
    }

    return (
        <section className="app-page">
            <div className="app-page__section" ref={catalogTopRef}>
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
                        value={searchInput}
                        onChange={(event) => handleSearchChange(event.target.value)}
                    />
                </div>

                <div className="app-page__chips">
                    {filters.map((filter) => (
                        <button
                            key={filter.key}
                            type="button"
                            className={`app-page__chip-button ${activeTag === filter.key ? 'app-page__chip-button--active' : ''}`}
                            onClick={() => handleTagChange(filter.key)}
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
                    <p className="app-page__helper">
                        {isRefreshing
                            ? 'Refreshing...'
                            : totalRecipes
                              ? `${pageStart}-${pageEnd} of ${totalRecipes} recipes`
                              : '0 recipes shown'}
                    </p>
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

                {totalPages > 1 ? (
                    <nav className="app-page__pagination" aria-label="Recipe pages">
                        <button
                            type="button"
                            className="app-page__pagination-button"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1 || isRefreshing}
                        >
                            Previous
                        </button>

                        <div className="app-page__pagination-pages">
                            {paginationItems.map((item, index) =>
                                item === 'ellipsis' ? (
                                    <span key={`ellipsis-${index}`} className="app-page__pagination-ellipsis">
                                        ...
                                    </span>
                                ) : (
                                    <button
                                        key={item}
                                        type="button"
                                        className={`app-page__pagination-page ${currentPage === item ? 'app-page__pagination-page--active' : ''}`}
                                        onClick={() => handlePageChange(item)}
                                        disabled={isRefreshing}
                                        aria-current={currentPage === item ? 'page' : undefined}
                                    >
                                        {item}
                                    </button>
                                ),
                            )}
                        </div>

                        <button
                            type="button"
                            className="app-page__pagination-button"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages || isRefreshing}
                        >
                            Next
                        </button>
                    </nav>
                ) : null}
            </div>
        </section>
    )
}
