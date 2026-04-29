import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useState } from 'react'
import { Alert, Modal, Pressable, Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import { deleteAccount } from '@features/auth/api/account-api'
import { useAuth } from '@features/auth/model/AuthContext'
import { useActiveGroup, useGroupMembers } from '@features/groups/hooks'
import { useNotifications } from '@features/notifications/hooks'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { useToast } from '@shared/ui/Toast'
import { palette, radii, spacing } from '@shared/ui/theme'

export function ProfileScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
    const { user, logout } = useAuth()
    const groupQuery = useActiveGroup()
    const membersQuery = useGroupMembers(groupQuery.data?.id)
    const notifications = useNotifications()
    const toast = useToast()

    const [deleteModalVisible, setDeleteModalVisible] = useState(false)
    const [password, setPassword] = useState('')
    const [deleting, setDeleting] = useState(false)

    const unreadNotifications = notifications.data?.filter((n) => !n.is_read).length ?? 0

    const onLogout = () => {
        Alert.alert('Выйти из аккаунта?', 'Локальные данные будут очищены.', [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Выйти', style: 'destructive', onPress: () => logout() },
        ])
    }

    const onDelete = async () => {
        if (!password) {
            toast.error('Введите пароль для подтверждения')
            return
        }
        try {
            setDeleting(true)
            await deleteAccount({ password, confirm: true })
            setDeleteModalVisible(false)
            await logout()
        } catch (err) {
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

    return (
        <Screen scroll>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: palette.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text style={{ fontSize: 24, fontWeight: '700', color: palette.accentText }}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Heading level={2}>{user?.full_name ?? 'Пользователь'}</Heading>
                    <Text style={{ color: palette.textMuted, marginTop: 2, fontSize: 14 }}>{user?.email}</Text>
                </View>
            </View>

            {groupQuery.data ? (
                <Section title="Текущая группа">
                    <Card>
                        <Text style={{ fontWeight: '700', fontSize: 16, color: palette.text }}>
                            {groupQuery.data.name}
                        </Text>
                        <Text style={{ color: palette.textMuted, marginTop: 4 }}>
                            {groupQuery.data.group_type} · {membersQuery.data?.length ?? 0} членов
                        </Text>
                    </Card>
                </Section>
            ) : null}

            <Section title="Меню">
                <Card>
                    <ProfileLink
                        icon="🔔"
                        label="Уведомления"
                        hint={unreadNotifications > 0 ? `${unreadNotifications} непрочитанных` : 'Всё прочитано'}
                        badge={unreadNotifications > 0 ? unreadNotifications : undefined}
                        onPress={() => navigation.navigate('Notifications')}
                    />
                    <ProfileLink
                        icon="🥫"
                        label="Кладовая"
                        hint="Учитываем продукты при покупках"
                        onPress={() => navigation.navigate('Pantry')}
                    />
                    <ProfileLink
                        icon="⭐"
                        label="Избранные рецепты"
                        onPress={() => navigation.navigate('Favorites')}
                    />
                    <ProfileLink
                        icon="⚙️"
                        label="Настройки"
                        hint="Язык, валюта, уведомления"
                        onPress={() => navigation.navigate('Settings')}
                        isLast
                    />
                </Card>
            </Section>

            <Section title="Аккаунт">
                <Button label="Выйти" variant="secondary" onPress={onLogout} />
                <Button
                    label="Удалить аккаунт"
                    variant="ghost"
                    onPress={() => setDeleteModalVisible(true)}
                    style={{ marginTop: spacing.sm }}
                />
                <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: spacing.sm, lineHeight: 18 }}>
                    Удаление необратимо: все группы, планы и данные будут удалены безвозвратно.
                </Text>
            </Section>

            <Modal
                visible={deleteModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: palette.overlay,
                        justifyContent: 'center',
                        padding: spacing.xl,
                    }}
                >
                    <Card>
                        <Heading level={2}>Удалить аккаунт</Heading>
                        <Text style={{ color: palette.textSecondary, marginTop: spacing.sm, lineHeight: 20 }}>
                            Введите текущий пароль, чтобы подтвердить удаление. Это действие невозможно отменить.
                        </Text>
                        <View style={{ marginTop: spacing.lg }}>
                            <Input
                                label="Пароль"
                                secureTextEntry
                                autoCapitalize="none"
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
                            <Button
                                label="Отмена"
                                variant="ghost"
                                onPress={() => {
                                    setDeleteModalVisible(false)
                                    setPassword('')
                                }}
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
                    </Card>
                </View>
            </Modal>
        </Screen>
    )
}

function ProfileLink({
    icon,
    label,
    hint,
    badge,
    onPress,
    isLast,
}: {
    icon: string
    label: string
    hint?: string
    badge?: number
    onPress: () => void
    isLast?: boolean
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
                paddingVertical: spacing.md,
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: palette.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                opacity: pressed ? 0.7 : 1,
            })}
        >
            <Text style={{ fontSize: 22 }}>{icon}</Text>
            <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: palette.text, fontSize: 15 }}>{label}</Text>
                {hint ? (
                    <Text style={{ color: palette.textMuted, fontSize: 13, marginTop: 2 }}>{hint}</Text>
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
                    <Text style={{ color: palette.onPrimary, fontSize: 11, fontWeight: '700' }}>
                        {badge}
                    </Text>
                </View>
            ) : null}
            <Text style={{ color: palette.textMuted, fontSize: 18 }}>›</Text>
        </Pressable>
    )
}
