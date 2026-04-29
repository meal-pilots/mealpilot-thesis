import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'

import type { AppStackParamList, AppTabParamList } from '@core/navigation/types'
import { useAuth } from '@features/auth/model/AuthContext'
import { useActiveGroup } from '@features/groups/hooks'
import { useNotifications } from '@features/notifications/hooks'
import { useCurrentPlan } from '@features/plans/hooks'
import { useFavorites } from '@features/recipes/hooks'
import { formatCurrency, formatDateRange, formatScore } from '@shared/lib/formatters'
import { useRefresh } from '@shared/lib/use-refresh'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { SkeletonCard } from '@shared/ui/Skeleton'
import { palette, radii, shadows, spacing } from '@shared/ui/theme'

type Navigation = NativeStackNavigationProp<AppStackParamList & AppTabParamList>

export function HomeScreen() {
    const navigation = useNavigation<Navigation>()
    const { user } = useAuth()
    const groupQuery = useActiveGroup()
    const groupId = groupQuery.data?.id
    const planQuery = useCurrentPlan(groupId)
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

    const greeting = user?.full_name ? `Привет, ${user.full_name.split(' ')[0]}!` : 'Добро пожаловать'

    return (
        <Screen contentContainerStyle={{ padding: 0 }}>
            <ScrollView
                contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
                }
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, color: palette.textMuted }}>{greeting}</Text>
                        <Heading level={1}>{groupQuery.data?.name ?? 'Ваша кухня'}</Heading>
                    </View>
                    <Pressable
                        onPress={() => navigation.navigate('Notifications')}
                        hitSlop={8}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: palette.canvasMuted,
                            borderWidth: 1,
                            borderColor: palette.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text style={{ fontSize: 18 }}>🔔</Text>
                        {unreadCount > 0 ? (
                            <View
                                style={{
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    minWidth: 18,
                                    height: 18,
                                    borderRadius: 9,
                                    backgroundColor: palette.danger,
                                    paddingHorizontal: 4,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={{ color: palette.onPrimary, fontSize: 10, fontWeight: '700' }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        ) : null}
                    </Pressable>
                </View>

                <Section title="Текущий план">
                    {planQuery.isLoading ? (
                        <SkeletonCard />
                    ) : planQuery.data ? (
                        <Pressable
                            onPress={() =>
                                navigation.navigate('PlanDetails', { mealPlanId: planQuery.data!.id })
                            }
                            style={({ pressed }) => [
                                {
                                    backgroundColor: palette.primary,
                                    borderRadius: radii.lg,
                                    padding: spacing.lg,
                                    transform: [{ scale: pressed ? 0.98 : 1 }],
                                },
                                shadows.raised,
                            ]}
                        >
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: palette.accentStrong,
                                    fontWeight: '700',
                                    letterSpacing: 0.5,
                                    textTransform: 'uppercase',
                                }}
                            >
                                Активный план
                            </Text>
                            <Text
                                style={{
                                    color: palette.onPrimary,
                                    fontSize: 22,
                                    fontWeight: '700',
                                    marginTop: spacing.xs,
                                    letterSpacing: -0.3,
                                }}
                                numberOfLines={2}
                            >
                                {planQuery.data.title}
                            </Text>
                            <Text style={{ color: palette.accentStrong, marginTop: 4, fontSize: 13 }}>
                                {formatDateRange(planQuery.data.start_date, planQuery.data.end_date)}
                            </Text>
                            <View
                                style={{
                                    marginTop: spacing.lg,
                                    paddingTop: spacing.md,
                                    borderTopWidth: 1,
                                    borderTopColor: 'rgba(255,255,255,0.1)',
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <View>
                                    <Text style={{ color: palette.accentStrong, fontSize: 11, fontWeight: '600' }}>
                                        БЮДЖЕТ
                                    </Text>
                                    <Text style={{ color: palette.onPrimary, fontWeight: '700', fontSize: 16, marginTop: 2 }}>
                                        {formatCurrency(planQuery.data.estimated_total_cost)}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ color: palette.accentStrong, fontSize: 11, fontWeight: '600' }}>
                                        FIT
                                    </Text>
                                    <Text style={{ color: palette.onPrimary, fontWeight: '700', fontSize: 16, marginTop: 2 }}>
                                        {formatScore(planQuery.data.overall_score)}
                                    </Text>
                                </View>
                            </View>
                        </Pressable>
                    ) : (
                        <Card>
                            <Text style={{ fontSize: 32 }}>🗓️</Text>
                            <Heading level={3} style={{ marginTop: spacing.sm }}>
                                Плана пока нет
                            </Heading>
                            <Text style={{ marginTop: spacing.xs, color: palette.textSecondary, lineHeight: 20 }}>
                                Сгенерируйте недельный план под бюджет и предпочтения вашей семьи.
                            </Text>
                            <Button
                                label="Сгенерировать план"
                                onPress={() => navigation.navigate('GeneratePlan')}
                                style={{ marginTop: spacing.md }}
                            />
                        </Card>
                    )}
                </Section>

                <Section title="Быстрые действия">
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                        <QuickAction
                            icon="✨"
                            label="Новый план"
                            onPress={() => navigation.navigate('GeneratePlan')}
                        />
                        <QuickAction
                            icon="🍽️"
                            label="Рецепты"
                            onPress={() => navigation.navigate('Recipes')}
                        />
                        <QuickAction
                            icon="🥫"
                            label="Кладовая"
                            onPress={() => navigation.navigate('Pantry')}
                        />
                        {planQuery.data ? (
                            <QuickAction
                                icon="🛒"
                                label="Покупки"
                                onPress={() =>
                                    navigation.navigate('ShoppingList', {
                                        mealPlanId: planQuery.data!.id,
                                    })
                                }
                            />
                        ) : null}
                    </View>
                </Section>

                {favoritesQuery.data && favoritesQuery.data.length > 0 ? (
                    <Section
                        title="Избранное"
                        subtitle={`${favoritesQuery.data.length} рецептов`}
                    >
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: spacing.sm }}
                        >
                            {favoritesQuery.data.slice(0, 8).map((favorite) => (
                                <Card
                                    key={favorite.recipe_id}
                                    onPress={() =>
                                        navigation.navigate('RecipeDetails', { recipeId: favorite.recipe_id })
                                    }
                                    style={{ width: 220 }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            color: palette.accentText,
                                            fontWeight: '700',
                                            letterSpacing: 0.4,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {formatScore(favorite.fit_score)} fit
                                    </Text>
                                    <Text
                                        style={{
                                            marginTop: spacing.xs,
                                            fontWeight: '700',
                                            color: palette.text,
                                            fontSize: 15,
                                        }}
                                        numberOfLines={2}
                                    >
                                        {favorite.title}
                                    </Text>
                                </Card>
                            ))}
                        </ScrollView>
                    </Section>
                ) : null}
            </ScrollView>
        </Screen>
    )
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
                width: '47%',
                backgroundColor: palette.canvasMuted,
                borderRadius: radii.lg,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: palette.border,
                alignItems: 'flex-start',
                gap: spacing.xs,
                opacity: pressed ? 0.85 : 1,
            })}
        >
            <Text style={{ fontSize: 22 }}>{icon}</Text>
            <Text style={{ fontWeight: '700', color: palette.text, fontSize: 14 }}>{label}</Text>
        </Pressable>
    )
}
