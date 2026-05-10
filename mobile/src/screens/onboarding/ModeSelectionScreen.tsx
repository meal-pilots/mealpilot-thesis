import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { OnboardingStackParamList } from '@core/navigation/types'
import type { GroupType } from '@entities/group/types'
import { buildMembersForMode, useOnboardingDraft } from '@features/onboarding/OnboardingContext'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Icon, type IconName } from '@shared/ui/Icon'
import { Screen } from '@shared/ui/Screen'
import { Text } from '@shared/ui/Text'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, spacing, type Palette } from '@shared/ui/theme'

const MODES: { id: GroupType; icon: IconName; title: string; description: string }[] = [
    { id: 'solo', icon: 'user', title: 'Только для меня', description: 'Один человек' },
    { id: 'two_adults', icon: 'users', title: 'Двое взрослых', description: 'Пара или соседи' },
    { id: 'adults_kids', icon: 'users', title: 'Взрослые + дети', description: 'Семейные блюда' },
    { id: 'custom', icon: 'users', title: 'Своя группа', description: 'Хост, общага, команда' },
]

export function ModeSelectionScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>()
    const palette = usePalette()
    const { draft, setDraft } = useOnboardingDraft()

    return (
        <Screen scroll>
            <Animated.View entering={FadeInDown.duration(380)}>
                <Heading level={1}>Кто будет питаться?</Heading>
                <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
                    Поможет подобрать порции и список покупок.
                </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(380)}>
                <View style={{ gap: spacing.sm }}>
                    {MODES.map((mode, index) => {
                        const active = draft.groupType === mode.id
                        return (
                            <Animated.View
                                key={mode.id}
                                entering={FadeInDown.delay(120 + index * 50).duration(360)}
                            >
                                <ModeCard
                                    palette={palette}
                                    icon={mode.icon}
                                    title={mode.title}
                                    description={mode.description}
                                    active={active}
                                    onPress={() => {
                                        haptic.selection()
                                        setDraft((curr) => ({
                                            ...curr,
                                            groupType: mode.id,
                                            members:
                                                curr.groupType === mode.id
                                                    ? curr.members
                                                    : buildMembersForMode(mode.id),
                                        }))
                                    }}
                                />
                            </Animated.View>
                        )
                    })}
                </View>
            </Animated.View>

            <Button
                label="Продолжить"
                onPress={() => navigation.navigate('CreateHousehold')}
                disabled={!draft.groupType}
                size="lg"
                iconRight={<Icon name="arrowRight" size={18} color={palette.onPrimary} />}
                style={{ marginTop: spacing.md }}
            />
        </Screen>
    )
}

function ModeCard({
    palette,
    icon,
    title,
    description,
    active,
    onPress,
}: {
    palette: Palette
    icon: IconName
    title: string
    description: string
    active: boolean
    onPress: () => void
}) {
    return (
        <TouchableSurface
            onPress={onPress}
            scaleTo={0.985}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={title}
            style={{
                padding: spacing.md,
                borderRadius: radii.lg,
                borderWidth: 1.5,
                backgroundColor: active ? palette.accentSoft : palette.canvasElevated,
                borderColor: active ? palette.accent : palette.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
            }}
        >
            <View
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: radii.md,
                    backgroundColor: active ? palette.accent : palette.canvasMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon name={icon} size={22} color={active ? palette.textOnAccent : palette.text} />
            </View>
            <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{title}</Text>
                <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                    {description}
                </Text>
            </View>
            {active ? <Icon name="checkCircle" size={22} color={palette.accent} /> : null}
        </TouchableSurface>
    )
}
