export type RootStackParamList = {
    Welcome: undefined
    Auth: undefined
    Onboarding: undefined
    AppRoot: undefined
}

export type AuthStackParamList = {
    Login: undefined
    SignUp: undefined
}

export type OnboardingStackParamList = {
    ModeSelection: undefined
    CreateHousehold: undefined
    Members: undefined
    Preferences: undefined
    Budget: undefined
    Summary: undefined
}

export type AppTabParamList = {
    Home: undefined
    Plans: undefined
    Recipes: undefined
    Profile: undefined
}

export type AppStackParamList = {
    Tabs: undefined
    RecipeDetails: { recipeId: string }
    PlanDetails: { mealPlanId: string }
    DayDetails: { mealPlanId: string; dayIndex: number }
    ShoppingList: { mealPlanId: string }
    BudgetAnalytics: { mealPlanId: string }
    NutritionAnalytics: { mealPlanId: string }
    WhyThisPlan: { mealPlanId: string }
    GeneratePlan: undefined
    MealAdaptation: { mealPlanItemId: string }
    ReplaceMeal: { mealPlanItemId: string; mealPlanId: string; mealType?: string; currentRecipeName?: string }
    Settings: undefined
    Notifications: undefined
    Pantry: undefined
    Favorites: undefined
}
