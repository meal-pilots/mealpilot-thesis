import { NavigationContainer, type LinkingOptions } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'

import { useAuth } from '@features/auth/model/AuthContext'
import { AppNavigator } from '@core/navigation/AppNavigator'
import { AuthNavigator } from '@core/navigation/AuthNavigator'
import { OnboardingNavigator } from '@core/navigation/OnboardingNavigator'
import { WelcomeScreen } from '@screens/auth/WelcomeScreen'

import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

const linking: LinkingOptions<RootStackParamList> = {
    prefixes: ['mealplanner://', 'https://mealplanner.kz'],
    config: {
        screens: {
            AppRoot: {
                screens: {
                    PlanDetails: 'meal-plans/:mealPlanId',
                    ShoppingList: 'meal-plans/:mealPlanId/shopping-list',
                    RecipeDetails: 'recipes/:recipeId',
                },
            },
        } as never,
    },
}

export function RootNavigator() {
    const { status, onboardingCompleted } = useAuth()

    if (status === 'loading') {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator />
            </View>
        )
    }

    return (
        <NavigationContainer linking={linking}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {status !== 'authenticated' ? (
                    <>
                        <Stack.Screen name="Welcome" component={WelcomeScreen} />
                        <Stack.Screen name="Auth" component={AuthNavigator} />
                    </>
                ) : !onboardingCompleted ? (
                    <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
                ) : (
                    <Stack.Screen name="AppRoot" component={AppNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    )
}
