import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useRef, useState } from 'react'
import { Alert, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { AppStackParamList } from '@core/navigation/types'
import { deleteAccount } from '@features/auth/api/account-api'
import { useAuth } from '@features/auth/model/AuthContext'
import { useActiveGroup, useGroupMembers } from '@features/groups/hooks'
import { useNotifications } from '@features/notifications/hooks'
import { groupTypeLabel, pluralRu } from '@shared/lib/formatters'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Icon, type IconName } from '@shared/ui/Icon'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { Text } from '@shared/ui/Text'
import { useToast } from '@shared/ui/Toast'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, shadows, spacing, type Palette } from '@shared/ui/theme'

type Navigation = NativeStackNavigationProp<AppStackParamList>

export function ProfileScreen() {
    const palette = usePalette()
    const navigation = useNavigation<Navigation>()
    const { user, logout } = useAuth()
    const groupQuery = useActiveGroup()
    const membersQuery = useGroupMembers(groupQuery.data?.id)
    const notifications = useNotifications()
    const toast = useToast()

    const deleteSheetRef = useRef<BottomSheetModal>(null)
    const [password, setPassword] = useState('')
    const [deleting, setDeleting] = useState(false)

    const unreadNotifications = notifications.data?.filter((n) => !n.is_read).length ?? 0

    const onLogout = () => {
        Alert.alert('Выйти из аккаунта?', 'Локальные данные будут очищены.', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Выйти',
                style: 'destructive',
                onPress: () => {
                    haptic.warning()
                    logout()
                },
            },
        ])
    }

    const onDelete = async () => {
        if (!password) {
            toast.error('Введите пароль для подтверждения')
            haptic.warning()
            return
        }
        try {
            setDeleting(true)
            await deleteAccount({ password, confirm: true })
            haptic.success()
            deleteSheetRef.current?.dismiss()
            await logout()
        } catch (err) {
            haptic.error()
            toast.error(err instanceof Error ? err.message : 'Не удалось удалить аккаунт')
        } finally {
            setDeleting(false)
        }
    }

    const initials = (user?.full_name ?? user?.email ?? '?')
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')

    const renderBackdrop = useCallback(
        (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                pressBehavior="close"
                opacity={0.55}
            />
        ),
        [],
    )

    return (
        <>
            <Screen scroll>
                <Animated.View entering={FadeInDown.duration(380)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                        <View
                            style={[
                                {
                                    width: 64,
                                    height: 64,
                                    borderRadius: 32,
                                    backgroundColor: palette.accent,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                },
                                shadows.glow,
                            ]}
                        >
                            <Text variant="h2" style={{ color: palette.textOnAccent }}>
                                {initials}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Heading level={2}>{user?.full_name ?? 'Пользователь'}</Heading>
                            <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                                {user?.email}
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {groupQuery.data ? (
                    <Animated.View entering={FadeInDown.delay(60).duration(380)}>
                        <Section title="Текущая группа">
                            <Card elevation="card">
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                                    <View
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: radii.md,
                                            backgroundColor: palette.accentSoft,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Icon name="users" size={20} color={palette.accentText} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text variant="bodyStrong">{groupQuery.data.name}</Text>
                                        <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                                            {groupTypeLabel(groupQuery.data.group_type)} · {membersQuery.data?.length ?? 0} {pluralRu(membersQuery.data?.length ?? 0, ['человек', 'человека', 'человек'])}
                                        </Text>
                                    </View>
                                </View>
                            </Card>
                        </Section>
                    </Animated.View>
                ) : null}

                <Animated.View entering={FadeInDown.delay(120).duration(380)}>
                    <Section title="Меню">
                        <Card elevation="card" padding={spacing.xs}>
                            <ProfileLink
                                palette={palette}
                                icon="bell"
                                label="Уведомления"
                                hint={
                                    unreadNotifications > 0
                                        ? `${unreadNotifications} непрочитанных`
                                        : 'Всё прочитано'
                                }
                                badge={unreadNotifications > 0 ? unreadNotifications : undefined}
                                onPress={() => navigation.navigate('Notifications')}
                            />
                            <ProfileLink
                                palette={palette}
                                icon="package"
                                label="Кладовая"
                                hint="Учитываем продукты при покупках"
                                onPress={() => navigation.navigate('Pantry')}
                            />
                            <ProfileLink
                                palette={palette}
                                icon="heart"
                                label="Избранные рецепты"
                                onPress={() => navigation.navigate('Favorites')}
                            />
                            <ProfileLink
                                palette={palette}
                                icon="settings"
                                label="Настройки"
                                hint="Язык, валюта, уведомления"
                                onPress={() => navigation.navigate('Settings')}
                                isLast
                            />
                        </Card>
                    </Section>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(180).duration(380)}>
                    <Section title="Аккаунт">
                        <Button
                            label="Выйти"
                            variant="ghost"
                            onPress={onLogout}
                            iconLeft={<Icon name="logout" size={18} color={palette.text} />}
                        />
                        <Button
                            label="Удалить аккаунт"
                            variant="ghost"
                            onPress={() => {
                                haptic.medium()
                                deleteSheetRef.current?.present()
                            }}
                            style={{ marginTop: spacing.sm }}
                            iconLeft={<Icon name="trash" size={18} color={palette.danger} />}
                        />
                        <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm, lineHeight: 18 }}>
                            Удаление необратимо: все группы, планы и данные будут удалены безвозвратно.
                        </Text>
                    </Section>
                </Animated.View>
            </Screen>

            <BottomSheetModal
                ref={deleteSheetRef}
                snapPoints={['55%']}
                backdropComponent={renderBackdrop}
                handleIndicatorStyle={{ backgroundColor: palette.borderStrong }}
                backgroundStyle={{ backgroundColor: palette.canvasElevated }}
                onDismiss={() => setPassword('')}
            >
                <BottomSheetView style={{ padding: spacing.xxl, gap: spacing.md }}>
                    <View
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: radii.pill,
                            backgroundColor: palette.dangerBg,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: spacing.sm,
                        }}
                    >
                        <Icon name="trash" size={28} color={palette.danger} />
                    </View>
                    <Heading level={2}>Удалить аккаунт</Heading>
                    <Text variant="body" tone="secondary" style={{ lineHeight: 22 }}>
                        Введите текущий пароль, чтобы подтвердить удаление. Это действие невозможно отменить.
                    </Text>
                    <Input
                        label="Пароль"
                        secureTextEntry
                        autoCapitalize="none"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Текущий пароль"
                    />
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                        <Button
                            label="Отмена"
                            variant="ghost"
                            onPress={() => deleteSheetRef.current?.dismiss()}
                            style={{ flex: 1 }}
                        />
                        <Button
                            label="Удалить"
                            variant="danger"
                            onPress={onDelete}
                            loading={deleting}
                            style={{ flex: 1 }}
                        />
                    </View>
                </BottomSheetView>
            </BottomSheetModal>
        </>
    )
}

function ProfileLink({
    palette,
    icon,
    label,
    hint,
    badge,
    onPress,
    isLast,
}: {
    palette: Palette
    icon: IconName
    label: string
    hint?: string
    badge?: number
    onPress: () => void
    isLast?: boolean
}) {
    return (
        <TouchableSurface
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            scaleTo={0.99}
            style={{
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: palette.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
            }}
        >
            <View
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.md,
                    backgroundColor: palette.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon name={icon} size={18} color={palette.accentText} />
            </View>
            <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{label}</Text>
                {hint ? (
                    <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                        {hint}
                    </Text>
                ) : null}
            </View>
            {badge ? (
                <View
                    style={{
                        minWidth: 22,
                        height: 22,
                        borderRadius: radii.pill,
                        backgroundColor: palette.danger,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 6,
                    }}
                >
                    <Text variant="caption" style={{ color: palette.dangerOn, fontSize: 11 }}>
                        {badge}
                    </Text>
                </View>
            ) : null}
            <Icon name="chevronRight" size={18} color={palette.textMuted} />
        </TouchableSurface>
    )
}
