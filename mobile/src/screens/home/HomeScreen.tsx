import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import { useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'

import type { AppStackParamList, AppTabParamList } from '@core/navigation/types'
import { useAuth } from '@features/auth/model/AuthContext'
import { useActiveGroup } from '@features/groups/hooks'
import { useNotifications } from '@features/notifications/hooks'
import { useCurrentPlan, usePlanDetail } from '@features/plans/hooks'
import { useFavorites } from '@features/recipes/hooks'
import { formatCurrency, formatDateRange, formatScore, mealTypeLabel, pluralRu } from '@shared/lib/formatters'
import { haptic } from '@shared/lib/haptics'
import { mealTypeIcon } from '@shared/lib/meal-icons'
import { usePalette } from '@shared/lib/use-palette'
import { useRefresh } from '@shared/lib/use-refresh'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Icon, type IconName } from '@shared/ui/Icon'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { SkeletonCard } from '@shared/ui/Skeleton'
import { Text } from '@shared/ui/Text'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, shadows, spacing, type Palette } from '@shared/ui/theme'

type Navigation = NativeStackNavigationProp<AppStackParamList & AppTabParamList>

function timeBasedGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 5) return 'Доброй ночи'
    if (hour < 12) return 'Доброе утро'
    if (hour < 18) return 'Добрый день'
    return 'Добрый вечер'
}

function todayLabel(): string {
    const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
    const today = new Date()
    return `Сегодня ${today.getDate()} · ${days[today.getDay()]}`
}

export function HomeScreen() {
    const navigation = useNavigation<Navigation>()
    const palette = usePalette()
    const { width: viewportWidth } = useWindowDimensions()
    const { user } = useAuth()
    const groupQuery = useActiveGroup()
    const groupId = groupQuery.data?.id
    const planQuery = useCurrentPlan(groupId)
    const planDetail = usePlanDetail(planQuery.data?.id)
    const favoritesQuery = useFavorites()
    const notifications = useNotifications()
    const unreadCount = notifications.data?.filter((n) => !n.is_read).length ?? 0

    const { refreshing, onRefresh } = useRefresh(async () => {
        await Promise.all([
            planQuery.refetch(),
            groupQuery.refetch(),
            favoritesQuery.refetch(),
            notifications.refetch(),
        ])
    })

    const greeting = `${timeBasedGreeting()}${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}`
    const quickActionWidth = Math.floor((viewportWidth - spacing.xxl * 2 - spacing.sm) / 2)

    const todaysItems = useMemo(() => {
        if (!planDetail.data) return []
        const today = new Date().toISOString().slice(0, 10)
        const day = planDetail.data.days.find((d) => d.plan_date === today) ?? planDetail.data.days[0]
        return day?.items ?? []
    }, [planDetail.data])

    return (
        <Screen contentContainerStyle={{ padding: 0 }}>
            <ScrollView
                contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge, gap: spacing.xl }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
                }
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={FadeInDown.duration(420)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                            <Text variant="caption" tone="muted">
                                {todayLabel()}
                            </Text>
                            <Heading level={1} style={{ marginTop: 2 }}>
                                {greeting}
                            </Heading>
                        </View>
                        <NotificationBell
                            palette={palette}
                            count={unreadCount}
                            onPress={() => {
                                haptic.light()
                                navigation.navigate('Notifications')
                            }}
                        />
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(80).duration(420)}>
                    {planQuery.isLoading ? (
                        <SkeletonCard />
                    ) : planQuery.data ? (
                        <ActivePlanHero
                            palette={palette}
                            title={planQuery.data.title}
                            range={formatDateRange(planQuery.data.start_date, planQuery.data.end_date)}
                            cost={formatCurrency(planQuery.data.estimated_total_cost)}
                            score={formatScore(planQuery.data.overall_score)}
                            onPress={() => navigation.navigate('PlanDetails', { mealPlanId: planQuery.data!.id })}
                        />
                    ) : (
                        <EmptyPlanCard palette={palette} onPress={() => navigation.navigate('GeneratePlan')} />
                    )}
                </Animated.View>

                {todaysItems.length > 0 ? (
                    <Animated.View entering={FadeInDown.delay(150).duration(420)}>
                        <Section
                            title="Меню на сегодня"
                            subtitle={`${todaysItems.length} ${pluralRu(todaysItems.length, ['блюдо', 'блюда', 'блюд'])}`}
                        >
                            <View style={{ gap: spacing.sm }}>
                                {todaysItems.slice(0, 3).map((item) => (
                                    <Card
                                        key={item.id}
                                        elevation="card"
                                        onPress={() => navigation.navigate('RecipeDetails', { recipeId: item.recipe_id })}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                                            <View
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: radii.md,
                                                    backgroundColor: palette.accentSoft,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <Icon
                                                    name={mealTypeIcon(item.meal_type)}
                                                    size={22}
                                                    color={palette.accentText}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text variant="caption" tone="muted">
                                                    {mealTypeLabel(item.meal_type)}
                                                </Text>
                                                <Text variant="bodyStrong" numberOfLines={1}>
                                                    {item.recipe_title}
                                                </Text>
                                            </View>
                                            <Text variant="caption" tone="secondary" weight="700">
                                                {formatCurrency(item.estimated_cost)}
                                            </Text>
                                        </View>
                                    </Card>
                                ))}
                            </View>
                        </Section>
                    </Animated.View>
                ) : null}

                <Animated.View entering={FadeInDown.delay(220).duration(420)}>
                    <Section title="Быстрые действия">
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                            <QuickAction
                                palette={palette}
                                icon="sparkles"
                                label="Новый план"
                                tint={palette.accent}
                                width={quickActionWidth}
                                onPress={() => navigation.navigate('GeneratePlan')}
                            />
                            <QuickAction
                                palette={palette}
                                icon="chefHat"
                                label="Рецепты"
                                tint={palette.success}
                                width={quickActionWidth}
                                onPress={() => navigation.navigate('Recipes')}
                            />
                            <QuickAction
                                palette={palette}
                                icon="package"
                                label="Кладовая"
                                tint={palette.info}
                                width={quickActionWidth}
                                onPress={() => navigation.navigate('Pantry')}
                            />
                            {planQuery.data ? (
                                <QuickAction
                                    palette={palette}
                                    icon="cart"
                                    label="Покупки"
                                    tint={palette.warning}
                                    width={quickActionWidth}
                                    onPress={() =>
                                        navigation.navigate('ShoppingList', {
                                            mealPlanId: planQuery.data!.id,
                                        })
                                    }
                                />
                            ) : null}
                        </View>
                    </Section>
                </Animated.View>

                {favoritesQuery.data && favoritesQuery.data.length > 0 ? (
                    <Animated.View entering={FadeInDown.delay(300).duration(420)}>
                        <Section
                            title="Избранное"
                            subtitle={`${favoritesQuery.data.length} ${pluralRu(favoritesQuery.data.length, ['рецепт', 'рецепта', 'рецептов'])}`}
                        >
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.xxl }}
                            >
                                {favoritesQuery.data.slice(0, 8).map((favorite, index) => (
                                    <Animated.View
                                        key={favorite.recipe_id}
                                        entering={FadeInRight.delay(80 * index).duration(360)}
                                    >
                                        <Card
                                            onPress={() =>
                                                navigation.navigate('RecipeDetails', { recipeId: favorite.recipe_id })
                                            }
                                            style={{ width: 220 }}
                                            elevation="card"
                                        >
                                            <Text variant="overline" tone="accent">
                                                {formatScore(favorite.fit_score)} fit
                                            </Text>
                                            <Text
                                                variant="bodyStrong"
                                                numberOfLines={2}
                                                style={{ marginTop: spacing.xs }}
                                            >
                                                {favorite.title}
                                            </Text>
                                        </Card>
                                    </Animated.View>
                                ))}
                            </ScrollView>
                        </Section>
                    </Animated.View>
                ) : null}
            </ScrollView>
        </Screen>
    )
}

function NotificationBell({
    palette,
    count,
    onPress,
}: {
    palette: Palette
    count: number
    onPress: () => void
}) {
    return (
        <Pressable
            onPress={onPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={count > 0 ? `Уведомлений: ${count}` : 'Уведомления'}
            style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: palette.canvasElevated,
                borderWidth: 1,
                borderColor: palette.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
            })}
        >
            <Icon name="bell" size={20} color={palette.text} />
            {count > 0 ? (
                <View
                    style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        minWidth: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: palette.danger,
                        paddingHorizontal: 5,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: palette.canvas,
                    }}
                >
                    <Text variant="caption" style={{ color: palette.dangerOn, fontSize: 10 }}>
                        {count > 9 ? '9+' : count}
                    </Text>
                </View>
            ) : null}
        </Pressable>
    )
}

function ActivePlanHero({
    palette,
    title,
    range,
    cost,
    score,
    onPress,
}: {
    palette: Palette
    title: string
    range: string
    cost: string
    score: string
    onPress: () => void
}) {
    return (
        <TouchableSurface
            onPress={onPress}
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel={`Активный план: ${title}`}
            style={[{ borderRadius: radii.xl, overflow: 'hidden' }, shadows.raised]}
        >
            <LinearGradient
                colors={[palette.primary, palette.primaryMuted, palette.accentStrong]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: spacing.xl, position: 'relative', overflow: 'hidden' }}
            >
                <View
                    style={{
                        position: 'absolute',
                        top: -50,
                        right: -40,
                        width: 180,
                        height: 180,
                        borderRadius: 90,
                        backgroundColor: palette.accent,
                        opacity: 0.18,
                    }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <View
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: palette.success,
                        }}
                    />
                    <Text variant="overline" style={{ color: palette.accentSoft }}>
                        Активный план
                    </Text>
                </View>
                <Text
                    variant="h1"
                    numberOfLines={2}
                    style={{ color: palette.onPrimary, marginTop: spacing.xs }}
                >
                    {title}
                </Text>
                <Text variant="caption" style={{ color: palette.accentSoft, marginTop: 2 }}>
                    {range}
                </Text>
                <View
                    style={{
                        marginTop: spacing.lg,
                        paddingTop: spacing.md,
                        borderTopWidth: 1,
                        borderTopColor: 'rgba(255,255,255,0.15)',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                    }}
                >
                    <View>
                        <Text variant="overline" style={{ color: palette.accentSoft }}>
                            Бюджет
                        </Text>
                        <Text variant="h2" style={{ color: palette.onPrimary, marginTop: 2 }}>
                            {cost}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="overline" style={{ color: palette.accentSoft }}>
                            Подходит
                        </Text>
                        <Text variant="h2" style={{ color: palette.onPrimary, marginTop: 2 }}>
                            {score}
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        </TouchableSurface>
    )
}

function EmptyPlanCard({ palette, onPress }: { palette: Palette; onPress: () => void }) {
    return (
        <Card elevation="card">
            <View
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: radii.lg,
                    backgroundColor: palette.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon name="calendarDays" size={26} color={palette.accentText} />
            </View>
            <Heading level={3} style={{ marginTop: spacing.sm }}>
                Плана пока нет
            </Heading>
            <Text variant="body" tone="secondary" style={{ marginTop: spacing.xs }}>
                Сгенерируйте недельный план под бюджет и предпочтения вашей семьи.
            </Text>
            <Button
                label="Сгенерировать план"
                onPress={onPress}
                style={{ marginTop: spacing.md }}
                iconLeft={<Icon name="sparkles" size={18} color={palette.onPrimary} />}
            />
        </Card>
    )
}

function QuickAction({
    palette,
    icon,
    label,
    tint,
    width,
    onPress,
}: {
    palette: Palette
    icon: IconName
    label: string
    tint: string
    width: number
    onPress: () => void
}) {
    return (
        <TouchableSurface
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            scaleTo={0.96}
            style={{
                width,
                backgroundColor: palette.canvasElevated,
                borderRadius: radii.lg,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: palette.border,
                gap: spacing.sm,
            }}
        >
            <View
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: radii.md,
                    backgroundColor: tint + '22',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon name={icon} size={22} color={tint} />
            </View>
            <Text variant="bodyStrong">{label}</Text>
        </TouchableSurface>
    )
}
