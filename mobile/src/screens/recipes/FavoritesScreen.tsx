import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FlatList, RefreshControl, Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import { useFavorites } from '@features/recipes/hooks'
import { formatScore } from '@shared/lib/formatters'
import { useRefresh } from '@shared/lib/use-refresh'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { Screen } from '@shared/ui/Screen'
import { SkeletonList } from '@shared/ui/Skeleton'
import { palette, spacing } from '@shared/ui/theme'

export function FavoritesScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
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
                        <Text style={{ color: palette.textMuted, marginTop: spacing.xs }}>
                            {favorites.data?.length ?? 0} рецептов
                        </Text>
                    </View>
                }
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
                        title="Пока пусто"
                        description="Открывайте рецепт и нажимайте ★ в шапке, чтобы сохранить его в избранное."
                        emoji="⭐"
                    />
                }
                renderItem={({ item: favorite }) => (
                    <Card
                        onPress={() =>
                            navigation.navigate('RecipeDetails', { recipeId: favorite.recipe_id })
                        }
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
                            {formatScore(favorite.fit_score)} подходит
                        </Text>
                        <Text
                            style={{
                                marginTop: spacing.xs,
                                fontWeight: '700',
                                color: palette.text,
                                fontSize: 16,
                            }}
                            numberOfLines={2}
                        >
                            {favorite.title}
                        </Text>
                    </Card>
                )}
            />
        </Screen>
    )
}
