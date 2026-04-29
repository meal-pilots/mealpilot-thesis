import { useEffect } from 'react'
import {
    saveMembersFromDraft,
    useOnboardingFlow,
    type MemberDraft,
} from '../../features/onboarding/model/OnboardingFlowContext'
import './OnboardingPage.css'
import { EditIcon, PlusIcon, PersonIcon } from './OnboardingIcons'

const memberTypeOptions = [
    { value: 'adult', label: 'Adult' },
    { value: 'child', label: 'Child' },
] as const

const goalOptions = [
    { value: 'healthy', label: 'Healthy' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'high_protein', label: 'High Protein' },
    { value: 'mass_gain', label: 'Mass Gain' },
    { value: 'weight_loss', label: 'Weight Loss' },
    { value: 'low_carb', label: 'Low Carb' },
] as const

function buildEmptyMember(): MemberDraft {
    return {
        display_name: '',
        member_type: 'adult',
        sex: '',
        age: '',
        activity_level: '',
        goal_type: 'healthy',
        priority_weight: '1',
        height_cm: '',
        weight_kg: '',
    }
}

export function MembersPage() {
    const { draft, setDraft, registerStepSubmit, refreshSetupSummary } = useOnboardingFlow()

    useEffect(() => {
        return registerStepSubmit(async () => {
            if (!draft.groupId) {
                throw new Error('Please create your household first.')
            }

            await saveMembersFromDraft(draft.groupId, draft)
            await refreshSetupSummary()
        })
    }, [draft, registerStepSubmit, refreshSetupSummary])

    function updateMember(index: number, nextPartial: Partial<MemberDraft>) {
        setDraft((current) => ({
            ...current,
            members: current.members.map((member, memberIndex) =>
                memberIndex === index ? { ...member, ...nextPartial } : member,
            ),
        }))
    }

    function removeMember(index: number) {
        setDraft((current) => ({
            ...current,
            members: current.members.filter((_, memberIndex) => memberIndex !== index),
        }))
    }

    return (
        <section className="onboarding-page onboarding-page--wide">
            <p className="onboarding-page__intro">
                Define who's at the table. We'll curate portions and nutritional targets for every palate in your atelier.
            </p>

            <div className="onboarding-page__section onboarding-page__members">
                {draft.members.map((member, index) => (
                    <article key={`member-${index}`} className="onboarding-page__member onboarding-page__member--muted">
                        <div className="onboarding-page__member-avatar">
                            <PersonIcon className="onboarding-page__icon" style={{ color: '#737973' }} />
                        </div>

                        <div className="onboarding-page__member-content">
                            <div className="onboarding-page__member-top">
                                <div>
                                    <h3 className="onboarding-page__member-name">
                                        {member.display_name || `Member ${index + 1}`}
                                    </h3>
                                    <p className="onboarding-page__member-role">
                                        {member.member_type.replace('_', ' ')} · {member.goal_type.replace('_', ' ')}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="onboarding-page__edit-button"
                                    aria-label={`Edit ${member.display_name || `Member ${index + 1}`}`}
                                >
                                    <EditIcon className="onboarding-page__icon--sm" />
                                </button>
                            </div>

                            <div className="onboarding-page__member-form-grid">
                                <label className="onboarding-page__field">
                                    <span className="onboarding-page__member-note">Display Name</span>
                                    <input
                                        className="onboarding-page__input"
                                        value={member.display_name}
                                        onChange={(event) => updateMember(index, { display_name: event.target.value })}
                                    />
                                </label>

                                <label className="onboarding-page__field">
                                    <span className="onboarding-page__member-note">Member Type</span>
                                    <select
                                        className="onboarding-page__select"
                                        value={member.member_type}
                                        onChange={(event) =>
                                            updateMember(index, {
                                                member_type: event.target.value as MemberDraft['member_type'],
                                            })
                                        }
                                    >
                                        {memberTypeOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="onboarding-page__field">
                                    <span className="onboarding-page__member-note">Age</span>
                                    <input
                                        className="onboarding-page__input"
                                        type="number"
                                        min="1"
                                        value={member.age}
                                        onChange={(event) => updateMember(index, { age: event.target.value })}
                                    />
                                </label>

                                <label className="onboarding-page__field">
                                    <span className="onboarding-page__member-note">Activity Level</span>
                                    <input
                                        className="onboarding-page__input"
                                        value={member.activity_level}
                                        onChange={(event) => updateMember(index, { activity_level: event.target.value })}
                                        placeholder="low / moderate / active"
                                    />
                                </label>

                                <label className="onboarding-page__field onboarding-page__field--full">
                                    <span className="onboarding-page__member-note">Goal</span>
                                    <select
                                        className="onboarding-page__select"
                                        value={member.goal_type}
                                        onChange={(event) =>
                                            updateMember(index, {
                                                goal_type: event.target.value as MemberDraft['goal_type'],
                                            })
                                        }
                                    >
                                        {goalOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="onboarding-page__member-actions">
                                <div className="onboarding-page__pills">
                                    <span className="onboarding-page__status-pill">Priority {member.priority_weight || '1'}</span>
                                    <span className="onboarding-page__status-pill">{member.age || '—'} yrs</span>
                                </div>

                                <button
                                    type="button"
                                    className="onboarding-page__text-button"
                                    onClick={() => removeMember(index)}
                                    disabled={draft.members.length === 1}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </article>
                ))}

                <button
                    type="button"
                    className="onboarding-page__ghost-button"
                    onClick={() =>
                        setDraft((current) => ({
                            ...current,
                            members: [...current.members, buildEmptyMember()],
                        }))
                    }
                >
                    <span className="onboarding-page__add-icon">
                        <PlusIcon className="onboarding-page__icon--sm" />
                    </span>
                    <span className="onboarding-page__selectable-label">Add New Member</span>
                </button>
            </div>
        </section>
    )
}
