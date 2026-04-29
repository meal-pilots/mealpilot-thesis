import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'

import {
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
} from '@features/notifications/hooks'
import { useRefresh } from '@shared/lib/use-refresh'
import { Button } from '@shared/ui/Button'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { Screen } from '@shared/ui/Screen'
import { SkeletonList } from '@shared/ui/Skeleton'
import { useToast } from '@shared/ui/Toast'
import { palette, radii, spacing } from '@shared/ui/theme'

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
    pantry_expiring: { label: 'Кладовая', color: palette.warning },
    plan_ready: { label: 'План', color: palette.info },
    plan_failed: { label: 'Ошибка', color: palette.danger },
    system: { label: 'Система', color: palette.textMuted },
}

function formatRelativeTime(iso: string): string {
    const date = new Date(iso)
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / 60_000)
    if (minutes < 1) return 'только что'
    if (minutes < 60) return `${minutes} мин назад`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} ч назад`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} дн назад`
    return date.toLocaleDateString('ru-RU')
}

export function NotificationsScreen() {
    const notifications = useNotifications()
    const markRead = useMarkNotificationRead()
    const markAll = useMarkAllNotificationsRead()
    const toast = useToast()
    const { refreshing, onRefresh } = useRefresh(notifications.refetch)

    const unreadCount = notifications.data?.filter((n) => !n.is_read).length ?? 0

    const renderHeader = () => (
        <View style={{ paddingBottom: spacing.md, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Heading level={1}>Уведомления</Heading>
                {unreadCount > 0 ? (
                    <Button
                        label="Прочитать всё"
                        size="sm"
                        variant="ghost"
                        onPress={() =>
                            markAll.mutate(undefined, {
                                onSuccess: () => toast.success('Все уведомления прочитаны'),
                            })
                        }
                    />
                ) : null}
            </View>
            {unreadCount > 0 ? (
                <Text style={{ color: palette.textMuted, fontSize: 14 }}>
                    Непрочитанных: {unreadCount}
                </Text>
            ) : null}
        </View>
    )

    if (notifications.isLoading && !notifications.data) {
        return (
            <Screen>
                {renderHeader()}
                <SkeletonList count={5} />
            </Screen>
        )
    }

    return (
        <Screen contentContainerStyle={{ padding: 0 }}>
            <FlatList
                data={notifications.data ?? []}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{
                    padding: spacing.lg,
                    paddingBottom: spacing.xxl,
                    gap: spacing.sm,
                }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
                }
                ListEmptyComponent={
                    <EmptyState
                        title="Уведомлений нет"
                        description="Здесь появятся напоминания об истечении продуктов и обновления плана."
                        emoji="🔔"
                    />
                }
                renderItem={({ item }) => {
                    const badge = TYPE_BADGES[item.type] ?? TYPE_BADGES.system
                    return (
                        <Pressable
                            onPress={() => {
                                if (!item.is_read) markRead.mutate(item.id)
                            }}
                            style={{
                                backgroundColor: item.is_read ? palette.canvasMuted : palette.canvas,
                                borderLeftWidth: item.is_read ? 0 : 4,
                                borderLeftColor: badge.color,
                                borderRadius: radii.lg,
                                padding: spacing.md,
                                borderWidth: 1,
                                borderColor: palette.border,
                                gap: spacing.xs,
                            }}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        color: badge.color,
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.4,
                                    }}
                                >
                                    {badge.label}
                                </Text>
                                <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                                    {formatRelativeTime(item.created_at)}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: palette.text }}>
                                {item.title}
                            </Text>
                            {item.message ? (
                                <Text style={{ color: palette.textSecondary, fontSize: 14, lineHeight: 20 }}>
                                    {item.message}
                                </Text>
                            ) : null}
                        </Pressable>
                    )
                }}
            />
        </Screen>
    )
}
