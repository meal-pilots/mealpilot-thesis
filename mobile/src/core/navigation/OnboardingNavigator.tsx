import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { OnboardingProvider } from '@features/onboarding/OnboardingContext'
import { BudgetScreen } from '@screens/onboarding/BudgetScreen'
import { CreateHouseholdScreen } from '@screens/onboarding/CreateHouseholdScreen'
import { MembersScreen } from '@screens/onboarding/MembersScreen'
import { ModeSelectionScreen } from '@screens/onboarding/ModeSelectionScreen'
import { PreferencesScreen } from '@screens/onboarding/PreferencesScreen'
import { SummaryScreen } from '@screens/onboarding/SummaryScreen'

import type { OnboardingStackParamList } from './types'

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

export function OnboardingNavigator() {
    return (
        <OnboardingProvider>
            <Stack.Navigator screenOptions={{ headerShown: true, headerBackTitle: 'Назад' }}>
                <Stack.Screen
                    name="ModeSelection"
                    component={ModeSelectionScreen}
                    options={{ title: 'Кто вы' }}
                />
                <Stack.Screen
                    name="CreateHousehold"
                    component={CreateHouseholdScreen}
                    options={{ title: 'Семья' }}
                />
                <Stack.Screen name="Members" component={MembersScreen} options={{ title: 'Члены семьи' }} />
                <Stack.Screen
                    name="Preferences"
                    component={PreferencesScreen}
                    options={{ title: 'Предпочтения' }}
                />
                <Stack.Screen name="Budget" component={BudgetScreen} options={{ title: 'Бюджет' }} />
                <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: 'Готово' }} />
            </Stack.Navigator>
        </OnboardingProvider>
    )
}
