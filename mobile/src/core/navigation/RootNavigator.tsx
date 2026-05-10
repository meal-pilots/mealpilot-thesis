import { NavigationContainer, type LinkingOptions } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import * as Linking from 'expo-linking'
import { ActivityIndicator, View } from 'react-native'

import { useAuth } from '@features/auth/model/AuthContext'
import { AppNavigator } from '@core/navigation/AppNavigator'
import { AuthNavigator } from '@core/navigation/AuthNavigator'
import { OnboardingNavigator } from '@core/navigation/OnboardingNavigator'
import { WelcomeScreen } from '@screens/auth/WelcomeScreen'
import { usePalette } from '@shared/lib/use-palette'

import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

const linking: LinkingOptions<RootStackParamList> = {
    // `Linking.createURL('')` covers both production (`mealplanner://`)
    // and Expo Go dev (`exp://127.0.0.1:8081/--/...`) so deep links work
    // identically in both modes — useful for QA-by-deep-link.
    prefixes: [Linking.createURL('/'), 'mealplanner://', 'https://mealplanner.kz'],
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
    const palette = usePalette()

    if (status === 'loading') {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: palette.canvas,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <ActivityIndicator color={palette.accent} />
            </View>
        )
    }

    return (
        <NavigationContainer
            linking={linking}
            theme={{
                dark: false,
                colors: {
                    primary: palette.accent,
                    background: palette.canvas,
                    card: palette.canvas,
                    text: palette.text,
                    border: palette.border,
                    notification: palette.accent,
                },
            }}
        >
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
