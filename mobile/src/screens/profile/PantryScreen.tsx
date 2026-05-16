import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetScrollView,
} from '@gorhom/bottom-sheet'
import { useCallback, useRef, useState } from 'react'
import { Alert, FlatList, RefreshControl, ScrollView, View } from 'react-native'
import Animated, { FadeInDown, Layout } from 'react-native-reanimated'

import { useIngredientSearch } from '@features/catalog/hooks'
import { useActiveGroup } from '@features/groups/hooks'
import {
    useCreatePantryItem,
    useDeletePantryItem,
    usePantryItems,
} from '@features/pantry/hooks'
import { useDebouncedValue } from '@shared/lib/use-debounced'
import { formatQuantity, ingredientCategoryLabel, pluralRu } from '@shared/lib/formatters'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { useRefresh } from '@shared/lib/use-refresh'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { SkeletonList } from '@shared/ui/Skeleton'
import { Text } from '@shared/ui/Text'
import { useToast } from '@shared/ui/Toast'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, spacing, type Palette } from '@shared/ui/theme'

const COMMON_UNITS = ['г', 'кг', 'мл', 'л', 'шт', 'ст. л.', 'ч. л.']
type PantrySheetRef = React.ComponentRef<typeof BottomSheetModal>

export function PantryScreen() {
    const palette = usePalette()
    const groupQuery = useActiveGroup()
    const groupId = groupQuery.data?.id
    const pantry = usePantryItems(groupId)
    const create = useCreatePantryItem(groupId)
    const remove = useDeletePantryItem(groupId)
    const toast = useToast()
    const { refreshing, onRefresh } = useRefresh(pantry.refetch)

    const sheetRef = useRef<PantrySheetRef>(null)

    const expiringSoon = (pantry.data ?? []).filter((item) => {
        if (!item.expires_at) return false
        const expiry = new Date(item.expires_at).getTime()
        return expiry - Date.now() < 3 * 24 * 60 * 60 * 1000
    }).length

    const renderBackdrop = useCallback(
        (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                pressBehavior="close"
                opacity={0.5}
            />
        ),
        [],
    )

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(380)} style={{ paddingBottom: spacing.md, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Heading level={1}>Кладовая</Heading>
                <Button
                    label="Добавить"
                    size="sm"
                    onPress={() => {
                        haptic.medium()
                        sheetRef.current?.present()
                    }}
                    iconLeft={<Icon name="plus" size={16} color={palette.onPrimary} strokeWidth={2.4} />}
                />
            </View>
            {expiringSoon > 0 ? (
                <View
                    style={{
                        backgroundColor: palette.warningBg,
                        borderLeftWidth: 4,
                        borderLeftColor: palette.warning,
                        padding: spacing.md,
                        borderRadius: radii.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                    }}
                >
                    <Icon name="alertCircle" size={18} color={palette.warning} />
                    <Text variant="bodyStrong" style={{ color: palette.warning, flex: 1 }}>
                        {expiringSoon} {pluralRu(expiringSoon, ['продукт', 'продукта', 'продуктов'])} скоро истекает
                    </Text>
                </View>
            ) : null}
        </Animated.View>
    )

    if (!groupId) {
        return (
            <Screen>
                <Heading level={1}>Кладовая</Heading>
                <EmptyState
                    title="Сначала создайте семью"
                    description="Кладовая привязана к группе. Завершите онбординг, чтобы создать список своих запасов."
                    icon="package"
                />
            </Screen>
        )
    }

    if (pantry.isLoading && !pantry.data) {
        return (
            <Screen>
                {renderHeader()}
                <SkeletonList count={4} />
            </Screen>
        )
    }

    return (
        <>
            <Screen contentContainerStyle={{ padding: 0 }}>
                <FlatList
                    data={pantry.data ?? []}
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
                            title="Кладовая пуста"
                            description="Добавьте продукты, которые есть дома — мы будем учитывать их при подсчёте списка покупок."
                            actionLabel="Добавить продукт"
                            onAction={() => sheetRef.current?.present()}
                            icon="package"
                        />
                    }
                    renderItem={({ item, index }) => {
                        const expiry = item.expires_at ? new Date(item.expires_at) : null
                        const isExpired = expiry ? expiry.getTime() < Date.now() : false
                        return (
                            <Animated.View
                                entering={FadeInDown.delay(index * 40).duration(360)}
                                layout={Layout.springify()}
                            >
                                <Card elevation="card">
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                                        <View
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: radii.md,
                                                backgroundColor: isExpired ? palette.dangerBg : palette.accentSoft,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Icon
                                                name="package"
                                                size={20}
                                                color={isExpired ? palette.danger : palette.accentText}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text variant="bodyStrong">{item.ingredient_name}</Text>
                                            <Text
                                                variant="caption"
                                                style={{
                                                    color: isExpired ? palette.danger : palette.textMuted,
                                                    marginTop: 2,
                                                }}
                                            >
                                                {formatQuantity(item.quantity, item.unit)}
                                                {expiry
                                                    ? ` · до ${expiry.toLocaleDateString('ru-RU')}${isExpired ? ' (просрочен)' : ''
                                                    }`
                                                    : ''}
                                            </Text>
                                        </View>
                                        <TouchableSurface
                                            onPress={() => {
                                                Alert.alert(
                                                    'Удалить продукт?',
                                                    `${item.ingredient_name} будет убран`,
                                                    [
                                                        { text: 'Отмена', style: 'cancel' },
                                                        {
                                                            text: 'Удалить',
                                                            style: 'destructive',
                                                            onPress: () => {
                                                                haptic.warning()
                                                                remove.mutate(item.id, {
                                                                    onSuccess: () => toast.success('Удалено'),
                                                                    onError: () => toast.error('Не удалось удалить'),
                                                                })
                                                            },
                                                        },
                                                    ],
                                                )
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Удалить ${item.ingredient_name}`}
                                            feedback="medium"
                                            scaleTo={0.92}
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: radii.md,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: palette.dangerBg,
                                            }}
                                        >
                                            <Icon name="trash" size={16} color={palette.danger} />
                                        </TouchableSurface>
                                    </View>
                                </Card>
                            </Animated.View>
                        )
                    }}
                />
            </Screen>
            <PantryAddSheet
                sheetRef={sheetRef}
                renderBackdrop={renderBackdrop}
                onCreate={(payload) =>
                    create.mutate(payload, {
                        onSuccess: () => {
                            haptic.success()
                            toast.success('Продукт добавлен')
                            sheetRef.current?.dismiss()
                        },
                        onError: (err) => {
                            haptic.error()
                            toast.error(err instanceof Error ? err.message : 'Не удалось добавить')
                        },
                    })
                }
                isLoading={create.isPending}
                palette={palette}
            />
        </>
    )
}

function PantryAddSheet({
    sheetRef,
    renderBackdrop,
    onCreate,
    isLoading,
    palette,
}: {
    sheetRef: React.RefObject<PantrySheetRef | null>
    renderBackdrop: (props: React.ComponentProps<typeof BottomSheetBackdrop>) => React.ReactElement
    onCreate: (payload: { ingredient_id: string; quantity: number; unit: string }) => void
    isLoading: boolean
    palette: Palette
}) {
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<{ id: string; name: string; unit: string } | null>(null)
    const [quantity, setQuantity] = useState('1')
    const [unit, setUnit] = useState('шт')
    const debouncedSearch = useDebouncedValue(search, 250)
    const ingredientsQuery = useIngredientSearch(debouncedSearch, !selected)
    const ingredientResults = ingredientsQuery.data ?? []

    return (
        <BottomSheetModal
            ref={sheetRef}
            snapPoints={['85%']}
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={{ backgroundColor: palette.borderStrong }}
            backgroundStyle={{ backgroundColor: palette.canvasElevated }}
            onDismiss={() => {
                setSearch('')
                setSelected(null)
                setQuantity('1')
                setUnit('шт')
            }}
        >
            <BottomSheetScrollView contentContainerStyle={{ padding: spacing.xxl, gap: spacing.md }}>
                <Heading level={2}>Добавить продукт</Heading>
                <Input
                    label="Название"
                    placeholder="Например: молоко"
                    value={selected?.name ?? search}
                    onChangeText={(t) => {
                        setSearch(t)
                        setSelected(null)
                    }}
                    autoCapitalize="none"
                    leftAddon={<Icon name="search" size={18} color={palette.textMuted} />}
                />
                {!selected && debouncedSearch.length >= 1 ? (
                    <View
                        style={{
                            maxHeight: 220,
                            borderWidth: 1,
                            borderColor: palette.border,
                            borderRadius: radii.md,
                            overflow: 'hidden',
                        }}
                    >
                        {ingredientResults.length > 0 ? (
                            <ScrollView
                                nestedScrollEnabled
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={ingredientResults.length > 4}
                            >
                                {ingredientResults.map((item, index) => (
                                    <TouchableSurface
                                        key={item.id}
                                        onPress={() => {
                                            setSelected({ id: item.id, name: item.name, unit: item.unit })
                                            setSearch(item.name)
                                            setUnit(item.unit)
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel={item.name}
                                        style={{
                                            paddingVertical: spacing.sm,
                                            paddingHorizontal: spacing.md,
                                            borderBottomWidth: index < ingredientResults.length - 1 ? 1 : 0,
                                            borderBottomColor: palette.border,
                                        }}
                                    >
                                        <Text variant="body">{item.name}</Text>
                                        <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                                            {ingredientCategoryLabel(item.category)} · {item.unit}
                                        </Text>
                                    </TouchableSurface>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text variant="caption" tone="muted" style={{ padding: spacing.md }}>
                                {ingredientsQuery.isLoading ? 'Поиск…' : 'Не найдено'}
                            </Text>
                        )}
                    </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                        <Input
                            label="Количество"
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="decimal-pad"
                        />
                    </View>
                </View>
                <View>
                    <Text variant="caption" tone="secondary" weight="700" style={{ marginBottom: 6 }}>
                        Единица
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {COMMON_UNITS.map((u) => (
                            <TouchableSurface
                                key={u}
                                onPress={() => {
                                    haptic.selection()
                                    setUnit(u)
                                }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: u === unit }}
                                scaleTo={0.94}
                                style={{
                                    paddingHorizontal: spacing.md,
                                    paddingVertical: 8,
                                    borderRadius: radii.pill,
                                    backgroundColor: u === unit ? palette.primary : palette.canvasMuted,
                                    borderWidth: 1,
                                    borderColor: u === unit ? palette.primary : palette.border,
                                }}
                            >
                                <Text
                                    variant="caption"
                                    weight="700"
                                    style={{ color: u === unit ? palette.onPrimary : palette.text }}
                                >
                                    {u}
                                </Text>
                            </TouchableSurface>
                        ))}
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                    <Button
                        label="Отмена"
                        variant="ghost"
                        onPress={() => sheetRef.current?.dismiss()}
                        style={{ flex: 1 }}
                    />
                    <Button
                        label="Добавить"
                        loading={isLoading}
                        disabled={!selected || !Number(quantity)}
                        onPress={() => {
                            if (!selected) return
                            onCreate({
                                ingredient_id: selected.id,
                                quantity: Number(quantity),
                                unit,
                            })
                        }}
                        style={{ flex: 1 }}
                    />
                </View>
            </BottomSheetScrollView>
        </BottomSheetModal>
    )
}
