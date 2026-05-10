import { FlatList, RefreshControl, View } from 'react-native'
import Animated, { FadeInDown, Layout } from 'react-native-reanimated'

import {
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
} from '@features/notifications/hooks'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { useRefresh } from '@shared/lib/use-refresh'
import { Button } from '@shared/ui/Button'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { Icon, type IconName } from '@shared/ui/Icon'
import { Screen } from '@shared/ui/Screen'
import { SkeletonList } from '@shared/ui/Skeleton'
import { Text } from '@shared/ui/Text'
import { useToast } from '@shared/ui/Toast'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, spacing, type Palette } from '@shared/ui/theme'

const TYPE_META: Record<
    string,
    { label: string; color: (p: Palette) => string; icon: IconName }
> = {
    pantry_expiring: { label: 'Кладовая', color: (p) => p.warning, icon: 'package' },
    plan_ready: { label: 'План', color: (p) => p.info, icon: 'calendarDays' },
    plan_failed: { label: 'Ошибка', color: (p) => p.danger, icon: 'alertCircle' },
    system: { label: 'Система', color: (p) => p.textMuted, icon: 'info' },
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
    const palette = usePalette()
    const notifications = useNotifications()
    const markRead = useMarkNotificationRead()
    const markAll = useMarkAllNotificationsRead()
    const toast = useToast()
    const { refreshing, onRefresh } = useRefresh(notifications.refetch)

    const unreadCount = notifications.data?.filter((n) => !n.is_read).length ?? 0

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(380)} style={{ paddingBottom: spacing.md, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Heading level={1}>Уведомления</Heading>
                {unreadCount > 0 ? (
                    <Button
                        label="Прочитать всё"
                        size="sm"
                        variant="ghost"
                        onPress={() => {
                            haptic.success()
                            markAll.mutate(undefined, {
                                onSuccess: () => toast.success('Все уведомления прочитаны'),
                            })
                        }}
                    />
                ) : null}
            </View>
            {unreadCount > 0 ? (
                <Text variant="caption" tone="muted">
                    Непрочитанных: {unreadCount}
                </Text>
            ) : null}
        </Animated.View>
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
                    padding: spacing.xxl,
                    paddingBottom: spacing.huge,
                    gap: spacing.sm,
                }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
                }
                ListEmptyComponent={
                    <EmptyState
                        title="Уведомлений нет"
                        description="Здесь появятся напоминания об истечении продуктов и обновления плана."
                        icon="bell"
                    />
                }
                renderItem={({ item, index }) => {
                    const meta = TYPE_META[item.type] ?? TYPE_META.system
                    const accentColor = meta.color(palette)
                    return (
                        <Animated.View
                            entering={FadeInDown.delay(index * 40).duration(360)}
                            layout={Layout.springify()}
                        >
                            <TouchableSurface
                                onPress={() => {
                                    if (!item.is_read) {
                                        haptic.light()
                                        markRead.mutate(item.id)
                                    }
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={`${meta.label}: ${item.title}`}
                                scaleTo={0.985}
                                style={{
                                    backgroundColor: item.is_read ? palette.canvasMuted : palette.canvasElevated,
                                    borderLeftWidth: item.is_read ? 0 : 4,
                                    borderLeftColor: accentColor,
                                    borderRadius: radii.lg,
                                    padding: spacing.md,
                                    borderWidth: 1,
                                    borderColor: palette.border,
                                    gap: spacing.xs,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                                    <View
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 14,
                                            backgroundColor: accentColor + '22',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Icon name={meta.icon} size={16} color={accentColor} />
                                    </View>
                                    <Text variant="overline" style={{ color: accentColor, flex: 1 }}>
                                        {meta.label}
                                    </Text>
                                    <Text variant="caption" tone="muted">
                                        {formatRelativeTime(item.created_at)}
                                    </Text>
                                </View>
                                <Text variant="bodyStrong" style={{ marginTop: 4 }}>
                                    {item.title}
                                </Text>
                                {item.message ? (
                                    <Text variant="body" tone="secondary">
                                        {item.message}
                                    </Text>
                                ) : null}
                            </TouchableSurface>
                        </Animated.View>
                    )
                }}
            />
        </Screen>
    )
}
