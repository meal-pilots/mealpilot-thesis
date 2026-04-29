import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, Text, View } from 'react-native'

import type { OnboardingStackParamList } from '@core/navigation/types'
import type { GoalType, MemberType } from '@entities/group/types'
import {
    newOnboardingMember,
    useOnboardingDraft,
    type OnboardingMember,
} from '@features/onboarding/OnboardingContext'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'

const MEMBER_TYPES: Array<{ id: MemberType; label: string }> = [
    { id: 'adult', label: 'Взрослый' },
    { id: 'child', label: 'Ребёнок' },
    { id: 'teen', label: 'Подросток' },
    { id: 'custom', label: 'Иной' },
]

const GOAL_TYPES: Array<{ id: GoalType; label: string }> = [
    { id: 'maintenance', label: 'Поддержка' },
    { id: 'weight_loss', label: 'Похудение' },
    { id: 'mass_gain', label: 'Набор массы' },
    { id: 'high_protein', label: 'Больше белка' },
    { id: 'low_carb', label: 'Меньше углеводов' },
    { id: 'healthy', label: 'Здоровое' },
]

export function MembersScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>()
    const { draft, setDraft } = useOnboardingDraft()

    const update = (id: string, patch: Partial<OnboardingMember>) =>
        setDraft((curr) => ({
            ...curr,
            members: curr.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }))

    const remove = (id: string) =>
        setDraft((curr) => ({ ...curr, members: curr.members.filter((m) => m.id !== id) }))

    const add = () =>
        setDraft((curr) => ({ ...curr, members: [...curr.members, newOnboardingMember()] }))

    const isValid = draft.members.length > 0 && draft.members.every((m) => m.display_name.trim() && m.age)

    return (
        <Screen scroll>
            <Heading level={1}>Кто в семье?</Heading>
            <Text style={{ color: '#6B7280' }}>
                Возраст и цели нужны для расчёта порций и нутриентов.
            </Text>

            <View style={{ gap: 12 }}>
                {draft.members.map((member, index) => (
                    <Card key={member.id}>
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8,
                            }}
                        >
                            <Text style={{ fontWeight: '700', fontSize: 16 }}>
                                Член #{index + 1}
                            </Text>
                            {draft.members.length > 1 ? (
                                <Pressable onPress={() => remove(member.id)}>
                                    <Text style={{ color: '#B91C1C', fontWeight: '600' }}>Удалить</Text>
                                </Pressable>
                            ) : null}
                        </View>

                        <Input
                            label="Имя"
                            value={member.display_name}
                            onChangeText={(v) => update(member.id, { display_name: v })}
                            autoCapitalize="words"
                        />

                        <View style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 6 }}>Тип</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {MEMBER_TYPES.map((t) => {
                                    const active = member.member_type === t.id
                                    return (
                                        <Pressable
                                            key={t.id}
                                            onPress={() => update(member.id, { member_type: t.id })}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 999,
                                                backgroundColor: active ? '#1F2937' : '#FFFBF2',
                                                borderWidth: 1,
                                                borderColor: active ? '#1F2937' : '#F0E2C5',
                                            }}
                                        >
                                            <Text style={{ color: active ? '#fff' : '#111827', fontSize: 13 }}>
                                                {t.label}
                                            </Text>
                                        </Pressable>
                                    )
                                })}
                            </View>
                        </View>

                        <View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                                <Input
                                    label="Возраст"
                                    keyboardType="numeric"
                                    value={member.age}
                                    onChangeText={(v) => update(member.id, { age: v })}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Input
                                    label="Вес, кг"
                                    keyboardType="numeric"
                                    value={member.weight_kg}
                                    onChangeText={(v) => update(member.id, { weight_kg: v })}
                                />
                            </View>
                        </View>

                        <View style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 6 }}>Цель</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {GOAL_TYPES.map((g) => {
                                    const active = member.goal_type === g.id
                                    return (
                                        <Pressable
                                            key={g.id}
                                            onPress={() => update(member.id, { goal_type: g.id })}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 999,
                                                backgroundColor: active ? '#FFE4B5' : '#FFFBF2',
                                                borderWidth: 1,
                                                borderColor: active ? '#7A4A0A' : '#F0E2C5',
                                            }}
                                        >
                                            <Text style={{ color: '#111827', fontSize: 13 }}>{g.label}</Text>
                                        </Pressable>
                                    )
                                })}
                            </View>
                        </View>
                    </Card>
                ))}
            </View>

            <Section>
                <Button label="+ Добавить ещё" variant="ghost" onPress={add} />
                <Button
                    label="Продолжить"
                    onPress={() => navigation.navigate('Preferences')}
                    disabled={!isValid}
                    style={{ marginTop: 8 }}
                />
            </Section>
        </Screen>
    )
}
