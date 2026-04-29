export const ROUTES = {
    root: '/',
    welcome: '/welcome',

    auth: {
        root: '/auth',
        login: '/auth/login',
        signUp: '/auth/sign-up',
    },

    shared: {
        mealPlan: (shareToken: string) => `/shared/meal-plans/${shareToken}`,
    },

    onboarding: {
        root: '/onboarding',
        modeSelection: '/onboarding/mode-selection',
        createHousehold: '/onboarding/create-household',
        members: '/onboarding/members',
        preferences: '/onboarding/preferences',
        budget: '/onboarding/budget',
        summary: '/onboarding/summary',
    },

    app: {
        root: '/app',
        dashboard: '/app/dashboard',

        recipes: '/app/recipes',
        recipeDetails: (recipeId: string) => `/app/recipes/${recipeId}`,

        mealPlans: {
            generate: '/app/meal-plans/generate',
            current: '/app/meal-plans/current',
            details: (mealPlanId: string) => `/app/meal-plans/${mealPlanId}`,
            dayDetails: (mealPlanId: string, dayIndex: string) =>
                `/app/meal-plans/${mealPlanId}/days/${dayIndex}`,
            shoppingList: (mealPlanId: string) =>
                `/app/meal-plans/${mealPlanId}/shopping-list`,
            budgetAnalytics: (mealPlanId: string) =>
                `/app/meal-plans/${mealPlanId}/analytics/budget`,
            nutritionAnalytics: (mealPlanId: string) =>
                `/app/meal-plans/${mealPlanId}/analytics/nutrition`,
            explanations: (mealPlanId: string) =>
                `/app/meal-plans/${mealPlanId}/explanations`,
        },

        mealPlanItems: {
            adaptations: (mealPlanItemId: string) =>
                `/app/meal-plan-items/${mealPlanItemId}/adaptations`,
        },

        favorites: '/app/favorites',

        history: {
            mealPlans: '/app/history/meal-plans',
            recipes: '/app/history/recipes',
        },

        pantry: '/app/pantry',
        notifications: '/app/notifications',
        profile: '/app/profile',
        settings: '/app/settings',
        memberDetails: (memberId: string) => `/app/members/${memberId}`,
    },
} as const