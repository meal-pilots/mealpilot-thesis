import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '../router/paths'
import './AppLayout.css'
import {
    HomeIcon,
    PlanIcon,
    ProfileIcon,
    RecipesIcon,
    ShoppingCartIcon,
} from '../../pages/app/AppIcons'
import { dashboardApi } from '../../features/dashboard/api/dashboardApi'
import { planningApi } from '../../features/planning/api/planningApi'
import { useState } from 'react'

const primaryNavItems = [
    {
        to: ROUTES.app.dashboard,
        label: 'Home',
        icon: HomeIcon,
    },
    {
        to: ROUTES.app.recipes,
        label: 'Recipes',
        icon: RecipesIcon,
    },
    {
        to: ROUTES.app.mealPlans.current,
        label: 'Plan',
        icon: PlanIcon,
    },
    {
        to: ROUTES.app.profile,
        label: 'Profile',
        icon: ProfileIcon,
    },
] as const

function isShoppingRoute(pathname: string) {
    return /\/app\/meal-plans\/[^/]+\/shopping-list\/?$/.test(pathname)
}

export function AppLayout() {
    const navigate = useNavigate()
    const location = useLocation()
    const [isResolvingShoppingRoute, setIsResolvingShoppingRoute] = useState(false)

    async function handleShoppingNavigation() {
        if (isResolvingShoppingRoute) {
            return
        }

        setIsResolvingShoppingRoute(true)

        try {
            const activeGroup = await dashboardApi.getActiveGroup()

            if (!activeGroup) {
                navigate(ROUTES.app.mealPlans.generate)
                return
            }

            const currentMealPlan = await planningApi.getCurrentMealPlan(activeGroup.id)

            if (!currentMealPlan?.id) {
                navigate(ROUTES.app.mealPlans.generate)
                return
            }

            navigate(ROUTES.app.mealPlans.shoppingList(currentMealPlan.id))
        } catch {
            navigate(ROUTES.app.mealPlans.generate)
        } finally {
            setIsResolvingShoppingRoute(false)
        }
    }

    return (
        <div className="app-layout">
            <div className="app-layout__glow" aria-hidden="true" />

            <main className="app-layout__main">
                <Outlet />
            </main>

            <div className="app-layout__nav-wrap">
                <nav className="app-layout__nav" aria-label="Primary navigation">
                    {primaryNavItems.slice(0, 3).map((item) => {
                        const Icon = item.icon

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `app-layout__nav-link ${isActive ? 'app-layout__nav-link--active' : ''}`
                                }
                            >
                                <Icon className="app-layout__nav-icon" />
                                <span>{item.label}</span>
                            </NavLink>
                        )
                    })}

                    <button
                        type="button"
                        className={`app-layout__nav-link ${isShoppingRoute(location.pathname) ? 'app-layout__nav-link--active' : ''}`}
                        onClick={handleShoppingNavigation}
                        disabled={isResolvingShoppingRoute}
                        aria-label="Open shopping list"
                    >
                        <ShoppingCartIcon className="app-layout__nav-icon" />
                        <span>{isResolvingShoppingRoute ? 'Loading...' : 'Shopping'}</span>
                    </button>

                    {primaryNavItems.slice(3).map((item) => {
                        const Icon = item.icon

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `app-layout__nav-link ${isActive ? 'app-layout__nav-link--active' : ''}`
                                }
                            >
                                <Icon className="app-layout__nav-icon" />
                                <span>{item.label}</span>
                            </NavLink>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}