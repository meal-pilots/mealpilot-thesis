import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { KeyboardAvoidingView, Platform } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { OnboardingStackParamList } from '@core/navigation/types'
import { useOnboardingDraft } from '@features/onboarding/OnboardingContext'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { Text } from '@shared/ui/Text'
import { spacing } from '@shared/ui/theme'

export function CreateHouseholdScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>()
    const palette = usePalette()
    const { draft, setDraft } = useOnboardingDraft()

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
        >
            <Screen scroll>
                <Animated.View entering={FadeInDown.duration(380)}>
                    <Heading level={1}>Назовём вашу кухню</Heading>
                    <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
                        Это просто название, его видите только вы.
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(80).duration(380)}>
                    <Input
                        label="Название"
                        placeholder="Например: Семья Жумабаевых"
                        value={draft.name}
                        onChangeText={(v) => setDraft((curr) => ({ ...curr, name: v }))}
                        autoCapitalize="sentences"
                        leftAddon={<Icon name="users" size={18} color={palette.textMuted} />}
                    />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(160).duration(380)}>
                    <Button
                        label="Продолжить"
                        size="lg"
                        onPress={() => navigation.navigate('Members')}
                        disabled={!draft.name.trim()}
                        iconRight={<Icon name="arrowRight" size={18} color={palette.onPrimary} />}
                    />
                </Animated.View>
            </Screen>
        </KeyboardAvoidingView>
    )
}
