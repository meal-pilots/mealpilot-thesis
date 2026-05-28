import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'

import { OnboardingProvider, useOnboardingDraft } from '@features/onboarding/OnboardingContext'
import { OnboardingProgress } from '@features/onboarding/OnboardingProgress'
import { BudgetScreen } from '@screens/onboarding/BudgetScreen'
import { CreateHouseholdScreen } from '@screens/onboarding/CreateHouseholdScreen'
import { MembersScreen } from '@screens/onboarding/MembersScreen'
import { ModeSelectionScreen } from '@screens/onboarding/ModeSelectionScreen'
import { PreferencesScreen } from '@screens/onboarding/PreferencesScreen'
import { SummaryScreen } from '@screens/onboarding/SummaryScreen'
import { usePalette } from '@shared/lib/use-palette'
import { fonts } from '@shared/ui/theme'

import type { OnboardingStackParamList } from './types'

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

export function OnboardingNavigator() {
    return (
        <OnboardingProvider>
            <OnboardingStack />
        </OnboardingProvider>
    )
}

function OnboardingStack() {
    const palette = usePalette()
    const { isBootstrapping } = useOnboardingDraft()
    const sharedHeader = {
        headerStyle: { backgroundColor: palette.canvas },
        headerTitleStyle: { color: palette.text, fontFamily: fonts.semibold, fontSize: 17 },
        headerTintColor: palette.accent,
        headerBackTitle: 'Назад',
        contentStyle: { backgroundColor: palette.canvas },
        headerShadowVisible: false,
    }

    if (isBootstrapping) {
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
        <Stack.Navigator screenOptions={sharedHeader}>
            <Stack.Screen
                name="ModeSelection"
                component={ModeSelectionScreen}
                options={{ title: 'Кто вы', headerTitle: () => <OnboardingProgress step={0} /> }}
            />
            <Stack.Screen
                name="CreateHousehold"
                component={CreateHouseholdScreen}
                options={{ title: 'Семья', headerTitle: () => <OnboardingProgress step={1} /> }}
            />
            <Stack.Screen
                name="Members"
                component={MembersScreen}
                options={{ title: 'Члены семьи', headerTitle: () => <OnboardingProgress step={2} /> }}
            />
            <Stack.Screen
                name="Preferences"
                component={PreferencesScreen}
                options={{ title: 'Предпочтения', headerTitle: () => <OnboardingProgress step={3} /> }}
            />
            <Stack.Screen
                name="Budget"
                component={BudgetScreen}
                options={{ title: 'Бюджет', headerTitle: () => <OnboardingProgress step={4} /> }}
            />
            <Stack.Screen
                name="Summary"
                component={SummaryScreen}
                options={{ title: 'Готово', headerTitle: () => <OnboardingProgress step={5} /> }}
            />
        </Stack.Navigator>
    )
}
