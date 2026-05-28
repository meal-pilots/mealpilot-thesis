import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { Group, GroupMemberPayload, MemberConstraintPayload } from '@entities/group/types'
import { useAuth } from '@features/auth/model/AuthContext'
import {
    activateGroup,
    createMemberConstraint,
    createGroup,
    createGroupMember,
    deleteMemberConstraint,
    deleteGroupMember,
    listMemberConstraints,
    listGroupMembers,
    updateMemberConstraint,
    updateGroup,
    updateGroupMember,
    upsertGroupPreferences,
} from '@features/groups/api/groups-api'
import { groupKeys } from '@features/groups/hooks'
import { useOnboardingDraft, type OnboardingMember, type RestrictionId } from '@features/onboarding/OnboardingContext'
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

function toMemberPayload(member: OnboardingMember): GroupMemberPayload {
    return {
        display_name: member.display_name,
        member_type: member.member_type,
        sex: member.sex || 'unspecified',
        age: Number(member.age) || 30,
        activity_level: member.activity_level,
        goal_type: member.goal_type,
        priority_weight: '1.00',
        height_cm: member.height_cm ? Number(member.height_cm) : null,
        weight_kg: member.weight_kg || null,
    }
}

async function syncMembers(groupId: string, members: OnboardingMember[]): Promise<OnboardingMember[]> {
    const existingMembers = await listGroupMembers(groupId)
    const existingById = new Map(existingMembers.map((member) => [member.id, member]))
    const nextBackendIds = new Set<string>()
    const nextMembers: OnboardingMember[] = []

    for (const member of members) {
        const payload = toMemberPayload(member)
        const backendId = member.backend_id

        if (backendId && existingById.has(backendId)) {
            const updated = await updateGroupMember(backendId, payload)
            nextBackendIds.add(updated.id)
            nextMembers.push({ ...member, id: updated.id, backend_id: updated.id })
            continue
        }

        const created = await createGroupMember(groupId, payload)
        nextBackendIds.add(created.id)
        nextMembers.push({ ...member, id: created.id, backend_id: created.id })
    }

    for (const existingMember of existingMembers) {
        if (!nextBackendIds.has(existingMember.id)) {
            await deleteGroupMember(existingMember.id)
        }
    }

    return nextMembers
}

function buildRestrictionConstraint(input: RestrictionId): MemberConstraintPayload {
    switch (input) {
        case 'gluten-free':
            return { constraint_type: 'dietary', value_text: 'gluten-free', severity_level: 'high' }
        case 'dairy-free':
            return { constraint_type: 'intolerance', value_text: 'dairy-free', severity_level: 'high' }
        case 'vegan':
            return { constraint_type: 'dietary', value_text: 'vegan', severity_level: 'high' }
        case 'nut-free':
            return { constraint_type: 'allergy', value_text: 'nut-free', severity_level: 'high' }
        case 'halal':
            return { constraint_type: 'religious', value_text: 'halal', severity_level: 'high' }
        default:
            return { constraint_type: 'dietary', value_text: input, severity_level: 'medium' }
    }
}

function normalizeConstraintKey(constraintType: string, valueText: string | null | undefined): string {
    return `${constraintType}:${(valueText ?? '').trim().toLowerCase()}`
}

async function syncConstraintsForMember(
    memberId: string,
    desiredConstraints: MemberConstraintPayload[],
): Promise<void> {
    const existingConstraints = await listMemberConstraints(memberId)
    const existingByKey = new Map(
        existingConstraints
            .filter((constraint) => constraint.value_text)
            .map((constraint) => [
                normalizeConstraintKey(constraint.constraint_type, constraint.value_text),
                constraint,
            ]),
    )
    const desiredKeys = new Set(
        desiredConstraints.map((constraint) =>
            normalizeConstraintKey(constraint.constraint_type, constraint.value_text),
        ),
    )

    for (const constraint of desiredConstraints) {
        const key = normalizeConstraintKey(constraint.constraint_type, constraint.value_text)
        const existing = existingByKey.get(key)

        if (!existing) {
            await createMemberConstraint(memberId, {
                ...constraint,
                ingredient_id: null,
                tag_key: null,
            })
            continue
        }

        if (constraint.severity_level && existing.severity_level !== constraint.severity_level) {
            await updateMemberConstraint(existing.id, { severity_level: constraint.severity_level })
        }
    }

    for (const existing of existingConstraints) {
        const key = normalizeConstraintKey(existing.constraint_type, existing.value_text)

        if (!desiredKeys.has(key)) {
            await deleteMemberConstraint(existing.id)
        }
    }
}

async function syncConstraints(members: OnboardingMember[], draft: {
    loved_flavors: string[]
    disliked_foods: string[]
    selected_restrictions: RestrictionId[]
}): Promise<void> {
    const desiredConstraints: MemberConstraintPayload[] = [
        ...draft.loved_flavors
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => ({
                constraint_type: 'preferred' as const,
                value_text: value,
                severity_level: 'medium' as const,
            })),
        ...draft.disliked_foods
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => ({
                constraint_type: 'disliked' as const,
                value_text: value,
                severity_level: 'medium' as const,
            })),
        ...draft.selected_restrictions.map(buildRestrictionConstraint),
    ]

    await Promise.all(
        members
            .map((member) => member.backend_id)
            .filter((memberId): memberId is string => Boolean(memberId))
            .map((memberId) => syncConstraintsForMember(memberId, desiredConstraints)),
    )
}

export function SummaryScreen() {
    const palette = usePalette()
    const toast = useToast()
    const { draft, reset, setDraft } = useOnboardingDraft()
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

            const groupInput = {
                name: draft.name.trim() || 'Моя кухня',
                group_type: draft.groupType,
                budget_amount: draft.budget_amount,
                budget_period_type: draft.budget_period_type,
                currency_code: draft.currency_code,
                region_code: draft.region_code,
            }

            const group: Group = draft.groupId
                ? await updateGroup(draft.groupId, groupInput)
                : await createGroup(groupInput)

            setDraft((current) => ({ ...current, groupId: group.id }))

            const nextMembers = await syncMembers(group.id, draft.members)

            setDraft((current) => ({ ...current, groupId: group.id, members: nextMembers }))

            await upsertGroupPreferences(group.id, {
                spice_tolerance: draft.spice_tolerance,
                max_cooking_time_minutes: draft.max_cooking_time_minutes,
                repeat_tolerance: 2,
                variety_preference: draft.variety_preference,
                local_cuisine_priority: '0.80',
                price_priority_weight: '0.35',
                nutrition_priority_weight: '0.30',
                taste_priority_weight: '0.20',
                speed_priority_weight: '0.15',
                preferred_cuisines: draft.preferred_cuisines,
            })

            await syncConstraints(nextMembers, draft)

            await activateGroup(group.id)

            await queryClient.invalidateQueries({ queryKey: groupKeys.all })

            const completed = await markOnboardingCompleted()
            if (!completed) {
                throw new Error('Онбординг сохранен, но сервер еще не считает профиль завершенным.')
            }

            haptic.success()
            reset()
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
                        <Row palette={palette} label="Острота" value={spiceLabel(draft.spice_tolerance)} />
                        <Row palette={palette} label="Кухни" value={formatList(draft.preferred_cuisines.map(cuisineLabel))} />
                        <Row palette={palette} label="Любимые вкусы" value={formatList(draft.loved_flavors)} />
                        <Row palette={palette} label="Не любит" value={formatList(draft.disliked_foods)} />
                        <Row
                            palette={palette}
                            label="Ограничения"
                            value={formatList(draft.selected_restrictions.map(restrictionLabel))}
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

const SPICE_LABELS: Record<string, string> = {
    none: 'Без острого',
    mild: 'Мягко',
    medium: 'Средне',
    hot: 'Остро',
}

const CUISINE_LABELS: Record<string, string> = {
    kazakh: 'Казахская',
    central_asian: 'Центральная Азия',
    european: 'Европейская',
    asian: 'Азиатская',
}

const RESTRICTION_LABELS: Record<string, string> = {
    'gluten-free': 'Без глютена',
    'dairy-free': 'Без молочного',
    vegan: 'Веган',
    'nut-free': 'Без орехов',
    halal: 'Халал',
}

function varietyLabel(key: string | null | undefined): string {
    if (!key) return ''
    return VARIETY_LABELS[key] ?? key
}

function spiceLabel(key: string | null | undefined): string {
    if (!key) return ''
    return SPICE_LABELS[key] ?? key
}

function cuisineLabel(key: string): string {
    return CUISINE_LABELS[key] ?? key
}

function restrictionLabel(key: string): string {
    return RESTRICTION_LABELS[key] ?? key
}

function formatList(values: string[]): string {
    return values.length ? values.join(', ') : '—'
}

function Row({ palette: _palette, label, value }: { palette: Palette; label: string; value: string }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: 6 }}>
            <Text variant="caption" tone="muted">
                {label}
            </Text>
            <Text variant="bodyStrong" style={{ flex: 1, textAlign: 'right' }}>
                {value}
            </Text>
        </View>
    )
}
