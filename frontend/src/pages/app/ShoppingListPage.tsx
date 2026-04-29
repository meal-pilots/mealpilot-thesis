import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '../../app/router/paths'
import { planningApi, type ShoppingListDto, type ShoppingListItemDto } from '../../features/planning/api/planningApi'
import { getApiErrorMessage } from '../../shared/lib/get-api-error-message'
import { AppLoader } from '../../shared/ui/AppLoader'
import {
    ChevronRightIcon,
    LeafIcon,
    PantryIcon,
    PlusIcon,
    ProteinBoltIcon,
    RegenerateIcon,
    ShoppingCartIcon,
} from './AppIcons'
import './AppPages.css'

function categoryIcon(category: string) {
    const normalized = category.trim().toLowerCase()

    if (normalized.includes('produce') || normalized.includes('vegetable') || normalized.includes('fruit')) {
        return LeafIcon
    }

    if (normalized.includes('pantry') || normalized.includes('grain') || normalized.includes('spice')) {
        return PantryIcon
    }

    return ProteinBoltIcon
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

function formatQuantity(value: string | number, unit: string) {
    const numeric = Number(value)

    if (Number.isNaN(numeric)) {
        return `${value} ${unit}`.trim()
    }

    const rendered = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2)
    return `${rendered} ${unit}`.trim()
}

function titleCase(value: string) {
    return value
        .split(/[_-]/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function buildBadge(item: ShoppingListItemDto) {
    const status = item.availability_status?.trim().toLowerCase()

    if (!status || status === 'available') {
        return null
    }

    if (status === 'custom') {
        return { label: 'Custom', tone: 'neutral' as const }
    }

    return {
        label: titleCase(status),
        tone: status.includes('out') || status.includes('low') ? ('alert' as const) : ('premium' as const),
    }
}

function groupItemsByCategory(items: ShoppingListItemDto[]) {
    const groups = new Map<string, ShoppingListItemDto[]>()

    for (const item of items) {
        const key = item.category_label?.trim() || 'Other'
        const bucket = groups.get(key) ?? []
        bucket.push(item)
        groups.set(key, bucket)
    }

    return Array.from(groups.entries()).map(([title, bucket]) => ({
        id: title.toLowerCase().replace(/\s+/g, '-'),
        title,
        itemCount: bucket.length,
        items: bucket,
    }))
}

export function ShoppingListPage() {
    const { mealPlanId } = useParams<{ mealPlanId: string }>()
    const [shoppingList, setShoppingList] = useState<ShoppingListDto | null>(null)
    const [budgetLimit, setBudgetLimit] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [checkedIds, setCheckedIds] = useState<string[]>([])
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        if (!mealPlanId) {
            setIsLoading(false)
            setErrorMessage('Meal plan was not found.')
            return
        }

        let isMounted = true

        async function loadShoppingList() {
            if (!mealPlanId) {
                setIsLoading(false)
                setErrorMessage('Meal plan was not found.')
                return
            }

            setIsLoading(true)
            setErrorMessage('')

            try {
                const [list, budget] = await Promise.all([
                    planningApi.getShoppingList(mealPlanId),
                    planningApi.getBudgetAnalytics(mealPlanId),
                ])

                if (!isMounted) {
                    return
                }

                setShoppingList(list)
                setCheckedIds(list.items.filter((item) => item.is_checked).map((item) => item.id))
                setBudgetLimit(Number(budget.budget_limit))
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load the shopping list.'))
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void loadShoppingList()

        return () => {
            isMounted = false
        }
    }, [mealPlanId])

    const groupedSections = useMemo(
        () => (shoppingList ? groupItemsByCategory(shoppingList.items) : []),
        [shoppingList],
    )

    const progressPercent = useMemo(() => {
        if (!shoppingList) {
            return 0
        }

        if (budgetLimit && budgetLimit > 0) {
            const remaining = Math.max(budgetLimit - Number(shoppingList.total_estimated_cost), 0)
            return Math.min((remaining / budgetLimit) * 100, 100)
        }

        if (!shoppingList.items.length) {
            return 0
        }

        return (checkedIds.length / shoppingList.items.length) * 100
    }, [budgetLimit, checkedIds.length, shoppingList])

    const remainingText = useMemo(() => {
        if (!shoppingList) {
            return ''
        }

        if (budgetLimit && budgetLimit > 0) {
            const remaining = Math.max(budgetLimit - Number(shoppingList.total_estimated_cost), 0)
            return `${Math.round(progressPercent)}% of your weekly budget remaining · ${formatCurrency(remaining)} left`
        }

        return `${checkedIds.length} of ${shoppingList.items.length} items checked off`
    }, [budgetLimit, checkedIds.length, progressPercent, shoppingList])

    async function toggleItem(itemId: string) {
        if (!shoppingList) {
            return
        }

        const isChecked = checkedIds.includes(itemId)
        const nextCheckedIds = isChecked
            ? checkedIds.filter((id) => id !== itemId)
            : [...checkedIds, itemId]

        setCheckedIds(nextCheckedIds)

        try {
            const updated = await planningApi.updateShoppingListItem(itemId, {
                is_checked: !isChecked,
            })

            setShoppingList((current) =>
                current
                    ? {
                        ...current,
                        items: current.items.map((item) =>
                            item.id === itemId ? { ...item, is_checked: updated.is_checked } : item,
                        ),
                    }
                    : current,
            )
        } catch (error) {
            setCheckedIds(checkedIds)
            setErrorMessage(getApiErrorMessage(error, 'Unable to update the shopping item.'))
        }
    }

    async function handleRegenerate() {
        if (!mealPlanId) {
            return
        }

        setIsRefreshing(true)
        setErrorMessage('')

        try {
            const list = await planningApi.regenerateShoppingList(mealPlanId)
            setShoppingList(list)
            setCheckedIds(list.items.filter((item) => item.is_checked).map((item) => item.id))
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error, 'Unable to regenerate the shopping list.'))
        } finally {
            setIsRefreshing(false)
        }
    }

    if (isLoading) {
        return <AppLoader message="Loading your shopping list..." />
    }

    if (!mealPlanId || !shoppingList) {
        return (
            <section className="atelier-page atelier-page--shopping">
                <section className="atelier-page__card atelier-page__hero-card">
                    <h1 className="atelier-page__headline">We couldn&apos;t load this shopping list</h1>
                    <p className="atelier-page__body-copy atelier-page__body-copy--centered">{errorMessage || 'The requested meal plan was not found.'}</p>
                    <Link className="atelier-page__button atelier-page__button--wide" to={ROUTES.app.mealPlans.current}>
                        Back to weekly plan
                    </Link>
                </section>
            </section>
        )
    }

    return (
        <section className="atelier-page atelier-page--shopping">
            <header className="atelier-page__topbar">
                <div className="atelier-page__topbar-main">
                    <div className="atelier-page__icon-button" />
                    <span className="atelier-page__brand">Shopping List</span>
                </div>

                <div className="atelier-page__topbar-actions">
                    <button
                        type="button"
                        className="atelier-page__icon-button"
                        aria-label="Regenerate shopping list"
                        onClick={handleRegenerate}
                        disabled={isRefreshing}
                    >
                        <RegenerateIcon className="atelier-page__icon" />
                    </button>
                </div>
            </header>

            <section className="atelier-page__hero atelier-page__hero--shopping">
                <p className="atelier-page__eyebrow">Your Weekly Harvest</p>
                <h1 className="atelier-page__display">
                    Essentials for the <span>Gathered Table.</span>
                </h1>
            </section>

            <section className="atelier-page__card atelier-page__summary-card">
                <div className="atelier-page__summary-row">
                    <div>
                        <p className="atelier-page__eyebrow">Estimated Total</p>
                        <p className="atelier-page__summary-value">{formatCurrency(shoppingList.total_estimated_cost)}</p>
                    </div>
                    <p className="atelier-page__meta-copy">{shoppingList.items.length} items</p>
                </div>
                <div className="atelier-page__progress">
                    <span className="atelier-page__progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="atelier-page__caption atelier-page__caption--accent">
                    {isRefreshing ? 'Refreshing list…' : remainingText}
                </p>
                {errorMessage ? <p className="atelier-page__caption atelier-page__caption--alert">{errorMessage}</p> : null}
            </section>

            <div className="atelier-page__stack atelier-page__stack--shopping">
                {groupedSections.map((section) => {
                    const Icon = categoryIcon(section.title)

                    return (
                        <section key={section.id} className="atelier-page__group">
                            <div className="atelier-page__group-header">
                                <div className="atelier-page__group-heading">
                                    <span className="atelier-page__mini-icon-badge">
                                        <Icon className="atelier-page__mini-icon" />
                                    </span>
                                    <h2 className="atelier-page__headline">{section.title}</h2>
                                </div>
                                <span className="atelier-page__meta-copy">{section.itemCount} items</span>
                            </div>

                            <div className="atelier-page__list-stack">
                                {section.items.map((item) => {
                                    const isChecked = checkedIds.includes(item.id)
                                    const badge = buildBadge(item)
                                    const firstStore = item.store_prices[0]

                                    return (
                                        <article key={item.id} className="atelier-page__shopping-item-card">
                                            <div className="atelier-page__shopping-item-top">
                                                <button
                                                    type="button"
                                                    className={`atelier-page__check ${isChecked ? 'atelier-page__check--checked' : ''}`}
                                                    onClick={() => void toggleItem(item.id)}
                                                    aria-pressed={isChecked}
                                                    aria-label={`Mark ${item.ingredient_name} as ${isChecked ? 'not purchased' : 'purchased'}`}
                                                >
                                                    {isChecked ? '✓' : ''}
                                                </button>

                                                <div className="atelier-page__shopping-item-copy">
                                                    <div className="atelier-page__shopping-item-title-row">
                                                        <h3 className="atelier-page__item-title">{item.ingredient_name}</h3>
                                                        <p className="atelier-page__item-price">{formatCurrency(item.estimated_price)}</p>
                                                    </div>
                                                    <p className="atelier-page__meta-copy">
                                                        {formatQuantity(item.total_quantity, item.unit)}
                                                        {firstStore ? ` · ${firstStore.store_name}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            {badge ? (
                                                <div className="atelier-page__shopping-inline-note atelier-page__shopping-inline-note--status">
                                                    <span className={`atelier-page__status-badge atelier-page__status-badge--${badge.tone}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>
                                            ) : null}

                                            {firstStore ? (
                                                <div className="atelier-page__shopping-inline-note">
                                                    <span className="atelier-page__mini-icon-badge atelier-page__mini-icon-badge--soft">
                                                        <LeafIcon className="atelier-page__mini-icon" />
                                                    </span>
                                                    <p className="atelier-page__caption">
                                                        Best observed price: {formatCurrency(firstStore.price_amount)} per {firstStore.price_unit}
                                                    </p>
                                                </div>
                                            ) : null}
                                        </article>
                                    )
                                })}
                            </div>
                        </section>
                    )
                })}
            </div>

            <button type="button" className="atelier-page__card atelier-page__add-card" disabled>
                <span className="atelier-page__add-icon-wrap">
                    <PlusIcon className="atelier-page__mini-icon" />
                </span>
                <div>
                    <h3 className="atelier-page__item-title atelier-page__item-title--center">Add New Item</h3>
                    <p className="atelier-page__caption atelier-page__caption--center">Custom items can be added next.</p>
                </div>
            </button>

            <div className="atelier-page__helper-links">
                <Link className="atelier-page__helper-link" to={ROUTES.app.mealPlans.budgetAnalytics(mealPlanId)}>
                    <ShoppingCartIcon className="atelier-page__inline-icon" />
                    Open budget analysis
                </Link>
                <Link className="atelier-page__helper-link" to={ROUTES.app.mealPlans.nutritionAnalytics(mealPlanId)}>
                    <ChevronRightIcon className="atelier-page__inline-icon" />
                    Nutrition analysis
                </Link>
                <Link className="atelier-page__helper-link" to={ROUTES.app.mealPlans.details(mealPlanId)}>
                    <ChevronRightIcon className="atelier-page__inline-icon" />
                    Back to weekly plan
                </Link>
            </div>
        </section>
    )
}
