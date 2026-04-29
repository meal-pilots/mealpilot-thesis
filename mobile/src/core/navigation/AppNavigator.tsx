import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'

import { BudgetAnalyticsScreen } from '@screens/plans/BudgetAnalyticsScreen'
import { DayDetailsScreen } from '@screens/plans/DayDetailsScreen'
import { GeneratePlanScreen } from '@screens/plans/GeneratePlanScreen'
import { HomeScreen } from '@screens/home/HomeScreen'
import { MealAdaptationScreen } from '@screens/plans/MealAdaptationScreen'
import { NutritionAnalyticsScreen } from '@screens/plans/NutritionAnalyticsScreen'
import { NotificationsScreen } from '@screens/profile/NotificationsScreen'
import { PantryScreen } from '@screens/profile/PantryScreen'
import { PlanDetailsScreen } from '@screens/plans/PlanDetailsScreen'
import { PlansScreen } from '@screens/plans/PlansScreen'
import { ProfileScreen } from '@screens/profile/ProfileScreen'
import { FavoritesScreen } from '@screens/recipes/FavoritesScreen'
import { RecipeDetailsScreen } from '@screens/recipes/RecipeDetailsScreen'
import { RecipesScreen } from '@screens/recipes/RecipesScreen'
import { ReplaceMealScreen } from '@screens/plans/ReplaceMealScreen'
import { SettingsScreen } from '@screens/profile/SettingsScreen'
import { ShoppingListScreen } from '@screens/plans/ShoppingListScreen'
import { WhyThisPlanScreen } from '@screens/plans/WhyThisPlanScreen'

import { palette } from '@shared/ui/theme'

import type { AppStackParamList, AppTabParamList } from './types'

const Tabs = createBottomTabNavigator<AppTabParamList>()
const Stack = createNativeStackNavigator<AppStackParamList>()

const TAB_ICONS: Record<keyof AppTabParamList, string> = {
    Home: '🏠',
    Plans: '🗓️',
    Recipes: '🍽️',
    Profile: '👤',
}

const TAB_LABELS: Record<keyof AppTabParamList, string> = {
    Home: 'Главная',
    Plans: 'Планы',
    Recipes: 'Рецепты',
    Profile: 'Профиль',
}

function AppTabs() {
    return (
        <Tabs.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: palette.primary,
                tabBarInactiveTintColor: palette.textMuted,
                tabBarStyle: {
                    backgroundColor: palette.canvasMuted,
                    borderTopColor: palette.border,
                    borderTopWidth: 1,
                    paddingTop: 6,
                    paddingBottom: 6,
                    height: 64,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                tabBarIcon: ({ focused }) => (
                    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>
                        {TAB_ICONS[route.name]}
                    </Text>
                ),
                tabBarLabel: TAB_LABELS[route.name],
            })}
        >
            <Tabs.Screen name="Home" component={HomeScreen} />
            <Tabs.Screen name="Plans" component={PlansScreen} />
            <Tabs.Screen name="Recipes" component={RecipesScreen} />
            <Tabs.Screen name="Profile" component={ProfileScreen} />
        </Tabs.Navigator>
    )
}

const sharedHeader = {
    headerStyle: { backgroundColor: palette.canvas },
    headerTitleStyle: { color: palette.text, fontWeight: '700' as const },
    headerTintColor: palette.primary,
    contentStyle: { backgroundColor: palette.canvas },
}

export function AppNavigator() {
    return (
        <Stack.Navigator screenOptions={sharedHeader}>
            <Stack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
            <Stack.Screen name="GeneratePlan" component={GeneratePlanScreen} options={{ title: 'Новый план' }} />
            <Stack.Screen name="PlanDetails" component={PlanDetailsScreen} options={{ title: 'План' }} />
            <Stack.Screen name="DayDetails" component={DayDetailsScreen} options={{ title: 'День' }} />
            <Stack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: 'Покупки' }} />
            <Stack.Screen name="BudgetAnalytics" component={BudgetAnalyticsScreen} options={{ title: 'Бюджет' }} />
            <Stack.Screen
                name="NutritionAnalytics"
                component={NutritionAnalyticsScreen}
                options={{ title: 'Нутриенты' }}
            />
            <Stack.Screen name="WhyThisPlan" component={WhyThisPlanScreen} options={{ title: 'Почему этот план' }} />
            <Stack.Screen name="MealAdaptation" component={MealAdaptationScreen} options={{ title: 'Адаптация' }} />
            <Stack.Screen name="ReplaceMeal" component={ReplaceMealScreen} options={{ title: 'Заменить блюдо' }} />
            <Stack.Screen name="RecipeDetails" component={RecipeDetailsScreen} options={{ title: 'Рецепт' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Настройки' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Уведомления' }} />
            <Stack.Screen name="Pantry" component={PantryScreen} options={{ title: 'Кладовая' }} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Избранное' }} />
        </Stack.Navigator>
    )
}
