import {
    createContext,
    useContext,
    type Dispatch,
    type SetStateAction,
} from 'react'
import {
    onboardingApi,
    type BudgetPeriodType,
    type ConstraintType,
    type GoalType,
    type GroupMemberDto,
    type GroupPreferenceDto,
    type GroupPreferencePayload,
    type GroupType,
    type MemberConstraintDto,
    type MemberType,
    type SetupSummaryDto,
    type SpiceTolerance,
} from '../api/onboardingApi'

export type PlanningDuration = 'weekly' | 'bi-weekly' | 'monthly'
export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'
export type BudgetPriority = 'price' | 'nutrition' | 'taste' | 'speed'
export type RestrictionId = 'gluten-free' | 'dairy-free' | 'vegan' | 'nut-free' | 'halal'

export interface MemberDraft {
    id?: string
    display_name: string
    member_type: MemberType
    sex: string
    age: string
    activity_level: string
    goal_type: GoalType
    priority_weight: string
    height_cm: string
    weight_kg: string
}

export interface OnboardingDraft {
    groupId: string | null
    groupType: GroupType | null
    hasSelectedGroupType: boolean
    householdName: string
    planningDuration: PlanningDuration
    meals: MealSlot[]
    currencyCode: string
    budgetPeriodType: BudgetPeriodType
    regionCode: string
    budgetAmount: number
    selectedPriority: BudgetPriority
    dailyVariety: boolean
    preferredCuisines: string[]
    lovedFlavors: string[]
    dislikedFoods: string[]
    selectedRestrictions: RestrictionId[]
    spiceTolerance: SpiceTolerance
    cookingTimeMinutes: number
    members: MemberDraft[]
}

export type StepSubmitHandler = () => Promise<void> | void

export interface OnboardingFlowContextValue {
    draft: OnboardingDraft
    setDraft: Dispatch<SetStateAction<OnboardingDraft>>
    setupSummary: SetupSummaryDto | null
    isBootstrapping: boolean
    isSubmitting: boolean
    errorMessage: string
    setErrorMessage: Dispatch<SetStateAction<string>>
    registerStepSubmit: (handler: StepSubmitHandler | null) => () => void
    submitCurrentStep: () => Promise<boolean>
    refreshSetupSummary: (groupId?: string) => Promise<SetupSummaryDto | null>
}

const ONBOARDING_DRAFT_STORAGE_KEY = 'intelligent-meal-planner.onboarding.draft'
const ONBOARDING_GROUP_ID_STORAGE_KEY = 'intelligent-meal-planner.active-group-id'

const DEFAULT_MEALS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner']
const ALL_MEALS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

function createMemberTemplate(name: string, memberType: MemberType): MemberDraft {
    return {
        display_name: name,
        member_type: memberType,
        sex: '',
        age: '',
        activity_level: '',
        goal_type: memberType === 'adult' ? 'healthy' : 'maintenance',
        priority_weight: '1',
        height_cm: '',
        weight_kg: '',
    }
}

function isGroupType(value: unknown): value is GroupType {
    return value === 'solo' || value === 'two_adults' || value === 'adults_kids' || value === 'custom'
}

function buildMembersForMode(groupType: GroupType): MemberDraft[] {
    switch (groupType) {
        case 'solo':
            return [createMemberTemplate('You', 'adult')]
        case 'two_adults':
            return [createMemberTemplate('', 'adult'), createMemberTemplate('', 'adult')]
        case 'adults_kids':
            return [createMemberTemplate('', 'adult'), createMemberTemplate('', 'child')]
        case 'custom':
            return [createMemberTemplate('', 'adult')]
        default:
            return [createMemberTemplate('', 'adult')]
    }
}

export const DEFAULT_DRAFT: OnboardingDraft = {
    groupId: null,
    groupType: null,
    hasSelectedGroupType: false,
    householdName: '',
    planningDuration: 'weekly',
    meals: DEFAULT_MEALS,
    currencyCode: 'KZT',
    budgetPeriodType: 'weekly',
    regionCode: 'KZ-AST',
    budgetAmount: 35000,
    selectedPriority: 'price',
    dailyVariety: true,
    preferredCuisines: ['kazakh', 'central_asian'],
    lovedFlavors: [],
    dislikedFoods: [],
    selectedRestrictions: [],
    spiceTolerance: 'medium',
    cookingTimeMinutes: 45,
    members: [],
}

export const OnboardingFlowContext = createContext<OnboardingFlowContextValue | null>(null)

export function readStoredDraft(): OnboardingDraft | null {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        const rawValue = window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)

        if (!rawValue) {
            return null
        }

        const parsed = JSON.parse(rawValue) as Partial<OnboardingDraft>
        const hasSelectedGroupType = Boolean(parsed.groupId) || parsed.hasSelectedGroupType === true
        const parsedGroupType = isGroupType(parsed.groupType) ? parsed.groupType : null
        const groupType = hasSelectedGroupType ? parsedGroupType : null

        return {
            ...DEFAULT_DRAFT,
            ...parsed,
            groupType,
            hasSelectedGroupType: Boolean(groupType),
            currencyCode: 'KZT',
            meals:
                Array.isArray(parsed.meals) && parsed.meals.length
                    ? (parsed.meals as MealSlot[])
                    : DEFAULT_DRAFT.meals,
            preferredCuisines:
                Array.isArray(parsed.preferredCuisines) ? parsed.preferredCuisines : DEFAULT_DRAFT.preferredCuisines,
            lovedFlavors: Array.isArray(parsed.lovedFlavors) ? parsed.lovedFlavors : DEFAULT_DRAFT.lovedFlavors,
            dislikedFoods: Array.isArray(parsed.dislikedFoods) ? parsed.dislikedFoods : DEFAULT_DRAFT.dislikedFoods,
            selectedRestrictions:
                Array.isArray(parsed.selectedRestrictions)
                    ? (parsed.selectedRestrictions as RestrictionId[])
                    : DEFAULT_DRAFT.selectedRestrictions,
            members:
                Array.isArray(parsed.members) && parsed.members.length
                    ? parsed.members.map((member, index) => sanitizeMember(member, `Member ${index + 1}`))
                    : groupType
                        ? buildMembersForMode(groupType)
                        : DEFAULT_DRAFT.members,
        }
    } catch {
        return null
    }
}

export function writeStoredDraft(draft: OnboardingDraft) {
    if (typeof window === 'undefined') {
        return
    }

    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

function clearStoredDraft() {
    if (typeof window === 'undefined') {
        return
    }

    window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY)
}

export function readStoredGroupId() {
    if (typeof window === 'undefined') {
        return null
    }

    return window.localStorage.getItem(ONBOARDING_GROUP_ID_STORAGE_KEY)
}

export function writeStoredGroupId(groupId: string | null) {
    if (typeof window === 'undefined') {
        return
    }

    if (groupId) {
        window.localStorage.setItem(ONBOARDING_GROUP_ID_STORAGE_KEY, groupId)
        return
    }

    window.localStorage.removeItem(ONBOARDING_GROUP_ID_STORAGE_KEY)
}

function toPlanningDuration(days: number): PlanningDuration {
    if (days >= 28) {
        return 'monthly'
    }

    if (days >= 14) {
        return 'bi-weekly'
    }

    return 'weekly'
}

function toMeals(count: number): MealSlot[] {
    return ALL_MEALS.slice(0, Math.min(Math.max(count, 1), ALL_MEALS.length))
}

function fromPlanningDuration(value: PlanningDuration): number {
    if (value === 'bi-weekly') {
        return 14
    }

    if (value === 'monthly') {
        return 30
    }

    return 7
}

function toSpiceTolerance(value: string): SpiceTolerance {
    if (value === 'none' || value === 'mild' || value === 'medium' || value === 'hot') {
        return value
    }

    return 'medium'
}

function pickPriority(preferences: GroupPreferenceDto | null): BudgetPriority {
    if (!preferences) {
        return DEFAULT_DRAFT.selectedPriority
    }

    const entries = [
        ['price', Number(preferences.price_priority_weight)],
        ['nutrition', Number(preferences.nutrition_priority_weight)],
        ['taste', Number(preferences.taste_priority_weight)],
        ['speed', Number(preferences.speed_priority_weight)],
    ] as const

    return entries.reduce((best, current) => (current[1] > best[1] ? current : best))[0]
}

function toRestrictionId(constraint: MemberConstraintDto): RestrictionId | null {
    const normalizedValue = (constraint.value_text ?? '').trim().toLowerCase()

    if (normalizedValue === 'gluten-free') {
        return 'gluten-free'
    }

    if (normalizedValue === 'dairy-free') {
        return 'dairy-free'
    }

    if (normalizedValue === 'vegan') {
        return 'vegan'
    }

    if (normalizedValue === 'nut-free' || normalizedValue === 'peanut' || normalizedValue === 'nuts') {
        return 'nut-free'
    }

    if (normalizedValue === 'halal') {
        return 'halal'
    }

    return null
}

function fromMemberDto(member: GroupMemberDto): MemberDraft {
    return {
        id: member.id,
        display_name: member.display_name,
        member_type: member.member_type,
        sex: member.sex ?? '',
        age: String(member.age),
        activity_level: member.activity_level,
        goal_type: member.goal_type,
        priority_weight: member.priority_weight,
        height_cm: member.height_cm ? String(member.height_cm) : '',
        weight_kg: member.weight_kg ?? '',
    }
}

export function fromSummary(summary: SetupSummaryDto): OnboardingDraft {
    const allConstraints = Object.values(summary.constraints_by_member).flat()

    const restrictions = Array.from(
        new Set(
            allConstraints
                .map((constraint) => toRestrictionId(constraint))
                .filter((value): value is RestrictionId => value !== null),
        ),
    )

    const preferred = Array.from(
        new Set(
            allConstraints
                .filter((constraint) => constraint.constraint_type === 'preferred')
                .map((constraint) => (constraint.value_text ?? '').trim())
                .filter(Boolean),
        ),
    )

    const disliked = Array.from(
        new Set(
            allConstraints
                .filter((constraint) => constraint.constraint_type === 'disliked')
                .map((constraint) => (constraint.value_text ?? '').trim())
                .filter(Boolean),
        ),
    )

    return {
        groupId: summary.group.id,
        groupType: summary.group.group_type,
        hasSelectedGroupType: true,
        householdName: summary.group.name,
        planningDuration: toPlanningDuration(summary.group.planning_days_default),
        meals: toMeals(summary.group.meals_per_day_default),
        currencyCode: 'KZT',
        budgetPeriodType: summary.group.budget_period_type,
        regionCode: summary.group.region_code,
        budgetAmount: Number(summary.group.budget_amount),
        selectedPriority: pickPriority(summary.preferences),
        dailyVariety: summary.preferences?.variety_preference === 'high',
        preferredCuisines: summary.preferences?.preferred_cuisines ?? DEFAULT_DRAFT.preferredCuisines,
        lovedFlavors: preferred,
        dislikedFoods: disliked,
        selectedRestrictions: restrictions,
        spiceTolerance: toSpiceTolerance(summary.preferences?.spice_tolerance ?? DEFAULT_DRAFT.spiceTolerance),
        cookingTimeMinutes: summary.preferences?.max_cooking_time_minutes ?? DEFAULT_DRAFT.cookingTimeMinutes,
        members: summary.members.length ? summary.members.map(fromMemberDto) : buildMembersForMode(summary.group.group_type),
    }
}

function buildPriorityWeights(priority: BudgetPriority) {
    switch (priority) {
        case 'nutrition':
            return { price: 0.15, nutrition: 0.45, taste: 0.2, speed: 0.2 }
        case 'taste':
            return { price: 0.15, nutrition: 0.2, taste: 0.45, speed: 0.2 }
        case 'speed':
            return { price: 0.15, nutrition: 0.2, taste: 0.2, speed: 0.45 }
        case 'price':
        default:
            return { price: 0.45, nutrition: 0.2, taste: 0.2, speed: 0.15 }
    }
}

function buildPreferencesPayload(draft: OnboardingDraft, current: GroupPreferenceDto | null): GroupPreferencePayload {
    const weights = buildPriorityWeights(draft.selectedPriority)

    return {
        spice_tolerance: draft.spiceTolerance,
        max_cooking_time_minutes: draft.cookingTimeMinutes,
        repeat_tolerance: draft.dailyVariety ? 2 : current?.repeat_tolerance ?? 3,
        variety_preference: draft.dailyVariety ? 'high' : current?.variety_preference ?? 'medium',
        local_cuisine_priority: Number(current?.local_cuisine_priority ?? 0.8),
        price_priority_weight: weights.price,
        nutrition_priority_weight: weights.nutrition,
        taste_priority_weight: weights.taste,
        speed_priority_weight: weights.speed,
        preferred_cuisines: draft.preferredCuisines,
    }
}

function buildRestrictionConstraint(input: RestrictionId): { constraint_type: ConstraintType; value_text: string; severity_level: 'medium' | 'high' } {
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

function normalizeConstraintKey(constraintType: ConstraintType, valueText: string) {
    return `${constraintType}:${valueText.trim().toLowerCase()}`
}

function sanitizeMember(member: Partial<MemberDraft>, fallbackName: string): MemberDraft {
    return {
        id: member.id,
        display_name: member.display_name?.trim() ?? fallbackName,
        member_type: member.member_type ?? 'adult',
        sex: member.sex?.trim() ?? '',
        activity_level: member.activity_level?.trim() || '',
        age: member.age?.trim() || '',
        goal_type: member.goal_type ?? 'healthy',
        priority_weight: member.priority_weight?.trim() || '1',
        height_cm: member.height_cm?.trim() ?? '',
        weight_kg: member.weight_kg?.trim() ?? '',
    }
}

function toMemberPayload(member: MemberDraft) {
    return {
        display_name: member.display_name,
        member_type: member.member_type,
        sex: member.sex,
        age: Number(member.age),
        activity_level: member.activity_level,
        goal_type: member.goal_type,
        priority_weight: Number(member.priority_weight || '1'),
        height_cm: member.height_cm ? Number(member.height_cm) : null,
        weight_kg: member.weight_kg ? Number(member.weight_kg) : null,
    }
}

async function syncMembers(groupId: string, draftMembers: MemberDraft[]) {
    const existingMembers = await onboardingApi.listMembers(groupId)
    const cleanedMembers = draftMembers.map((member, index) => sanitizeMember(member, `Member ${index + 1}`))
    const existingById = new Map(existingMembers.map((member) => [member.id, member]))
    const nextIds = new Set(cleanedMembers.filter((member) => member.id).map((member) => member.id as string))

    for (const member of cleanedMembers) {
        const payload = toMemberPayload(member)

        if (member.id && existingById.has(member.id)) {
            await onboardingApi.updateMember(member.id, payload)
            continue
        }

        await onboardingApi.createMember(groupId, payload)
    }

    for (const existingMember of existingMembers) {
        if (!nextIds.has(existingMember.id)) {
            await onboardingApi.deleteMember(existingMember.id)
        }
    }
}

async function syncConstraintsForMember(
    memberId: string,
    draft: OnboardingDraft,
    existingConstraints: MemberConstraintDto[],
) {
    const desiredConstraints = [
        ...draft.lovedFlavors
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => ({ constraint_type: 'preferred' as const, value_text: value, severity_level: 'medium' as const })),
        ...draft.dislikedFoods
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => ({ constraint_type: 'disliked' as const, value_text: value, severity_level: 'medium' as const })),
        ...draft.selectedRestrictions.map(buildRestrictionConstraint),
    ]

    const existingByKey = new Map(
        existingConstraints
            .filter((constraint) => constraint.value_text)
            .map((constraint) => [
                normalizeConstraintKey(constraint.constraint_type, constraint.value_text ?? ''),
                constraint,
            ]),
    )

    const desiredKeys = new Set(
        desiredConstraints.map((constraint) => normalizeConstraintKey(constraint.constraint_type, constraint.value_text)),
    )

    for (const constraint of desiredConstraints) {
        const key = normalizeConstraintKey(constraint.constraint_type, constraint.value_text)
        const existing = existingByKey.get(key)

        if (!existing) {
            await onboardingApi.createConstraint(memberId, {
                constraint_type: constraint.constraint_type,
                value_text: constraint.value_text,
                severity_level: constraint.severity_level,
                ingredient_id: null,
                tag_key: null,
            })
            continue
        }

        if (existing.severity_level !== constraint.severity_level) {
            await onboardingApi.updateConstraint(existing.id, {
                severity_level: constraint.severity_level,
            })
        }
    }

    for (const existing of existingConstraints) {
        const key = normalizeConstraintKey(existing.constraint_type, existing.value_text ?? '')

        if (!desiredKeys.has(key)) {
            await onboardingApi.deleteConstraint(existing.id)
        }
    }
}

async function syncPreferences(groupId: string, draft: OnboardingDraft, members: GroupMemberDto[]) {
    const currentPreferences = await onboardingApi.getPreferences(groupId)

    await onboardingApi.putPreferences(groupId, buildPreferencesPayload(draft, currentPreferences))

    for (const member of members) {
        const existingConstraints = await onboardingApi.listConstraints(member.id)
        await syncConstraintsForMember(member.id, draft, existingConstraints)
    }
}


export function useOnboardingFlow() {
    const context = useContext(OnboardingFlowContext)

    if (!context) {
        throw new Error('useOnboardingFlow must be used within OnboardingFlowProvider.')
    }

    return context
}

export async function saveGroupFromDraft(draft: OnboardingDraft) {
    if (!draft.hasSelectedGroupType || !draft.groupType) {
        throw new Error('Please choose who you are planning for.')
    }

    if (!draft.householdName.trim()) {
        throw new Error('Please enter a household name.')
    }

    if (!draft.meals.length) {
        throw new Error('Please select at least one meal per day.')
    }

    const payload = {
        name: draft.householdName.trim(),
        group_type: draft.groupType,
        planning_days_default: fromPlanningDuration(draft.planningDuration),
        meals_per_day_default: Math.max(draft.meals.length, 1),
        currency_code: 'KZT',
        region_code: draft.regionCode,
        budget_period_type: draft.budgetPeriodType,
        budget_amount: draft.budgetAmount,
    }

    if (draft.groupId) {
        return onboardingApi.updateGroup(draft.groupId, payload)
    }

    const group = await onboardingApi.createGroup(payload)
    await onboardingApi.activateGroup(group.id)
    return group
}

export async function saveMembersFromDraft(groupId: string, draft: OnboardingDraft) {
    if (!draft.members.length) {
        throw new Error('Please add at least one member.')
    }

    for (const [index, member] of draft.members.entries()) {
        const label = member.display_name.trim() || `member ${index + 1}`

        if (!member.display_name.trim()) {
            throw new Error(`Please enter a display name for member ${index + 1}.`)
        }

        const age = Number(member.age)
        if (!member.age.trim() || !Number.isInteger(age) || age <= 0) {
            throw new Error(`Please enter a valid age for ${label}.`)
        }

        if (!member.activity_level.trim()) {
            throw new Error(`Please choose an activity level for ${label}.`)
        }

        const weight = member.weight_kg.trim() ? Number(member.weight_kg) : null
        if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) {
            throw new Error(`Please enter a valid weight for ${label}.`)
        }

        const height = member.height_cm.trim() ? Number(member.height_cm) : null
        if (height !== null && (!Number.isFinite(height) || height <= 0)) {
            throw new Error(`Please enter a valid height for ${label}.`)
        }
    }

    const cleanedMembers = draft.members.map((member, index) => sanitizeMember(member, `Member ${index + 1}`))

    await syncMembers(groupId, cleanedMembers)
}

export async function savePreferencesFromDraft(groupId: string, draft: OnboardingDraft) {
    const members = await onboardingApi.listMembers(groupId)

    if (!members.length) {
        throw new Error('Please add at least one member before saving preferences.')
    }

    await syncPreferences(groupId, draft, members)
}

export async function saveBudgetFromDraft(groupId: string, draft: OnboardingDraft) {
    await onboardingApi.updateGroup(groupId, {
        budget_period_type: draft.budgetPeriodType,
        budget_amount: draft.budgetAmount,
        currency_code: 'KZT',
    })

    const members = await onboardingApi.listMembers(groupId)
    await syncPreferences(groupId, draft, members)
}

export async function finalizeOnboarding(groupId: string, refreshOnboardingStatus: () => Promise<boolean | null>) {
    await onboardingApi.activateGroup(groupId)
    clearStoredDraft()
    writeStoredGroupId(groupId)
    await refreshOnboardingStatus()
}
