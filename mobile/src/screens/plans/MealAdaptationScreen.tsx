import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import type { AdaptationType } from '@entities/plan/types'
import { useActiveGroup, useGroupMembers } from '@features/groups/hooks'
import { useCreateAdaptation } from '@features/plans/hooks'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'

type Route = RouteProp<AppStackParamList, 'MealAdaptation'>
type Navigation = NativeStackNavigationProp<AppStackParamList>

const ADAPTATION_OPTIONS: Array<{ id: AdaptationType; label: string; emoji: string }> = [
    { id: 'cheaper_version', label: 'Подешевле', emoji: '💰' },
    { id: 'low_carb', label: 'Меньше углеводов', emoji: '🥬' },
    { id: 'high_protein', label: 'Больше белка', emoji: '💪' },
    { id: 'child_friendly', label: 'Для ребёнка', emoji: '🧒' },
    { id: 'allergen_free', label: 'Без аллергенов', emoji: '🚫' },
    { id: 'portion_change', label: 'Изменить порцию', emoji: '🍽️' },
    { id: 'ingredient_remove', label: 'Убрать ингредиент', emoji: '✂️' },
    { id: 'ingredient_replace', label: 'Заменить ингредиент', emoji: '🔄' },
]

export function MealAdaptationScreen() {
    const { params } = useRoute<Route>()
    const navigation = useNavigation<Navigation>()
    const groupQuery = useActiveGroup()
    const membersQuery = useGroupMembers(groupQuery.data?.id)
    const create = useCreateAdaptation()

    const [memberId, setMemberId] = useState<string | null>(null)
    const [adaptationType, setAdaptationType] = useState<AdaptationType | null>(null)

    const onSubmit = async () => {
        if (!memberId || !adaptationType) {
            Alert.alert('Не хватает данных', 'Выберите члена семьи и тип адаптации.')
            return
        }
        try {
            await create.mutateAsync({
                itemId: params.mealPlanItemId,
                planId: '',
                member_id: memberId,
                adaptation_type: adaptationType,
            })
            Alert.alert('Готово', 'Адаптация добавлена.')
            navigation.goBack()
        } catch (err) {
            Alert.alert('Ошибка', err instanceof Error ? err.message : 'Не удалось добавить')
        }
    }

    return (
        <Screen scroll>
            <Heading level={1}>Адаптировать блюдо</Heading>
            <Text style={{ color: '#6B7280' }}>
                Каждый член семьи может получить персональную версию блюда.
            </Text>

            <Section title="Для кого">
                <QueryBoundary
                    isLoading={membersQuery.isLoading}
                    error={membersQuery.error}
                    refetch={membersQuery.refetch}
                >
                    {membersQuery.data && membersQuery.data.length > 0 ? (
                        <View style={{ gap: 8 }}>
                            {membersQuery.data.map((member) => {
                                const active = memberId === member.id
                                return (
                                    <Pressable
                                        key={member.id}
                                        onPress={() => setMemberId(member.id)}
                                        style={{
                                            padding: 14,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            backgroundColor: active ? '#FFE4B5' : '#FFFBF2',
                                            borderColor: active ? '#7A4A0A' : '#F0E2C5',
                                        }}
                                    >
                                        <Text style={{ fontWeight: '700' }}>{member.display_name}</Text>
                                        <Text style={{ color: '#6B7280', marginTop: 2, fontSize: 13 }}>
                                            {member.member_type} · {member.goal_type}
                                        </Text>
                                    </Pressable>
                                )
                            })}
                        </View>
                    ) : (
                        <EmptyState
                            title="Нет членов семьи"
                            description="Добавьте членов семьи в настройках группы."
                            emoji="👥"
                        />
                    )}
                </QueryBoundary>
            </Section>

            <Section title="Тип адаптации">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {ADAPTATION_OPTIONS.map((option) => {
                        const active = adaptationType === option.id
                        return (
                            <Pressable
                                key={option.id}
                                onPress={() => setAdaptationType(option.id)}
                                style={{
                                    flexBasis: '47%',
                                    flexGrow: 1,
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    backgroundColor: active ? '#1F2937' : '#FFFBF2',
                                    borderColor: active ? '#1F2937' : '#F0E2C5',
                                }}
                            >
                                <Text style={{ fontSize: 18 }}>{option.emoji}</Text>
                                <Text
                                    style={{
                                        marginTop: 4,
                                        color: active ? '#fff' : '#111827',
                                        fontWeight: '600',
                                    }}
                                >
                                    {option.label}
                                </Text>
                            </Pressable>
                        )
                    })}
                </View>
            </Section>

            {memberId && adaptationType ? (
                <Card>
                    <Text style={{ fontWeight: '700' }}>Что произойдёт:</Text>
                    <Text style={{ marginTop: 6, color: '#374151', lineHeight: 20 }}>
                        Алгоритм пересчитает порции/ингредиенты под выбранный тип адаптации и сохранит
                        изменения только для выбранного члена семьи.
                    </Text>
                </Card>
            ) : null}

            <Button
                label="Применить"
                onPress={onSubmit}
                loading={create.isPending}
                disabled={!memberId || !adaptationType}
            />
        </Screen>
    )
}
