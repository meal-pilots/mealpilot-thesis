import { useEffect, useState } from 'react'
import { Switch, View } from 'react-native'

import { useUpdateProfile, useUpdateSettings, useUserProfile, useUserSettings } from '@features/settings/hooks'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { Input } from '@shared/ui/Input'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { Text } from '@shared/ui/Text'
import { useToast } from '@shared/ui/Toast'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, spacing, type Palette } from '@shared/ui/theme'

const LANGUAGES: { code: string; label: string; flag: string }[] = [
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'kk', label: 'Қазақша', flag: '🇰🇿' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
]

const CURRENCIES: { code: string; label: string; symbol: string }[] = [
    { code: 'KZT', label: 'Тенге', symbol: '₸' },
    { code: 'RUB', label: 'Рубль', symbol: '₽' },
    { code: 'USD', label: 'Доллар', symbol: '$' },
]

const UNITS: { code: 'metric' | 'imperial'; label: string; hint: string }[] = [
    { code: 'metric', label: 'Метрические', hint: 'г, мл, кг' },
    { code: 'imperial', label: 'Имперские', hint: 'oz, fl oz, lb' },
]

export function SettingsScreen() {
    const palette = usePalette()
    const settingsQuery = useUserSettings()
    const profileQuery = useUserProfile()
    const updateSettings = useUpdateSettings()
    const updateProfile = useUpdateProfile()
    const toast = useToast()

    const [fullName, setFullName] = useState('')

    useEffect(() => {
        if (profileQuery.data?.full_name) setFullName(profileQuery.data.full_name)
    }, [profileQuery.data?.full_name])

    return (
        <Screen scroll>
            <Heading level={1}>Настройки</Heading>
            <QueryBoundary
                isLoading={settingsQuery.isLoading || profileQuery.isLoading}
                error={settingsQuery.error || profileQuery.error}
                refetch={() => {
                    settingsQuery.refetch()
                    profileQuery.refetch()
                }}
            >
                {settingsQuery.data && profileQuery.data ? (
                    <>
                        <Section title="Профиль">
                            <Card elevation="card">
                                <View style={{ gap: spacing.md }}>
                                    <Input
                                        label="Имя"
                                        value={fullName}
                                        onChangeText={setFullName}
                                        leftAddon={<Icon name="user" size={18} color={palette.textMuted} />}
                                        onBlur={() => {
                                            if (fullName.trim() && fullName !== profileQuery.data.full_name) {
                                                updateProfile.mutate(
                                                    { full_name: fullName.trim() },
                                                    {
                                                        onSuccess: () => {
                                                            haptic.success()
                                                            toast.success('Имя обновлено')
                                                        },
                                                        onError: () => toast.error('Не удалось обновить'),
                                                    },
                                                )
                                            }
                                        }}
                                    />
                                    <View style={{ gap: 4 }}>
                                        <Text variant="caption" tone="secondary" weight="700">
                                            Email
                                        </Text>
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: spacing.sm,
                                                paddingVertical: spacing.sm,
                                            }}
                                        >
                                            <Icon name="mail" size={18} color={palette.textMuted} />
                                            <Text variant="body">{profileQuery.data.email}</Text>
                                        </View>
                                    </View>
                                </View>
                            </Card>
                        </Section>

                        <Section title="Уведомления">
                            <Card elevation="card">
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <View style={{ flex: 1, marginRight: spacing.md }}>
                                        <Text variant="bodyStrong">Push-уведомления</Text>
                                        <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                                            Напоминания о продуктах и обновления плана
                                        </Text>
                                    </View>
                                    <Switch
                                        value={settingsQuery.data.notifications_enabled}
                                        onValueChange={(value) => {
                                            haptic.selection()
                                            updateSettings.mutate(
                                                { notifications_enabled: value },
                                                {
                                                    onSuccess: () =>
                                                        toast.success(value ? 'Уведомления включены' : 'Отключены'),
                                                    onError: () => toast.error('Не удалось обновить'),
                                                },
                                            )
                                        }}
                                        trackColor={{ true: palette.accent, false: palette.borderStrong }}
                                        thumbColor={palette.canvas}
                                    />
                                </View>
                            </Card>
                        </Section>

                        <Section title="Язык">
                            <Card elevation="card" padding={spacing.xs}>
                                {LANGUAGES.map((lang, idx) => (
                                    <PickerRow
                                        key={lang.code}
                                        palette={palette}
                                        label={lang.label}
                                        hint={lang.flag}
                                        active={settingsQuery.data!.preferred_language === lang.code}
                                        showDivider={idx > 0}
                                        onPress={() => {
                                            haptic.selection()
                                            updateSettings.mutate(
                                                { preferred_language: lang.code },
                                                {
                                                    onSuccess: () => toast.success('Язык обновлён'),
                                                    onError: () => toast.error('Не удалось обновить'),
                                                },
                                            )
                                        }}
                                    />
                                ))}
                            </Card>
                        </Section>

                        <Section title="Валюта">
                            <Card elevation="card" padding={spacing.xs}>
                                {CURRENCIES.map((c, idx) => (
                                    <PickerRow
                                        key={c.code}
                                        palette={palette}
                                        label={c.label}
                                        hint={c.symbol}
                                        active={settingsQuery.data!.currency_code === c.code}
                                        showDivider={idx > 0}
                                        onPress={() => {
                                            haptic.selection()
                                            updateSettings.mutate(
                                                { currency_code: c.code },
                                                {
                                                    onSuccess: () => toast.success('Валюта обновлена'),
                                                    onError: () => toast.error('Не удалось обновить'),
                                                },
                                            )
                                        }}
                                    />
                                ))}
                            </Card>
                        </Section>

                        <Section title="Система мер">
                            <Card elevation="card" padding={spacing.xs}>
                                {UNITS.map((u, idx) => (
                                    <PickerRow
                                        key={u.code}
                                        palette={palette}
                                        label={u.label}
                                        hint={u.hint}
                                        active={settingsQuery.data!.measurement_system === u.code}
                                        showDivider={idx > 0}
                                        onPress={() => {
                                            haptic.selection()
                                            updateSettings.mutate(
                                                { measurement_system: u.code },
                                                {
                                                    onSuccess: () => toast.success('Обновлено'),
                                                    onError: () => toast.error('Не удалось обновить'),
                                                },
                                            )
                                        }}
                                    />
                                ))}
                            </Card>
                        </Section>
                    </>
                ) : null}
            </QueryBoundary>
        </Screen>
    )
}

function PickerRow({
    palette,
    label,
    hint,
    active,
    showDivider,
    onPress,
}: {
    palette: Palette
    label: string
    hint?: string
    active: boolean
    showDivider: boolean
    onPress: () => void
}) {
    return (
        <TouchableSurface
            onPress={onPress}
            scaleTo={0.99}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderTopWidth: showDivider ? 1 : 0,
                borderTopColor: palette.border,
            }}
        >
            <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{label}</Text>
                {hint ? (
                    <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                        {hint}
                    </Text>
                ) : null}
            </View>
            <View
                style={{
                    width: 24,
                    height: 24,
                    borderRadius: radii.pill,
                    borderWidth: 2,
                    borderColor: active ? palette.accent : palette.borderStrong,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? palette.accent : 'transparent',
                }}
            >
                {active ? <Icon name="check" size={14} color={palette.textOnAccent} strokeWidth={3} /> : null}
            </View>
        </TouchableSurface>
    )
}
