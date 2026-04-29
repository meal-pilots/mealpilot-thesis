import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Switch, Text, View } from 'react-native'

import { useUpdateProfile, useUpdateSettings, useUserProfile, useUserSettings } from '@features/settings/hooks'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Input } from '@shared/ui/Input'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { useToast } from '@shared/ui/Toast'
import { palette, radii, spacing } from '@shared/ui/theme'

const LANGUAGES: Array<{ code: string; label: string }> = [
    { code: 'ru', label: 'Русский' },
    { code: 'kk', label: 'Қазақша' },
    { code: 'en', label: 'English' },
]

const CURRENCIES: Array<{ code: string; label: string }> = [
    { code: 'KZT', label: '₸ Тенге' },
    { code: 'RUB', label: '₽ Рубль' },
    { code: 'USD', label: '$ Доллар' },
]

const UNITS: Array<{ code: 'metric' | 'imperial'; label: string }> = [
    { code: 'metric', label: 'Метрические (г, мл)' },
    { code: 'imperial', label: 'Имперские (oz, fl oz)' },
]

export function SettingsScreen() {
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
                            <Card>
                                <View style={{ gap: spacing.md }}>
                                    <Input
                                        label="Имя"
                                        value={fullName}
                                        onChangeText={setFullName}
                                        onBlur={() => {
                                            if (fullName.trim() && fullName !== profileQuery.data.full_name) {
                                                updateProfile.mutate(
                                                    { full_name: fullName.trim() },
                                                    {
                                                        onSuccess: () => toast.success('Имя обновлено'),
                                                        onError: () => toast.error('Не удалось обновить'),
                                                    },
                                                )
                                            }
                                        }}
                                    />
                                    <View style={{ gap: 4 }}>
                                        <Text style={{ fontSize: 14, color: palette.textSecondary, fontWeight: '600' }}>
                                            Email
                                        </Text>
                                        <Text style={{ color: palette.textMuted, fontSize: 15 }}>
                                            {profileQuery.data.email}
                                        </Text>
                                    </View>
                                </View>
                            </Card>
                        </Section>

                        <Section title="Уведомления">
                            <Card>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <View style={{ flex: 1, marginRight: spacing.md }}>
                                        <Text style={{ fontSize: 15, fontWeight: '600', color: palette.text }}>
                                            Push-уведомления
                                        </Text>
                                        <Text style={{ color: palette.textMuted, fontSize: 13, marginTop: 2 }}>
                                            Напоминания об истечении продуктов и обновления плана
                                        </Text>
                                    </View>
                                    <Switch
                                        value={settingsQuery.data.notifications_enabled}
                                        onValueChange={(value) =>
                                            updateSettings.mutate(
                                                { notifications_enabled: value },
                                                {
                                                    onSuccess: () =>
                                                        toast.success(value ? 'Включены' : 'Отключены'),
                                                    onError: () => toast.error('Не удалось обновить'),
                                                },
                                            )
                                        }
                                        trackColor={{ true: palette.primary, false: palette.border }}
                                    />
                                </View>
                            </Card>
                        </Section>

                        <Section title="Язык">
                            <Card>
                                <PickerList
                                    value={settingsQuery.data.preferred_language}
                                    options={LANGUAGES}
                                    onChange={(code) =>
                                        updateSettings.mutate(
                                            { preferred_language: code },
                                            {
                                                onSuccess: () => toast.success('Язык обновлён'),
                                                onError: () => toast.error('Не удалось обновить'),
                                            },
                                        )
                                    }
                                />
                            </Card>
                        </Section>

                        <Section title="Валюта">
                            <Card>
                                <PickerList
                                    value={settingsQuery.data.currency_code}
                                    options={CURRENCIES}
                                    onChange={(code) =>
                                        updateSettings.mutate(
                                            { currency_code: code },
                                            {
                                                onSuccess: () => toast.success('Валюта обновлена'),
                                                onError: () => toast.error('Не удалось обновить'),
                                            },
                                        )
                                    }
                                />
                            </Card>
                        </Section>

                        <Section title="Система мер">
                            <Card>
                                <PickerList<'metric' | 'imperial'>
                                    value={settingsQuery.data.measurement_system}
                                    options={UNITS}
                                    onChange={(code) =>
                                        updateSettings.mutate(
                                            { measurement_system: code },
                                            {
                                                onSuccess: () => toast.success('Обновлено'),
                                                onError: () => toast.error('Не удалось обновить'),
                                            },
                                        )
                                    }
                                />
                            </Card>
                        </Section>
                    </>
                ) : null}
            </QueryBoundary>
        </Screen>
    )
}

function PickerList<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T
    options: Array<{ code: T; label: string }>
    onChange: (code: T) => void
}) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {options.map((opt) => {
                const active = opt.code === value
                return (
                    <Pressable
                        key={opt.code}
                        onPress={() => onChange(opt.code)}
                        style={{
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                            borderRadius: radii.pill,
                            backgroundColor: active ? palette.primary : palette.canvas,
                            borderWidth: 1,
                            borderColor: active ? palette.primary : palette.border,
                        }}
                    >
                        <Text style={{ color: active ? palette.onPrimary : palette.text, fontWeight: '600' }}>
                            {opt.label}
                        </Text>
                    </Pressable>
                )
            })}
        </ScrollView>
    )
}
