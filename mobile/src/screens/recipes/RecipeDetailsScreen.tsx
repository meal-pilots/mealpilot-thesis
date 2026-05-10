import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Image } from 'expo-image'
import { useLayoutEffect, useMemo } from 'react'
import { Dimensions, Platform, Pressable, View } from 'react-native'
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { AppStackParamList } from '@core/navigation/types'
import { useFavorites, useRecipe, useToggleFavorite } from '@features/recipes/hooks'
import {
    cuisineLabel,
    formatCalories,
    formatCurrency,
    formatGrams,
    formatMinutes,
    formatQuantity,
    formatScore,
    mealTypeLabel,
    pluralRu,
} from '@shared/lib/formatters'
import { haptic } from '@shared/lib/haptics'
import { proxiedImageUrl } from '@shared/lib/image-proxy'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Icon, type IconName } from '@shared/ui/Icon'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Section } from '@shared/ui/Section'
import { TagList } from '@shared/ui/Tag'
import { Text } from '@shared/ui/Text'
import { useToast } from '@shared/ui/Toast'
import { radii, shadows, spacing, type Palette } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'RecipeDetails'>

const { width: screenWidth } = Dimensions.get('window')
const HERO_HEIGHT = Math.round(screenWidth * 0.78)

export function RecipeDetailsScreen() {
    const { params } = useRoute<Route>()
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
    const palette = usePalette()
    const insets = useSafeAreaInsets()
    const toast = useToast()

    const { data, isLoading, error, refetch } = useRecipe(params.recipeId)
    const { data: favorites } = useFavorites()
    const toggleFavorite = useToggleFavorite()

    const isFavorited = useMemo(
        () => favorites?.some((f) => f.recipe_id === params.recipeId) ?? false,
        [favorites, params.recipeId],
    )

    const scrollY = useSharedValue(0)
    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y
        },
    })

    const heroAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateY: interpolate(scrollY.value, [-HERO_HEIGHT, 0, HERO_HEIGHT], [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.4], Extrapolation.CLAMP),
            },
            {
                scale: interpolate(scrollY.value, [-HERO_HEIGHT, 0], [2, 1], Extrapolation.CLAMP),
            },
        ],
    }))

    const headerOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.value, [HERO_HEIGHT - 80, HERO_HEIGHT - 20], [0, 1], Extrapolation.CLAMP),
    }))

    useLayoutEffect(() => {
        navigation.setOptions({
            title: '',
            headerTransparent: true,
            headerLeft: () => (
                <Pressable
                    onPress={() => navigation.goBack()}
                    accessibilityRole="button"
                    accessibilityLabel="Назад"
                    hitSlop={12}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon name="chevronLeft" size={22} color="#FFFFFF" />
                </Pressable>
            ),
            headerRight: () => (
                <Pressable
                    onPress={() => {
                        if (toggleFavorite.isPending) return
                        haptic.medium()
                        toggleFavorite.mutate(
                            { recipeId: params.recipeId, currentlyFavorited: isFavorited },
                            {
                                onSuccess: () => {
                                    toast.success(isFavorited ? 'Удалено из избранного' : 'Добавлено в избранное')
                                },
                                onError: () => toast.error('Не удалось обновить избранное'),
                            },
                        )
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={isFavorited ? 'Удалить из избранного' : 'Добавить в избранное'}
                    hitSlop={12}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon
                        name="heart"
                        size={22}
                        color={isFavorited ? palette.danger : '#FFFFFF'}
                        fill={isFavorited ? palette.danger : 'transparent'}
                    />
                </Pressable>
            ),
        })
    }, [isFavorited, navigation, palette.danger, params.recipeId, toast, toggleFavorite])

    return (
        <View style={{ flex: 1, backgroundColor: palette.canvas }}>
            <QueryBoundary isLoading={isLoading} error={error} refetch={refetch}>
                {data ? (
                    <>
                        <Animated.View
                            style={[
                                {
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: HERO_HEIGHT,
                                    backgroundColor: palette.accentSoft,
                                    zIndex: 0,
                                },
                                heroAnimatedStyle,
                            ]}
                        >
                            {data.image_url ? (
                                <Image
                                    source={{
                                        uri:
                                            proxiedImageUrl(data.image_url, { width: 1200, quality: 80 }) ??
                                            data.image_url,
                                    }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                    transition={300}
                                    cachePolicy="memory-disk"
                                    onError={() => undefined}
                                />
                            ) : (
                                <LinearGradient
                                    colors={[palette.accent, palette.accentStrong]}
                                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Icon name="chefHat" size={64} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
                                </LinearGradient>
                            )}
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.55)']}
                                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' }}
                            />
                        </Animated.View>

                        <Animated.View
                            pointerEvents="none"
                            style={[
                                {
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: insets.top + 56,
                                    backgroundColor: palette.canvas,
                                    borderBottomWidth: 1,
                                    borderBottomColor: palette.border,
                                    zIndex: 1,
                                },
                                headerOpacity,
                            ]}
                        />

                        <Animated.ScrollView
                            onScroll={onScroll}
                            scrollEventThrottle={16}
                            style={{ flex: 1 }}
                            contentContainerStyle={{
                                paddingTop: HERO_HEIGHT - 40,
                                paddingBottom: 120 + insets.bottom,
                            }}
                            showsVerticalScrollIndicator={false}
                        >
                            <View
                                style={{
                                    backgroundColor: palette.canvas,
                                    borderTopLeftRadius: radii.xxl,
                                    borderTopRightRadius: radii.xxl,
                                    paddingHorizontal: spacing.xxl,
                                    paddingTop: spacing.xxl,
                                    gap: spacing.lg,
                                    minHeight: 1000,
                                }}
                            >
                                <View>
                                    <Text variant="overline" tone="accent">
                                        {mealTypeLabel(data.category)} · {cuisineLabel(data.cuisine_type)}
                                    </Text>
                                    <Heading level={1} style={{ marginTop: spacing.xs }}>
                                        {data.title}
                                    </Heading>
                                    {data.short_description ? (
                                        <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
                                            {data.short_description}
                                        </Text>
                                    ) : null}
                                </View>

                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                                    <Pill
                                        palette={palette}
                                        icon="clock"
                                        label={formatMinutes(data.total_time_minutes)}
                                        sublabel="Время"
                                    />
                                    <Pill
                                        palette={palette}
                                        icon="wallet"
                                        label={formatCurrency(data.estimated_cost)}
                                        sublabel="Стоимость"
                                    />
                                    <Pill
                                        palette={palette}
                                        icon="target"
                                        label={formatScore(data.suitability.fit_score)}
                                        sublabel="Подходит"
                                        emphasis
                                    />
                                    <Pill
                                        palette={palette}
                                        icon="users"
                                        label={String(data.servings_default)}
                                        sublabel="Порций"
                                    />
                                </View>

                                {data.tags.length > 0 ? (
                                    <Section title="Теги">
                                        <TagList items={data.tags} />
                                    </Section>
                                ) : null}

                                {data.nutrition ? (
                                    <Section title="Нутриенты на порцию">
                                        <Card elevation="card">
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
                                                <NutritionBox
                                                    palette={palette}
                                                    label="Калории"
                                                    icon="flame"
                                                    color={palette.danger}
                                                    value={formatCalories(data.nutrition.calories_per_serving)}
                                                />
                                                <NutritionBox
                                                    palette={palette}
                                                    label="Белки"
                                                    icon="zap"
                                                    color={palette.success}
                                                    value={formatGrams(data.nutrition.protein_per_serving_g)}
                                                />
                                                <NutritionBox
                                                    palette={palette}
                                                    label="Жиры"
                                                    icon="cookie"
                                                    color={palette.warning}
                                                    value={formatGrams(data.nutrition.fat_per_serving_g)}
                                                />
                                                <NutritionBox
                                                    palette={palette}
                                                    label="Углеводы"
                                                    icon="croissant"
                                                    color={palette.info}
                                                    value={formatGrams(data.nutrition.carb_per_serving_g)}
                                                />
                                            </View>
                                        </Card>
                                    </Section>
                                ) : null}

                                <Section
                                    title="Ингредиенты"
                                    subtitle={`${data.ingredients.length} ${pluralRu(data.ingredients.length, ['позиция', 'позиции', 'позиций'])}`}
                                >
                                    <Card elevation="card">
                                        {data.ingredients.map((ing, index) => (
                                            <View
                                                key={ing.ingredient_id}
                                                style={{
                                                    paddingVertical: spacing.sm,
                                                    borderTopWidth: index === 0 ? 0 : 1,
                                                    borderTopColor: palette.border,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: spacing.sm,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: 3,
                                                        backgroundColor: palette.accent,
                                                    }}
                                                />
                                                <Text variant="body" style={{ flex: 1 }}>
                                                    {ing.name}
                                                    {ing.preparation_note ? `, ${ing.preparation_note}` : ''}
                                                </Text>
                                                <Text variant="caption" tone="muted" weight="700">
                                                    {formatQuantity(ing.quantity, ing.unit)}
                                                </Text>
                                            </View>
                                        ))}
                                    </Card>
                                </Section>

                                {data.steps.length > 0 ? (
                                    <Section
                                        title="Приготовление"
                                        subtitle={`${data.steps.length} ${pluralRu(data.steps.length, ['шаг', 'шага', 'шагов'])}`}
                                    >
                                        <View style={{ gap: spacing.sm }}>
                                            {data.steps.map((step) => (
                                                <Card key={step.order} elevation="card">
                                                    <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: spacing.sm,
                                                        }}
                                                    >
                                                        <View
                                                            style={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: radii.pill,
                                                                backgroundColor: palette.accent,
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        >
                                                            <Text
                                                                variant="bodyStrong"
                                                                style={{ color: palette.textOnAccent, fontSize: 14 }}
                                                            >
                                                                {step.order}
                                                            </Text>
                                                        </View>
                                                        {step.duration_minutes ? (
                                                            <View
                                                                style={{
                                                                    flexDirection: 'row',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                }}
                                                            >
                                                                <Icon name="timer" size={14} color={palette.textMuted} />
                                                                <Text variant="caption" tone="muted" weight="700">
                                                                    {formatMinutes(step.duration_minutes)}
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                    <Text
                                                        variant="body"
                                                        style={{ marginTop: spacing.sm, lineHeight: 22 }}
                                                    >
                                                        {step.instruction_text}
                                                    </Text>
                                                </Card>
                                            ))}
                                        </View>
                                    </Section>
                                ) : null}

                                {data.suitability.matches.length > 0 || data.suitability.conflicts.length > 0 ? (
                                    <Section title="Подходит ли вашей семье">
                                        <Card elevation="card">
                                            {data.suitability.matches.length > 0 ? (
                                                <View style={{ marginBottom: spacing.sm, gap: spacing.xs }}>
                                                    <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: spacing.xs,
                                                        }}
                                                    >
                                                        <Icon name="checkCircle" size={16} color={palette.success} />
                                                        <Text variant="bodyStrong" tone="success">
                                                            Плюсы
                                                        </Text>
                                                    </View>
                                                    {data.suitability.matches.map((m) => (
                                                        <Text key={m} variant="body" tone="success">
                                                            • {m}
                                                        </Text>
                                                    ))}
                                                </View>
                                            ) : null}
                                            {data.suitability.conflicts.length > 0 ? (
                                                <View style={{ gap: spacing.xs }}>
                                                    <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: spacing.xs,
                                                        }}
                                                    >
                                                        <Icon name="alertCircle" size={16} color={palette.danger} />
                                                        <Text variant="bodyStrong" tone="danger">
                                                            Замечания
                                                        </Text>
                                                    </View>
                                                    {data.suitability.conflicts.map((c) => (
                                                        <Text key={c} variant="body" tone="danger">
                                                            • {c}
                                                        </Text>
                                                    ))}
                                                </View>
                                            ) : null}
                                        </Card>
                                    </Section>
                                ) : null}
                            </View>
                        </Animated.ScrollView>

                        <View
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                paddingHorizontal: spacing.xl,
                                paddingTop: spacing.md,
                                paddingBottom: Math.max(insets.bottom, spacing.md),
                                backgroundColor: palette.canvas,
                                borderTopWidth: 1,
                                borderTopColor: palette.border,
                                flexDirection: 'row',
                                gap: spacing.sm,
                                ...(Platform.OS === 'ios' ? shadows.raised : shadows.card),
                            }}
                        >
                            <Button
                                label={isFavorited ? 'В избранном' : 'В избранное'}
                                variant="ghost"
                                onPress={() => {
                                    haptic.medium()
                                    toggleFavorite.mutate({
                                        recipeId: params.recipeId,
                                        currentlyFavorited: isFavorited,
                                    })
                                }}
                                style={{ flex: 1 }}
                                iconLeft={
                                    <Icon
                                        name="heart"
                                        size={18}
                                        color={isFavorited ? palette.danger : palette.text}
                                        fill={isFavorited ? palette.danger : 'transparent'}
                                    />
                                }
                            />
                            <Button
                                label="Готовить"
                                onPress={() => haptic.success()}
                                style={{ flex: 1.4 }}
                                iconLeft={<Icon name="chefHat" size={18} color={palette.onPrimary} />}
                            />
                        </View>
                    </>
                ) : null}
            </QueryBoundary>
        </View>
    )
}

function Pill({
    palette,
    icon,
    label,
    sublabel,
    emphasis,
}: {
    palette: Palette
    icon: IconName
    label: string
    sublabel: string
    emphasis?: boolean
}) {
    const bg = emphasis ? palette.primary : palette.canvasElevated
    const fg = emphasis ? palette.onPrimary : palette.text
    const subFg = emphasis ? palette.accentSoft : palette.textMuted
    return (
        <View
            style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: radii.lg,
                backgroundColor: bg,
                borderWidth: emphasis ? 0 : 1,
                borderColor: palette.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
            }}
        >
            <Icon name={icon} size={18} color={fg} />
            <View>
                <Text variant="caption" style={{ color: subFg }}>
                    {sublabel}
                </Text>
                <Text variant="bodyStrong" style={{ color: fg }}>
                    {label}
                </Text>
            </View>
        </View>
    )
}

function NutritionBox({
    palette,
    label,
    icon,
    color,
    value,
}: {
    palette: Palette
    label: string
    icon: IconName
    color: string
    value: string
}) {
    return (
        <View style={{ flexBasis: '40%', flexGrow: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: color + '22',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon name={icon} size={14} color={color} />
                </View>
                <Text variant="overline" style={{ color: palette.textMuted }}>
                    {label}
                </Text>
            </View>
            <Text variant="h3">{value}</Text>
        </View>
    )
}
