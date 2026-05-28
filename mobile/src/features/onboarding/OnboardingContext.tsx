import * as SecureStore from 'expo-secure-store'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import type { GoalType, GroupMember, GroupType, MemberConstraint, MemberType } from '@entities/group/types'
import { useAuth } from '@features/auth/model/AuthContext'
import {
    getActiveGroup,
    getGroupSetupSummary,
    type GroupSetupSummary,
} from '@features/groups/api/groups-api'
import { ApiError } from '@shared/api/http'

export type OnboardingMember = {
    id: string
    backend_id?: string
    display_name: string
    member_type: MemberType
    sex: string
    age: string
    activity_level: string
    goal_type: GoalType
    height_cm: string
    weight_kg: string
}

export type RestrictionId = 'gluten-free' | 'dairy-free' | 'vegan' | 'nut-free' | 'halal'

export type OnboardingDraft = {
    groupId: string | null
    groupType: GroupType | null
    name: string
    region_code: string
    currency_code: string
    budget_amount: string
    budget_period_type: 'daily' | 'weekly'
    planning_days_default: number
    meals_per_day_default: number
    members: OnboardingMember[]
    max_cooking_time_minutes: number
    variety_preference: 'low' | 'medium' | 'high'
    spice_tolerance: 'none' | 'mild' | 'medium' | 'hot'
    preferred_cuisines: string[]
    loved_flavors: string[]
    disliked_foods: string[]
    selected_restrictions: RestrictionId[]
}

const DEFAULT_DRAFT: OnboardingDraft = {
    groupId: null,
    groupType: null,
    name: '',
    region_code: 'KZ-AST',
    currency_code: 'KZT',
    budget_amount: '35000',
    budget_period_type: 'weekly',
    planning_days_default: 7,
    meals_per_day_default: 3,
    members: [],
    max_cooking_time_minutes: 45,
    variety_preference: 'medium',
    spice_tolerance: 'medium',
    preferred_cuisines: ['kazakh', 'central_asian'],
    loved_flavors: [],
    disliked_foods: [],
    selected_restrictions: [],
}

const ONBOARDING_DRAFT_KEY_PREFIX = 'mealplanner.onboarding.draft'
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
}

type OnboardingContextValue = {
    draft: OnboardingDraft
    setDraft: (updater: (current: OnboardingDraft) => OnboardingDraft) => void
    isBootstrapping: boolean
    reset: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    const storageKey = useMemo(() => `${ONBOARDING_DRAFT_KEY_PREFIX}.${user?.id ?? 'anonymous'}`, [user?.id])
    const [draft, setLocal] = useState<OnboardingDraft>(DEFAULT_DRAFT)
    const [isBootstrapping, setIsBootstrapping] = useState(true)
    const [hasBootstrapped, setHasBootstrapped] = useState(false)

    useEffect(() => {
        let mounted = true

        async function bootstrap() {
            const storedDraft = await readStoredDraft(storageKey)
            let nextDraft = storedDraft ?? DEFAULT_DRAFT

            try {
                const activeGroup = await getActiveGroup()
                const groupId = activeGroup?.id ?? storedDraft?.groupId

                if (groupId) {
                    const summary = await getGroupSetupSummary(groupId)
                    nextDraft = fromSetupSummary(summary, storedDraft)
                }
            } catch (error) {
                nextDraft =
                    error instanceof ApiError && error.status === 404 && storedDraft
                        ? detachBackendDraft(storedDraft)
                        : storedDraft ?? DEFAULT_DRAFT
            }

            if (!mounted) return

            setLocal(nextDraft)
            setIsBootstrapping(false)
            setHasBootstrapped(true)
        }

        void bootstrap()

        return () => {
            mounted = false
        }
    }, [storageKey])

    useEffect(() => {
        if (!hasBootstrapped) return
        void writeStoredDraft(storageKey, draft)
    }, [draft, hasBootstrapped, storageKey])

    const value = useMemo<OnboardingContextValue>(
        () => ({
            draft,
            setDraft: (updater) => setLocal((curr) => updater(curr)),
            isBootstrapping,
            reset: () => {
                setLocal(DEFAULT_DRAFT)
                void clearStoredDraft(storageKey)
            },
        }),
        [draft, isBootstrapping, storageKey],
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

async function readStoredDraft(storageKey: string): Promise<OnboardingDraft | null> {
    try {
        const raw = await SecureStore.getItemAsync(storageKey, SECURE_STORE_OPTIONS)
        if (!raw) return null
        return normalizeDraft(JSON.parse(raw) as Partial<OnboardingDraft>)
    } catch {
        await clearStoredDraft(storageKey)
        return null
    }
}

async function writeStoredDraft(storageKey: string, nextDraft: OnboardingDraft): Promise<void> {
    await SecureStore.setItemAsync(storageKey, JSON.stringify(nextDraft), SECURE_STORE_OPTIONS)
}

async function clearStoredDraft(storageKey: string): Promise<void> {
    await SecureStore.deleteItemAsync(storageKey, SECURE_STORE_OPTIONS).catch(() => {})
}

function normalizeDraft(value: Partial<OnboardingDraft>): OnboardingDraft {
    return {
        ...DEFAULT_DRAFT,
        ...value,
        groupId: value.groupId ?? null,
        groupType: value.groupType ?? null,
        members: Array.isArray(value.members) ? value.members.map(normalizeMemberDraft) : DEFAULT_DRAFT.members,
        preferred_cuisines: Array.isArray(value.preferred_cuisines)
            ? value.preferred_cuisines
            : DEFAULT_DRAFT.preferred_cuisines,
        loved_flavors: Array.isArray(value.loved_flavors) ? value.loved_flavors : DEFAULT_DRAFT.loved_flavors,
        disliked_foods: Array.isArray(value.disliked_foods) ? value.disliked_foods : DEFAULT_DRAFT.disliked_foods,
        selected_restrictions: Array.isArray(value.selected_restrictions)
            ? value.selected_restrictions
            : DEFAULT_DRAFT.selected_restrictions,
    }
}

function normalizeMemberDraft(member: Partial<OnboardingMember>): OnboardingMember {
    return {
        id: member.id || Math.random().toString(36).slice(2, 10),
        backend_id: member.backend_id,
        display_name: member.display_name ?? '',
        member_type: member.member_type ?? 'adult',
        sex: member.sex ?? '',
        age: member.age ?? '',
        activity_level: member.activity_level || 'moderate',
        goal_type: member.goal_type ?? 'maintenance',
        height_cm: member.height_cm ?? '',
        weight_kg: member.weight_kg ?? '',
    }
}

function detachBackendDraft(draft: OnboardingDraft): OnboardingDraft {
    return {
        ...draft,
        groupId: null,
        members: draft.members.map((member) => ({ ...member, backend_id: undefined })),
    }
}

function memberFromSummary(member: GroupMember): OnboardingMember {
    return {
        id: member.id,
        backend_id: member.id,
        display_name: member.display_name,
        member_type: member.member_type,
        sex: member.sex ?? '',
        age: String(member.age),
        activity_level: member.activity_level,
        goal_type: member.goal_type,
        height_cm: member.height_cm ? String(member.height_cm) : '',
        weight_kg: member.weight_kg ?? '',
    }
}

function toRestrictionId(constraint: MemberConstraint): RestrictionId | null {
    const value = (constraint.value_text ?? '').trim().toLowerCase()

    if (value === 'gluten-free') return 'gluten-free'
    if (value === 'dairy-free') return 'dairy-free'
    if (value === 'vegan') return 'vegan'
    if (value === 'nut-free' || value === 'peanut' || value === 'nuts') return 'nut-free'
    if (value === 'halal') return 'halal'
    return null
}

function fromSetupSummary(summary: GroupSetupSummary, fallback: OnboardingDraft | null): OnboardingDraft {
    const constraints = Object.values(summary.constraints_by_member).flat()
    const lovedFlavors = Array.from(
        new Set(
            constraints
                .filter((constraint) => constraint.constraint_type === 'preferred')
                .map((constraint) => (constraint.value_text ?? '').trim())
                .filter(Boolean),
        ),
    )
    const dislikedFoods = Array.from(
        new Set(
            constraints
                .filter((constraint) => constraint.constraint_type === 'disliked')
                .map((constraint) => (constraint.value_text ?? '').trim())
                .filter(Boolean),
        ),
    )
    const restrictions = Array.from(
        new Set(
            constraints
                .map((constraint) => toRestrictionId(constraint))
                .filter((value): value is RestrictionId => value !== null),
        ),
    )

    return {
        ...DEFAULT_DRAFT,
        ...fallback,
        groupId: summary.group.id,
        groupType: summary.group.group_type,
        name: summary.group.name,
        region_code: summary.group.region_code,
        currency_code: summary.group.currency_code,
        budget_amount: summary.group.budget_amount,
        budget_period_type: summary.group.budget_period_type,
        planning_days_default: summary.group.planning_days_default,
        meals_per_day_default: summary.group.meals_per_day_default,
        members: summary.members.length
            ? summary.members.map(memberFromSummary)
            : fallback?.members ?? buildMembersForMode(summary.group.group_type),
        max_cooking_time_minutes:
            summary.preferences?.max_cooking_time_minutes ??
            fallback?.max_cooking_time_minutes ??
            DEFAULT_DRAFT.max_cooking_time_minutes,
        variety_preference:
            summary.preferences?.variety_preference ??
            fallback?.variety_preference ??
            DEFAULT_DRAFT.variety_preference,
        spice_tolerance:
            summary.preferences?.spice_tolerance ?? fallback?.spice_tolerance ?? DEFAULT_DRAFT.spice_tolerance,
        preferred_cuisines:
            summary.preferences?.preferred_cuisines ??
            fallback?.preferred_cuisines ??
            DEFAULT_DRAFT.preferred_cuisines,
        loved_flavors: lovedFlavors.length ? lovedFlavors : fallback?.loved_flavors ?? DEFAULT_DRAFT.loved_flavors,
        disliked_foods:
            dislikedFoods.length ? dislikedFoods : fallback?.disliked_foods ?? DEFAULT_DRAFT.disliked_foods,
        selected_restrictions:
            restrictions.length
                ? restrictions
                : fallback?.selected_restrictions ?? DEFAULT_DRAFT.selected_restrictions,
    }
}
