import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FlatList, RefreshControl, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { AppStackParamList } from '@core/navigation/types'
import { useFavorites } from '@features/recipes/hooks'
import { formatScore, pluralRu } from '@shared/lib/formatters'
import { usePalette } from '@shared/lib/use-palette'
import { useRefresh } from '@shared/lib/use-refresh'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { Screen } from '@shared/ui/Screen'
import { SkeletonList } from '@shared/ui/Skeleton'
import { Text } from '@shared/ui/Text'
import { radii, spacing } from '@shared/ui/theme'

export function FavoritesScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
    const palette = usePalette()
    const favorites = useFavorites()
    const { refreshing, onRefresh } = useRefresh(favorites.refetch)

    if (favorites.isLoading && !favorites.data) {
        return (
            <Screen>
                <Heading level={1}>Избранное</Heading>
                <SkeletonList count={4} />
            </Screen>
        )
    }

    return (
        <Screen contentContainerStyle={{ padding: 0 }}>
            <FlatList
                data={favorites.data ?? []}
                keyExtractor={(item) => item.recipe_id}
                ListHeaderComponent={
                    <View style={{ paddingBottom: spacing.md }}>
                        <Heading level={1}>Избранное</Heading>
                        <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                            {favorites.data?.length ?? 0}{' '}
                            {pluralRu(favorites.data?.length ?? 0, ['рецепт', 'рецепта', 'рецептов'])}
                        </Text>
                    </View>
                }
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
                        title="Пока пусто"
                        description="Открывайте рецепт и нажимайте сердце в шапке, чтобы сохранить его в избранное."
                        icon="heart"
                    />
                }
                renderItem={({ item: favorite, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 30).duration(360)}>
                        <Card
                            onPress={() => navigation.navigate('RecipeDetails', { recipeId: favorite.recipe_id })}
                            elevation="card"
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                                <View
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: radii.md,
                                        backgroundColor: palette.dangerBg,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Icon name="heart" size={20} color={palette.danger} fill={palette.danger} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text variant="overline" tone="accent">
                                        {formatScore(favorite.fit_score)} подходит
                                    </Text>
                                    <Text variant="bodyStrong" numberOfLines={2} style={{ marginTop: 2 }}>
                                        {favorite.title}
                                    </Text>
                                </View>
                                <Icon name="chevronRight" size={18} color={palette.textMuted} />
                            </View>
                        </Card>
                    </Animated.View>
                )}
            />
        </Screen>
    )
}
