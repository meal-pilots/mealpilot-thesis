import { useState } from 'react'
import { Alert, FlatList, Modal, Pressable, RefreshControl, Text, View } from 'react-native'

import { useIngredientSearch } from '@features/catalog/hooks'
import { useActiveGroup } from '@features/groups/hooks'
import {
    useCreatePantryItem,
    useDeletePantryItem,
    usePantryItems,
} from '@features/pantry/hooks'
import { useDebouncedValue } from '@shared/lib/use-debounced'
import { useRefresh } from '@shared/lib/use-refresh'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { SkeletonList } from '@shared/ui/Skeleton'
import { useToast } from '@shared/ui/Toast'
import { palette, radii, spacing } from '@shared/ui/theme'

const COMMON_UNITS = ['г', 'кг', 'мл', 'л', 'шт', 'ст. л.', 'ч. л.']

export function PantryScreen() {
    const groupQuery = useActiveGroup()
    const groupId = groupQuery.data?.id
    const pantry = usePantryItems(groupId)
    const create = useCreatePantryItem(groupId)
    const remove = useDeletePantryItem(groupId)
    const toast = useToast()
    const { refreshing, onRefresh } = useRefresh(pantry.refetch)

    const [modalOpen, setModalOpen] = useState(false)

    const expiringSoon = (pantry.data ?? []).filter((item) => {
        if (!item.expires_at) return false
        const expiry = new Date(item.expires_at).getTime()
        return expiry - Date.now() < 3 * 24 * 60 * 60 * 1000
    }).length

    const renderHeader = () => (
        <View style={{ paddingBottom: spacing.md, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Heading level={1}>Кладовая</Heading>
                <Button
                    label="Добавить"
                    size="sm"
                    onPress={() => setModalOpen(true)}
                    iconLeft={<Text style={{ color: palette.onPrimary, fontSize: 16, fontWeight: '700' }}>＋</Text>}
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
                    }}
                >
                    <Text style={{ color: palette.warning, fontWeight: '700' }}>
                        {expiringSoon} {expiringSoon === 1 ? 'продукт' : 'продуктов'} скоро истекает
                    </Text>
                </View>
            ) : null}
        </View>
    )

    if (!groupId) {
        return (
            <Screen>
                <Heading level={1}>Кладовая</Heading>
                <EmptyState
                    title="Сначала создайте семью"
                    description="Кладовая привязана к группе. Завершите онбординг, чтобы создать список своих запасов."
                    emoji="🥫"
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
        <Screen contentContainerStyle={{ padding: 0 }}>
            <FlatList
                data={pantry.data ?? []}
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
                        title="Кладовая пуста"
                        description="Добавьте продукты, которые есть дома — мы будем учитывать их при подсчёте списка покупок."
                        actionLabel="Добавить продукт"
                        onAction={() => setModalOpen(true)}
                        emoji="🥫"
                    />
                }
                renderItem={({ item }) => {
                    const expiry = item.expires_at ? new Date(item.expires_at) : null
                    const isExpired = expiry ? expiry.getTime() < Date.now() : false
                    return (
                        <Card>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1, marginRight: spacing.md }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: palette.text }}>
                                        {item.ingredient_name}
                                    </Text>
                                    <Text style={{ color: palette.textMuted, marginTop: 2, fontSize: 13 }}>
                                        {Number(item.quantity)} {item.unit}
                                        {expiry
                                            ? ` · до ${expiry.toLocaleDateString('ru-RU')}${
                                                  isExpired ? ' (просрочен)' : ''
                                              }`
                                            : ''}
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() => {
                                        Alert.alert('Удалить продукт?', `${item.ingredient_name} будет убран`, [
                                            { text: 'Отмена', style: 'cancel' },
                                            {
                                                text: 'Удалить',
                                                style: 'destructive',
                                                onPress: () =>
                                                    remove.mutate(item.id, {
                                                        onSuccess: () => toast.success('Удалено'),
                                                        onError: () => toast.error('Не удалось удалить'),
                                                    }),
                                            },
                                        ])
                                    }}
                                    hitSlop={8}
                                    style={{ paddingHorizontal: spacing.sm, justifyContent: 'center' }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Удалить"
                                >
                                    <Text style={{ fontSize: 22, color: palette.danger }}>×</Text>
                                </Pressable>
                            </View>
                        </Card>
                    )
                }}
            />
            <PantryAddModal
                visible={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreate={(payload) =>
                    create.mutate(payload, {
                        onSuccess: () => {
                            toast.success('Продукт добавлен')
                            setModalOpen(false)
                        },
                        onError: (err) =>
                            toast.error(err instanceof Error ? err.message : 'Не удалось добавить'),
                    })
                }
                isLoading={create.isPending}
            />
        </Screen>
    )
}

function PantryAddModal({
    visible,
    onClose,
    onCreate,
    isLoading,
}: {
    visible: boolean
    onClose: () => void
    onCreate: (payload: { ingredient_id: string; quantity: number; unit: string }) => void
    isLoading: boolean
}) {
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<{ id: string; name: string; unit: string } | null>(null)
    const [quantity, setQuantity] = useState('1')
    const [unit, setUnit] = useState('шт')
    const debouncedSearch = useDebouncedValue(search, 250)
    const ingredientsQuery = useIngredientSearch(debouncedSearch, !selected)

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: palette.overlay, justifyContent: 'flex-end' }}>
                <View
                    style={{
                        backgroundColor: palette.canvas,
                        padding: spacing.lg,
                        borderTopLeftRadius: radii.xl,
                        borderTopRightRadius: radii.xl,
                        gap: spacing.md,
                        maxHeight: '85%',
                    }}
                >
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
                    />
                    {!selected && debouncedSearch.length >= 1 ? (
                        <View style={{ maxHeight: 220, borderWidth: 1, borderColor: palette.border, borderRadius: radii.md }}>
                            <FlatList
                                data={ingredientsQuery.data ?? []}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <Pressable
                                        onPress={() => {
                                            setSelected({ id: item.id, name: item.name, unit: item.unit })
                                            setSearch(item.name)
                                            setUnit(item.unit)
                                        }}
                                        style={{
                                            paddingVertical: spacing.sm,
                                            paddingHorizontal: spacing.md,
                                            borderBottomWidth: 1,
                                            borderBottomColor: palette.border,
                                        }}
                                    >
                                        <Text style={{ color: palette.text, fontSize: 15 }}>{item.name}</Text>
                                        <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>
                                            {item.category} · {item.unit}
                                        </Text>
                                    </Pressable>
                                )}
                                ListEmptyComponent={
                                    <Text style={{ color: palette.textMuted, fontSize: 13, padding: spacing.md }}>
                                        {ingredientsQuery.isLoading ? 'Поиск…' : 'Не найдено'}
                                    </Text>
                                }
                            />
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
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: palette.textSecondary,
                                marginBottom: 6,
                            }}
                        >
                            Единица
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {COMMON_UNITS.map((u) => (
                                <Pressable
                                    key={u}
                                    onPress={() => setUnit(u)}
                                    style={{
                                        paddingHorizontal: spacing.md,
                                        paddingVertical: 6,
                                        borderRadius: radii.pill,
                                        backgroundColor: u === unit ? palette.primary : palette.canvasMuted,
                                        borderWidth: 1,
                                        borderColor: u === unit ? palette.primary : palette.border,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: u === unit ? palette.onPrimary : palette.text,
                                            fontWeight: '600',
                                        }}
                                    >
                                        {u}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <Button label="Отмена" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
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
                </View>
            </View>
        </Modal>
    )
}
