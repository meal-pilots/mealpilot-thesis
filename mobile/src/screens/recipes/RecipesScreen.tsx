import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { AppStackParamList } from '@core/navigation/types'
import type { RecipeCategory, RecipeFilters } from '@entities/recipe/types'
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
import { TagList } from '@shared/ui/Tag'
import { Text } from '@shared/ui/Text'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, spacing } from '@shared/ui/theme'

const CATEGORY_FILTERS: { id: RecipeCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'breakfast', label: mealTypeLabel('breakfast') },
    { id: 'lunch', label: mealTypeLabel('lunch') },
    { id: 'dinner', label: mealTypeLabel('dinner') },
    { id: 'snack', label: mealTypeLabel('snack') },
]

export function RecipesScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
    const palette = usePalette()
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState<RecipeCategory | 'all'>('all')
    const debouncedSearch = useDebouncedValue(search, 300)

    const filters = useMemo<RecipeFilters>(() => {
        const next: RecipeFilters = {}
        if (debouncedSearch.trim()) next.search = debouncedSearch.trim()
        if (category !== 'all') next.category = category
        return next
    }, [debouncedSearch, category])

    const { data, isLoading, error, refetch } = useRecipes(filters)
    const { refreshing, onRefresh } = useRefresh(refetch)

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(380)} style={{ gap: spacing.md, paddingBottom: spacing.md }}>
            <Heading level={1}>Рецепты</Heading>
            <Input
                placeholder="Поиск по названию или ингредиенту"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                returnKeyType="search"
                leftAddon={<Icon name="search" size={18} color={palette.textMuted} />}
                rightAddon={
                    search ? (
                        <Pressable
                            onPress={() => {
                                haptic.light()
                                setSearch('')
                            }}
                            hitSlop={12}
                            accessibilityRole="button"
                            accessibilityLabel="Очистить поиск"
                        >
                            <Icon name="x" size={18} color={palette.textMuted} />
                        </Pressable>
                    ) : null
                }
            />
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.sm, paddingVertical: 4 }}
            >
                {CATEGORY_FILTERS.map((option) => {
                    const active = option.id === category
                    return (
                        <TouchableSurface
                            key={option.id}
                            onPress={() => {
                                haptic.selection()
                                setCategory(option.id)
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            scaleTo={0.95}
                            style={{
                                paddingHorizontal: spacing.md,
                                paddingVertical: spacing.sm,
                                borderRadius: radii.pill,
                                backgroundColor: active ? palette.primary : palette.canvasElevated,
                                borderWidth: 1,
                                borderColor: active ? palette.primary : palette.border,
                            }}
                        >
                            <Text
                                variant="caption"
                                weight="700"
                                style={{ color: active ? palette.onPrimary : palette.text }}
                            >
                                {option.label}
                            </Text>
                        </TouchableSurface>
                    )
                })}
            </ScrollView>
        </Animated.View>
    )

    if (isLoading && !data) {
        return (
            <Screen>
                {renderHeader()}
                <SkeletonList count={5} />
            </Screen>
        )
    }

    if (error) {
        return (
            <Screen>
                {renderHeader()}
                <EmptyState
                    title="Не удалось загрузить рецепты"
                    description={error instanceof Error ? error.message : 'Попробуйте обновить'}
                    actionLabel="Повторить"
                    onAction={refetch}
                    icon="alertCircle"
                />
            </Screen>
        )
    }

    return (
        <Screen contentContainerStyle={{ padding: 0 }}>
            <FlatList
                data={data ?? []}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{
                    padding: spacing.xxl,
                    paddingBottom: spacing.huge,
                    gap: spacing.md,
                }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
                }
                ListEmptyComponent={
                    <EmptyState
                        title="Ничего не найдено"
                        description="Попробуйте смягчить фильтры или сменить категорию."
                        icon="search"
                        actionLabel={debouncedSearch || category !== 'all' ? 'Сбросить фильтры' : undefined}
                        onAction={
                            debouncedSearch || category !== 'all'
                                ? () => {
                                      haptic.light()
                                      setSearch('')
                                      setCategory('all')
                                  }
                                : undefined
                        }
                    />
                }
                renderItem={({ item: recipe, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 30).duration(360)}>
                        <Card
                            onPress={() => navigation.navigate('RecipeDetails', { recipeId: recipe.id })}
                            elevation="card"
                            padding={spacing.md}
                        >
                            <View style={{ flexDirection: 'row', gap: spacing.md }}>
                                {recipe.image_url ? (
                                    <Image
                                        source={{
                                            uri:
                                                proxiedImageUrl(recipe.image_url, { width: 200, height: 200, quality: 75 }) ??
                                                recipe.image_url,
                                        }}
                                        style={{ width: 84, height: 84, borderRadius: radii.md }}
                                        contentFit="cover"
                                        transition={200}
                                        cachePolicy="memory-disk"
                                    />
                                ) : (
                                    <View
                                        style={{
                                            width: 84,
                                            height: 84,
                                            borderRadius: radii.md,
                                            backgroundColor: palette.accentSoft,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Icon name="chefHat" size={32} color={palette.accentText} strokeWidth={1.5} />
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text variant="overline" tone="accent">
                                        {mealTypeLabel(recipe.category)} · {formatScore(recipe.fit_score)}
                                    </Text>
                                    <Text variant="bodyStrong" style={{ marginTop: 4 }} numberOfLines={2}>
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
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Icon name="clock" size={12} color={palette.textMuted} />
                                            <Text variant="caption" tone="muted">
                                                {formatMinutes(recipe.total_time_minutes)}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Icon name="wallet" size={12} color={palette.textMuted} />
                                            <Text variant="caption" tone="muted">
                                                {formatCurrency(recipe.estimated_cost)}
                                            </Text>
                                        </View>
                                    </View>
                                    {recipe.tags.length > 0 ? (
                                        <View style={{ marginTop: spacing.sm }}>
                                            <TagList items={recipe.tags.slice(0, 3)} />
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                        </Card>
                    </Animated.View>
                )}
            />
        </Screen>
    )
}
