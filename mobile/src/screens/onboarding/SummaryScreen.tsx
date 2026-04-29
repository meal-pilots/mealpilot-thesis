import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, Text, View } from 'react-native'

import { apiRequest } from '@shared/api/http'
import type { Group, GroupMember, GroupPreferences } from '@entities/group/types'
import { useAuth } from '@features/auth/model/AuthContext'
import { activateGroup, createGroup } from '@features/groups/api/groups-api'
import { groupKeys } from '@features/groups/hooks'
import { useOnboardingDraft } from '@features/onboarding/OnboardingContext'
import { formatCurrency } from '@shared/lib/formatters'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'

async function createMember(groupId: string, payload: Record<string, unknown>): Promise<GroupMember> {
    return apiRequest<GroupMember>(`/api/v1/groups/${groupId}/members`, {
        method: 'POST',
        body: payload,
    })
}

async function upsertPreferences(
    groupId: string,
    payload: Record<string, unknown>,
): Promise<GroupPreferences> {
    return apiRequest<GroupPreferences>(`/api/v1/groups/${groupId}/preferences`, {
        method: 'PUT',
        body: payload,
    })
}

export function SummaryScreen() {
    const { draft } = useOnboardingDraft()
    const { markOnboardingCompleted } = useAuth()
    const queryClient = useQueryClient()
    const [submitting, setSubmitting] = useState(false)

    const finalize = async () => {
        if (!draft.groupType) {
            Alert.alert('Не выбран режим')
            return
        }
        try {
            setSubmitting(true)

            const group: Group = await createGroup({
                name: draft.name.trim() || 'Моя кухня',
                group_type: draft.groupType,
                budget_amount: draft.budget_amount,
                budget_period_type: draft.budget_period_type,
                currency_code: draft.currency_code,
                region_code: draft.region_code,
            })

            await Promise.all(
                draft.members.map((member) =>
                    createMember(group.id, {
                        display_name: member.display_name,
                        member_type: member.member_type,
                        sex: member.sex || 'unspecified',
                        age: Number(member.age) || 30,
                        activity_level: member.activity_level,
                        goal_type: member.goal_type,
                        priority_weight: '1.00',
                        height_cm: member.height_cm ? Number(member.height_cm) : null,
                        weight_kg: member.weight_kg || null,
                    }),
                ),
            )

            await upsertPreferences(group.id, {
                spice_tolerance: 'mild',
                max_cooking_time_minutes: draft.max_cooking_time_minutes,
                repeat_tolerance: 2,
                variety_preference: draft.variety_preference,
                local_cuisine_priority: '0.80',
                price_priority_weight: '0.35',
                nutrition_priority_weight: '0.30',
                taste_priority_weight: '0.20',
                speed_priority_weight: '0.15',
                preferred_cuisines: [],
            })

            await activateGroup(group.id)

            await queryClient.invalidateQueries({ queryKey: groupKeys.all })

            markOnboardingCompleted()
        } catch (err) {
            Alert.alert('Не удалось сохранить', err instanceof Error ? err.message : 'Попробуйте снова')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Screen scroll>
            <Heading level={1}>Готово!</Heading>
            <Text style={{ color: '#6B7280' }}>Проверьте — всё ли правильно.</Text>

            <Section title="Кухня">
                <Card>
                    <Row label="Название" value={draft.name || '—'} />
                    <Row label="Режим" value={draft.groupType ?? '—'} />
                    <Row
                        label="Бюджет"
                        value={`${formatCurrency(draft.budget_amount)} ${
                            draft.budget_period_type === 'daily' ? 'в день' : 'в неделю'
                        }`}
                    />
                </Card>
            </Section>

            <Section title="Семья">
                <Card>
                    {draft.members.map((m, idx) => (
                        <View
                            key={m.id}
                            style={{
                                paddingVertical: 8,
                                borderTopWidth: idx === 0 ? 0 : 1,
                                borderTopColor: '#F0E2C5',
                            }}
                        >
                            <Text style={{ fontWeight: '700' }}>{m.display_name || `Член #${idx + 1}`}</Text>
                            <Text style={{ color: '#6B7280', fontSize: 13, marginTop: 2 }}>
                                {m.member_type} · {m.age} лет · цель: {m.goal_type}
                            </Text>
                        </View>
                    ))}
                </Card>
            </Section>

            <Section title="Предпочтения">
                <Card>
                    <Row label="Макс. время готовки" value={`${draft.max_cooking_time_minutes} мин`} />
                    <Row label="Разнообразие" value={draft.variety_preference} />
                </Card>
            </Section>

            <Button
                label={submitting ? 'Создаём…' : 'Создать и открыть приложение'}
                onPress={finalize}
                loading={submitting}
                disabled={submitting}
            />
        </Screen>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ color: '#6B7280' }}>{label}</Text>
            <Text style={{ fontWeight: '600' }}>{value}</Text>
        </View>
    )
}
