import { createContext, useContext, useMemo, useState } from 'react'

import type { GoalType, GroupType, MemberType } from '@entities/group/types'

export type OnboardingMember = {
    id: string
    display_name: string
    member_type: MemberType
    sex: string
    age: string
    activity_level: string
    goal_type: GoalType
    height_cm: string
    weight_kg: string
}

export type OnboardingDraft = {
    groupType: GroupType | null
    name: string
    region_code: string
    currency_code: string
    budget_amount: string
    budget_period_type: 'daily' | 'weekly'
    members: OnboardingMember[]
    max_cooking_time_minutes: number
    variety_preference: 'low' | 'medium' | 'high'
}

const DEFAULT_DRAFT: OnboardingDraft = {
    groupType: null,
    name: '',
    region_code: 'KZ',
    currency_code: 'KZT',
    budget_amount: '60000',
    budget_period_type: 'weekly',
    members: [],
    max_cooking_time_minutes: 45,
    variety_preference: 'medium',
}

type OnboardingContextValue = {
    draft: OnboardingDraft
    setDraft: (updater: (current: OnboardingDraft) => OnboardingDraft) => void
    reset: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const [draft, setLocal] = useState<OnboardingDraft>(DEFAULT_DRAFT)

    const value = useMemo<OnboardingContextValue>(
        () => ({
            draft,
            setDraft: (updater) => setLocal((curr) => updater(curr)),
            reset: () => setLocal(DEFAULT_DRAFT),
        }),
        [draft],
    )

    return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboardingDraft(): OnboardingContextValue {
    const ctx = useContext(OnboardingContext)
    if (!ctx) throw new Error('useOnboardingDraft must be used within OnboardingProvider')
    return ctx
}

export function newOnboardingMember(member_type: MemberType = 'adult'): OnboardingMember {
    return {
        id: Math.random().toString(36).slice(2, 10),
        display_name: '',
        member_type,
        sex: '',
        age: '',
        activity_level: 'moderate',
        goal_type: 'maintenance',
        height_cm: '',
        weight_kg: '',
    }
}

export function buildMembersForMode(group_type: GroupType): OnboardingMember[] {
    switch (group_type) {
        case 'solo':
            return [{ ...newOnboardingMember(), display_name: 'Я' }]
        case 'two_adults':
            return [newOnboardingMember(), newOnboardingMember()]
        case 'adults_kids':
            return [newOnboardingMember(), newOnboardingMember('child')]
        case 'custom':
        default:
            return [newOnboardingMember()]
    }
}
