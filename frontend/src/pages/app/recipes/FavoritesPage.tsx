import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../app/router/paths'
import type { FavoriteRecipeListItem } from '../../../entities/recipe/model/types'
import { recipesApi } from '../../../features/recipes/api/recipesApi'
import { getApiErrorMessage } from '../../../shared/lib/get-api-error-message'
import '../AppPages.css'
import { ChevronRightIcon, HeartIcon } from '../AppIcons'

function formatScore(value: number | string | null | undefined) {
    const numericValue = Number(value ?? 0)

    if (!Number.isFinite(numericValue)) {
        return '--'
    }

    return `${Math.round(numericValue * 100)}%`
}

function recipeCountLabel(count: number) {
    return `${count} ${count === 1 ? 'recipe' : 'recipes'}`
}

export function FavoritesPage() {
    const [favorites, setFavorites] = useState<FavoriteRecipeListItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    async function loadFavorites({ showLoader = false } = {}) {
        if (showLoader) {
            setIsLoading(true)
        } else {
            setIsRefreshing(true)
        }

        setErrorMessage('')

        try {
            const loadedFavorites = await recipesApi.listFavorites()
            setFavorites(loadedFavorites)
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error, 'Unable to load favorite recipes.'))
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        void loadFavorites({ showLoader: true })
    }, [])

    return (
        <section className="app-page app-page--favorites">
            <header className="app-page__favorites-header">
                <div>
                    <h1 className="app-page__favorites-title">Favorites</h1>
                    <p className="app-page__favorites-count">
                        {isLoading ? 'Loading saved recipes...' : recipeCountLabel(favorites.length)}
                    </p>
                </div>

                <button
                    className="app-page__favorites-refresh"
                    type="button"
                    onClick={() => void loadFavorites()}
                    disabled={isLoading || isRefreshing}
                >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </header>

            {errorMessage ? (
                <div className="app-page__favorites-alert" role="status">
                    <p>{errorMessage}</p>
                    <button type="button" onClick={() => void loadFavorites({ showLoader: true })}>
                        Try again
                    </button>
                </div>
            ) : null}

            {isLoading ? (
                <div className="app-page__favorites-list" aria-label="Loading favorite recipes">
                    {Array.from({ length: 4 }, (_, index) => (
                        <div key={index} className="app-page__favorite-card app-page__favorite-card--skeleton">
                            <span className="app-page__favorite-icon-wrap" />
                            <span className="app-page__favorite-copy">
                                <span className="app-page__favorite-skeleton-line app-page__favorite-skeleton-line--short" />
                                <span className="app-page__favorite-skeleton-line" />
                            </span>
                        </div>
                    ))}
                </div>
            ) : favorites.length ? (
                <div className="app-page__favorites-list">
                    {favorites.map((favorite) => (
                        <Link
                            key={favorite.recipe_id}
                            className="app-page__favorite-card"
                            to={ROUTES.app.recipeDetails(favorite.recipe_id)}
                        >
                            <span className="app-page__favorite-icon-wrap" aria-hidden="true">
                                <HeartIcon className="app-page__favorite-icon" />
                            </span>

                            <span className="app-page__favorite-copy">
                                <span className="app-page__favorite-fit">
                                    {formatScore(favorite.fit_score)} fit
                                </span>
                                <span className="app-page__favorite-title">{favorite.title}</span>
                            </span>

                            <ChevronRightIcon className="app-page__favorite-chevron" />
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="app-page__favorites-empty">
                    <span className="app-page__favorites-empty-icon" aria-hidden="true">
                        <HeartIcon className="app-page__favorites-empty-heart" />
                    </span>
                    <h2 className="app-page__favorites-empty-title">Nothing saved yet</h2>
                    <p className="app-page__favorites-empty-copy">
                        Open a recipe and tap the heart to keep it here for quick access.
                    </p>
                    <Link className="app-page__favorites-empty-action" to={ROUTES.app.recipes}>
                        Browse recipes
                    </Link>
                </div>
            )}
        </section>
    )
}
