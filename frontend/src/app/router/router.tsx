import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { OnboardingLayout } from '../layouts/OnboardingLayout'
import { RootLayout } from '../layouts/RootLayout'
import { ScreenPlaceholder } from '../../shared/ui/ScreenPlaceholder'
import { ROUTES } from './paths'
import { WelcomePage } from '../../pages/welcome/WelcomePage'
import { HomePage } from '../../pages/app/HomePage'
import { RecipeDetailsPage } from '../../pages/app/recipes/RecipeDetailsPage'
import { RecipesPage } from '../../pages/app/recipes/RecipesPage'
import { LogInPage } from '../../pages/auth/LogInPage'
import { SignUpPage } from '../../pages/auth/SignUpPage'
import { ModeSelectionPage } from '../../pages/onboarding/ModeSelectionPage'
import { CreateHouseholdPage } from '../../pages/onboarding/CreateHouseholdPage'
import { MembersPage } from '../../pages/onboarding/MembersPage'
import { PreferencesPage } from '../../pages/onboarding/PreferencesPage'
import { BudgetPage } from '../../pages/onboarding/BudgetPage'
import { SummaryPage } from '../../pages/onboarding/SummaryPage'
import {
    OnboardingOnlyRoute,
    ProtectedRoute,
    PublicOnlyRoute,
    WelcomeRoute,
} from '../../features/auth/ui/RouteGuards'
import { ProfilePage } from '../../pages/app/ProfilePage'
import { OnboardingFlowProvider } from '../../features/onboarding/model/OnboardingFlowProvider'
import { GeneratePlanPage } from '../../pages/app/plans/GeneratePlanPage'
import { WeeklyPlanPage } from '../../pages/app/plans/WeeklyPlanPage'
import { DayDetailsPage } from '../../pages/app/plans/DayDetailsPage'
import { MealAdaptationPage } from '../../pages/app/plans/MealAdaptationPage'
import { ShoppingListPage } from '../../pages/app/ShoppingListPage'
import { BudgetAnalyticsPage } from '../../pages/app/analytics/BudgetAnalyticsPage'
import { NutritionAnalyticsPage } from '../../pages/app/analytics/NutritionAnalyticsPage'
import { WhyThisPlanPage } from '../../pages/app/plans/WhyThisPlanPage'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            {
                index: true,
                element: <Navigate to={ROUTES.welcome} replace />,
            },

            {
                path: 'welcome',
                element: (
                    <WelcomeRoute>
                        <WelcomePage />
                    </WelcomeRoute>
                ),
            },

            {
                path: 'auth',
                element: (
                    <PublicOnlyRoute>
                        <AuthLayout />
                    </PublicOnlyRoute>
                ),
                children: [
                    {
                        index: true,
                        element: <Navigate to="login" replace />,
                    },
                    {
                        path: 'login',
                        element: <LogInPage />,
                    },
                    {
                        path: 'sign-up',
                        element: <SignUpPage />,
                    },
                ],
            },

            {
                path: 'shared/meal-plans/:shareToken',
                element: (
                    <ScreenPlaceholder
                        section="Shared"
                        title="Shared Meal Plan"
                        description="Public shared meal plan page."
                    />
                ),
            },

            {
                path: 'onboarding',
                element: (
                    <OnboardingOnlyRoute>
                        <OnboardingFlowProvider>
                            <OnboardingLayout />
                        </OnboardingFlowProvider>
                    </OnboardingOnlyRoute>
                ),
                children: [
                    {
                        index: true,
                        element: <Navigate to="mode-selection" replace />,
                    },
                    {
                        path: 'mode-selection',
                        element: <ModeSelectionPage />,
                    },
                    {
                        path: 'create-household',
                        element: <CreateHouseholdPage />,
                    },
                    {
                        path: 'members',
                        element: <MembersPage />,
                    },
                    {
                        path: 'preferences',
                        element: <PreferencesPage />,
                    },
                    {
                        path: 'budget',
                        element: <BudgetPage />,
                    },
                    {
                        path: 'summary',
                        element: <SummaryPage />,
                    },
                ],
            },

            {
                path: 'app',
                element: (
                    <ProtectedRoute requireCompletedOnboarding>
                        <AppLayout />
                    </ProtectedRoute>
                ),
                children: [
                    {
                        index: true,
                        element: <Navigate to="dashboard" replace />,
                    },

                    {
                        path: 'dashboard',
                        element: <HomePage />,
                    },

                    {
                        path: 'recipes',
                        children: [
                            {
                                index: true,
                                element: <RecipesPage />,
                            },
                            {
                                path: ':recipeId',
                                element: <RecipeDetailsPage />,
                            },
                        ],
                    },

                    {
                        path: 'meal-plans',
                        children: [
                            {
                                path: 'generate',
                                element: <GeneratePlanPage />,
                            },
                            {
                                path: 'current',
                                element: <WeeklyPlanPage />,
                            },
                            {
                                path: ':mealPlanId',
                                element: <WeeklyPlanPage />,
                            },
                            {
                                path: ':mealPlanId/days/:dayIndex',
                                element: <DayDetailsPage />,
                            },
                            {
                                path: ':mealPlanId/shopping-list',
                                element: <ShoppingListPage />,
                            },
                            {
                                path: ':mealPlanId/analytics/budget',
                                element: <BudgetAnalyticsPage />,
                            },
                            {
                                path: ':mealPlanId/analytics/nutrition',
                                element: <NutritionAnalyticsPage />,
                            },
                            {
                                path: ':mealPlanId/explanations',
                                element: <WhyThisPlanPage />,
                            },
                        ],
                    },

                    {
                        path: 'meal-plan-items/:mealPlanItemId/adaptations',
                        element: <MealAdaptationPage />,
                    },

                    {
                        path: 'favorites',
                        element: (
                            <ScreenPlaceholder
                                section="Favorites"
                                title="Favorites"
                                description="Saved recipes and meals."
                            />
                        ),
                    },

                    {
                        path: 'history/meal-plans',
                        element: (
                            <ScreenPlaceholder
                                section="History"
                                title="Meal Plan History"
                                description="Past meal plans history."
                            />
                        ),
                    },

                    {
                        path: 'history/recipes',
                        element: (
                            <ScreenPlaceholder
                                section="History"
                                title="Recipe History"
                                description="Recently viewed or used recipes."
                            />
                        ),
                    },

                    {
                        path: 'pantry',
                        element: (
                            <ScreenPlaceholder
                                section="Pantry"
                                title="Pantry"
                                description="Pantry inventory screen."
                            />
                        ),
                    },

                    {
                        path: 'notifications',
                        element: (
                            <ScreenPlaceholder
                                section="Notifications"
                                title="Notifications"
                                description="User notifications."
                            />
                        ),
                    },

                    {
                        path: 'profile',
                        element: <ProfilePage />,
                    },

                    {
                        path: 'settings',
                        element: (
                            <ScreenPlaceholder
                                section="Settings"
                                title="Settings"
                                description="App settings screen."
                            />
                        ),
                    },

                    {
                        path: 'members/:memberId',
                        element: (
                            <ScreenPlaceholder
                                section="Members"
                                title="Member Details"
                                description="Single member profile."
                            />
                        ),
                    },
                ],
            },

            {
                path: '*',
                element: (
                    <ScreenPlaceholder
                        section="System"
                        title="404"
                        description="Page not found."
                        nextHref={ROUTES.welcome}
                        nextLabel="Go to welcome"
                    />
                ),
            },
        ],
    },
])