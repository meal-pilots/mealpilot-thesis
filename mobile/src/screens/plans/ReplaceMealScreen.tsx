import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { AppStackParamList } from '@core/navigation/types'
import type { RecipeCategory, RecipeFilters } from '@entities/recipe/types'
import { useReplaceMealItem } from '@features/plans/hooks'
import { useRecipes } from '@features/recipes/hooks'
import { formatCurrency, formatMinutes, formatScore, mealTypeLabel } from '@shared/lib/formatters'
import { haptic } from '@shared/lib/haptics'
import { proxiedImageUrl } from '@shared/lib/image-proxy'
import { useDebouncedValue } from '@shared/lib/use-debounced'
import { usePalette } from '@shared/lib/use-palette'
import { useRefresh } from '@shared/lib/use-refresh'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { SkeletonList } from '@shared/ui/Skeleton'
import { Text } from '@shared/ui/Text'
import { useToast } from '@shared/ui/Toast'
import { radii, spacing } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'ReplaceMeal'>

export function ReplaceMealScreen() {
    const { params } = useRoute<Route>()
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
    const palette = usePalette()
    const toast = useToast()
    const replace = useReplaceMealItem()

    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search, 300)

    const filters = useMemo<RecipeFilters>(() => {
        const out: RecipeFilters = {}
        if (debouncedSearch.trim()) out.search = debouncedSearch.trim()
        if (params.mealType) out.category = params.mealType as RecipeCategory
        return out
    }, [debouncedSearch, params.mealType])

    const recipes = useRecipes(filters)
    const { refreshing, onRefresh } = useRefresh(recipes.refetch)

    const handleReplace = (recipeId: string, recipeTitle: string) => {
        haptic.medium()
        replace.mutate(
            {
                itemId: params.mealPlanItemId,
                replacementRecipeId: recipeId,
                planId: params.mealPlanId,
            },
            {
                onSuccess: () => {
                    haptic.success()
                    toast.success(`Заменено на «${recipeTitle}»`)
                    navigation.goBack()
                },
                onError: (err) => {
                    haptic.error()
                    toast.error(err instanceof Error ? err.message : 'Не удалось заменить')
                },
            },
        )
    }

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(380)} style={{ paddingBottom: spacing.md, gap: spacing.md }}>
            <Heading level={1}>Заменить блюдо</Heading>
            {params.currentRecipeName ? (
                <View
                    style={{
                        padding: spacing.md,
                        borderRadius: radii.md,
                        backgroundColor: palette.canvasMuted,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                    }}
                >
                    <Icon name="repeat" size={16} color={palette.textMuted} />
                    <View style={{ flex: 1 }}>
                        <Text variant="caption" tone="muted">
                            Сейчас
                        </Text>
                        <Text variant="bodyStrong">{params.currentRecipeName}</Text>
                    </View>
                </View>
            ) : null}
            <Input
                placeholder="Поиск замены"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                returnKeyType="search"
                leftAddon={<Icon name="search" size={18} color={palette.textMuted} />}
            />
        </Animated.View>
    )

    if (recipes.isLoading && !recipes.data) {
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
                data={recipes.data ?? []}
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
                        title="Нет подходящих рецептов"
                        description="Попробуйте смягчить поиск."
                        icon="search"
                    />
                }
                renderItem={({ item: recipe, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 30).duration(360)}>
                        <Pressable
                            onPress={() => handleReplace(recipe.id, recipe.title)}
                            disabled={replace.isPending}
                            accessibilityRole="button"
                            accessibilityLabel={`Заменить на ${recipe.title}`}
                        >
                            <Card style={{ opacity: replace.isPending ? 0.6 : 1 }} elevation="card">
                                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                                    {recipe.image_url ? (
                                        <Image
                                            source={{
                                                uri:
                                                    proxiedImageUrl(recipe.image_url, { width: 160, height: 160, quality: 75 }) ??
                                                    recipe.image_url,
                                            }}
                                            style={{ width: 64, height: 64, borderRadius: radii.md }}
                                            contentFit="cover"
                                            transition={200}
                                            cachePolicy="memory-disk"
                                        />
                                    ) : (
                                        <View
                                            style={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: radii.md,
                                                backgroundColor: palette.accentSoft,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Icon name="chefHat" size={26} color={palette.accentText} />
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text variant="overline" tone="accent">
                                            {mealTypeLabel(recipe.category)} · {formatScore(recipe.fit_score)}
                                        </Text>
                                        <Text variant="bodyStrong" numberOfLines={2}>
                                            {recipe.title}
                                        </Text>
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: spacing.sm,
                                                marginTop: 4,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                }}
                                            >
                                                <Icon name="clock" size={12} color={palette.textMuted} />
                                                <Text variant="caption" tone="muted">
                                                    {formatMinutes(recipe.total_time_minutes)}
                                                </Text>
                                            </View>
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                }}
                                            >
                                                <Icon name="wallet" size={12} color={palette.textMuted} />
                                                <Text variant="caption" tone="muted">
                                                    {formatCurrency(recipe.estimated_cost)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <Icon name="chevronRight" size={18} color={palette.textMuted} />
                                </View>
                            </Card>
                        </Pressable>
                    </Animated.View>
                )}
            />
        </Screen>
    )
}
