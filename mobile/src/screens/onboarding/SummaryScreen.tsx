import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { apiRequest } from '@shared/api/http'
import type { Group, GroupMember, GroupPreferences } from '@entities/group/types'
import { useAuth } from '@features/auth/model/AuthContext'
import { activateGroup, createGroup } from '@features/groups/api/groups-api'
import { groupKeys } from '@features/groups/hooks'
import { useOnboardingDraft } from '@features/onboarding/OnboardingContext'
import {
    formatCurrency,
    goalLabel,
    groupTypeLabel,
    memberTypeLabel,
    pluralRu,
} from '@shared/lib/formatters'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { Text } from '@shared/ui/Text'
import { useToast } from '@shared/ui/Toast'
import { spacing, type Palette } from '@shared/ui/theme'

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
    const palette = usePalette()
    const toast = useToast()
    const { draft } = useOnboardingDraft()
    const { markOnboardingCompleted } = useAuth()
    const queryClient = useQueryClient()
    const [submitting, setSubmitting] = useState(false)

    const finalize = async () => {
        if (!draft.groupType) {
            toast.error('Не выбран режим')
            return
        }
        try {
            haptic.medium()
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

            haptic.success()
            markOnboardingCompleted()
        } catch (err) {
            haptic.error()
            toast.error(err instanceof Error ? err.message : 'Не удалось сохранить')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Screen scroll>
            <Animated.View entering={FadeInDown.duration(380)} style={{ alignItems: 'center', gap: spacing.sm }}>
                <View
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: palette.successBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon name="checkCircle" size={36} color={palette.success} strokeWidth={2} />
                </View>
                <Heading level={1}>Готово!</Heading>
                <Text variant="body" tone="secondary" align="center">
                    Проверьте, всё ли правильно.
                </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(380)}>
                <Section title="Кухня">
                    <Card elevation="card">
                        <Row palette={palette} label="Название" value={draft.name || '—'} />
                        <Row
                            palette={palette}
                            label="Режим"
                            value={draft.groupType ? groupTypeLabel(draft.groupType) : '—'}
                        />
                        <Row
                            palette={palette}
                            label="Бюджет"
                            value={`${formatCurrency(draft.budget_amount)} ${
                                draft.budget_period_type === 'daily' ? 'в день' : 'в неделю'
                            }`}
                        />
                    </Card>
                </Section>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(140).duration(380)}>
                <Section title="Семья">
                    <Card elevation="card">
                        {draft.members.map((m, idx) => (
                            <View
                                key={m.id}
                                style={{
                                    paddingVertical: spacing.sm,
                                    borderTopWidth: idx === 0 ? 0 : 1,
                                    borderTopColor: palette.border,
                                }}
                            >
                                <Text variant="bodyStrong">{m.display_name || `Член #${idx + 1}`}</Text>
                                <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                                    {memberTypeLabel(m.member_type)} · {m.age}{' '}
                                    {pluralRu(Number(m.age) || 0, ['год', 'года', 'лет'])} · цель:{' '}
                                    {goalLabel(m.goal_type)}
                                </Text>
                            </View>
                        ))}
                    </Card>
                </Section>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(380)}>
                <Section title="Предпочтения">
                    <Card elevation="card">
                        <Row palette={palette} label="Макс. время готовки" value={`${draft.max_cooking_time_minutes} мин`} />
                        <Row
                            palette={palette}
                            label="Разнообразие"
                            value={varietyLabel(draft.variety_preference)}
                        />
                    </Card>
                </Section>
            </Animated.View>

            <Button
                label={submitting ? 'Создаём…' : 'Создать и открыть'}
                onPress={finalize}
                loading={submitting}
                disabled={submitting}
                size="lg"
                iconRight={
                    !submitting ? <Icon name="sparkles" size={18} color={palette.onPrimary} /> : undefined
                }
            />
        </Screen>
    )
}

const VARIETY_LABELS: Record<string, string> = {
    low: 'Низкое',
    medium: 'Среднее',
    high: 'Высокое',
}

function varietyLabel(key: string | null | undefined): string {
    if (!key) return ''
    return VARIETY_LABELS[key] ?? key
}

function Row({ palette: _palette, label, value }: { palette: Palette; label: string; value: string }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text variant="caption" tone="muted">
                {label}
            </Text>
            <Text variant="bodyStrong">{value}</Text>
        </View>
    )
}
