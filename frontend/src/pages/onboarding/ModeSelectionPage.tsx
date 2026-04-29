import { useEffect } from 'react'
import { useOnboardingFlow, type MemberDraft } from '../../features/onboarding/model/OnboardingFlowContext'
import './OnboardingPage.css'
import {
    CheckCircleIcon,
    FamilyIcon,
    GroupIcon,
    GroupsIcon,
    PersonIcon,
} from './OnboardingIcons'

const MODES = [
    {
        id: 'solo',
        title: 'Just For Me',
        description: 'A singular dining experience, tailored precisely to your tastes and nourishment needs.',
        icon: PersonIcon,
    },
    {
        id: 'two_adults',
        title: 'Two Adults',
        description: 'Perfect for couples or flatmates sharing grocery rhythm, portions, and balanced weekly menus.',
        icon: GroupIcon,
    },
    {
        id: 'adults_kids',
        title: 'Adults + Children',
        description: 'Family-oriented planning that balances nutrition, kid-friendly dishes, and shared shopping.',
        icon: FamilyIcon,
    },
    {
        id: 'custom',
        title: 'Custom Group',
        description: 'Hosting a dinner party or meal prepping for a larger commune? Define your count.',
        icon: GroupsIcon,
    },
] as const

function buildMembersForMode(groupType: 'solo' | 'two_adults' | 'adults_kids' | 'custom'): MemberDraft[] {
    switch (groupType) {
        case 'solo':
            return [
                {
                    display_name: 'You',
                    member_type: 'adult',
                    sex: '',
                    age: '',
                    activity_level: '',
                    goal_type: 'healthy',
                    priority_weight: '1',
                    height_cm: '',
                    weight_kg: '',
                },
            ]
        case 'two_adults':
            return [
                {
                    display_name: '',
                    member_type: 'adult',
                    sex: '',
                    age: '',
                    activity_level: '',
                    goal_type: 'healthy',
                    priority_weight: '1',
                    height_cm: '',
                    weight_kg: '',
                },
                {
                    display_name: '',
                    member_type: 'adult',
                    sex: '',
                    age: '',
                    activity_level: '',
                    goal_type: 'healthy',
                    priority_weight: '1',
                    height_cm: '',
                    weight_kg: '',
                },
            ]
        case 'adults_kids':
            return [
                {
                    display_name: '',
                    member_type: 'adult',
                    sex: '',
                    age: '',
                    activity_level: '',
                    goal_type: 'healthy',
                    priority_weight: '1',
                    height_cm: '',
                    weight_kg: '',
                },
                {
                    display_name: '',
                    member_type: 'child',
                    sex: '',
                    age: '',
                    activity_level: '',
                    goal_type: 'maintenance',
                    priority_weight: '1',
                    height_cm: '',
                    weight_kg: '',
                },
            ]
        case 'custom':
        default:
            return [
                {
                    display_name: '',
                    member_type: 'adult',
                    sex: '',
                    age: '',
                    activity_level: '',
                    goal_type: 'healthy',
                    priority_weight: '1',
                    height_cm: '',
                    weight_kg: '',
                },
            ]
    }
}

export function ModeSelectionPage() {
    const { draft, setDraft, registerStepSubmit } = useOnboardingFlow()

    useEffect(() => registerStepSubmit(null), [registerStepSubmit])

    return (
        <section className="onboarding-page">
            <p className="onboarding-page__intro">
                Choose your household size to help us curate the perfect portions and weekly grocery lists for your kitchen.
            </p>

            <div className="onboarding-page__section onboarding-page__choice-list">
                {MODES.map((mode) => {
                    const Icon = mode.icon
                    const isSelected = draft.groupType === mode.id

                    return (
                        <button
                            key={mode.id}
                            type="button"
                            className={`onboarding-page__choice ${isSelected ? 'onboarding-page__choice--selected' : ''}`}
                            onClick={() =>
                                setDraft((current) => ({
                                    ...current,
                                    groupType: mode.id,
                                    members:
                                        current.groupType === mode.id
                                            ? current.members
                                            : buildMembersForMode(mode.id),
                                }))
                            }
                        >
                            <div className="onboarding-page__choice-top">
                                <span className="onboarding-page__icon-badge">
                                    <Icon className="onboarding-page__icon" />
                                </span>

                                <span className="onboarding-page__choice-check">
                                    <CheckCircleIcon className="onboarding-page__icon" />
                                </span>
                            </div>

                            <h3 className="onboarding-page__choice-title">{mode.title}</h3>
                            <p className="onboarding-page__choice-description">{mode.description}</p>
                        </button>
                    )
                })}
            </div>
        </section>
    )
}