import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import {
    savePreferencesFromDraft,
    useOnboardingFlow,
    type RestrictionId,
} from '../../features/onboarding/model/OnboardingFlowContext'
import './OnboardingPage.css'
import {
    DropletIcon,
    GrainIcon,
    GridIcon,
    LeafIcon,
    StarCircleIcon,
} from './OnboardingIcons'

const restrictionOptions: {
    id: RestrictionId
    label: string
    icon: typeof GrainIcon
}[] = [
        { id: 'gluten-free', label: 'Gluten-free', icon: GrainIcon },
        { id: 'dairy-free', label: 'Dairy-free', icon: DropletIcon },
        { id: 'vegan', label: 'Vegan', icon: LeafIcon },
        { id: 'nut-free', label: 'Nut-free', icon: GridIcon },
        { id: 'halal', label: 'Halal', icon: StarCircleIcon },
    ]

const spiceOptions = [
    { value: 'mild', label: 'Mild' },
    { value: 'medium', label: 'Medium' },
    { value: 'hot', label: 'Spicy' },
] as const

export function PreferencesPage() {
    const { draft, setDraft, registerStepSubmit, refreshSetupSummary } = useOnboardingFlow()
    const [flavorInput, setFlavorInput] = useState('')
    const [dislikeInput, setDislikeInput] = useState('')
    const rangePercent = useMemo(
        () => `${((draft.cookingTimeMinutes - 15) / 105) * 100}%`,
        [draft.cookingTimeMinutes],
    )

    useEffect(() => {
        return registerStepSubmit(async () => {
            if (!draft.groupId) {
                throw new Error('Please create your household first.')
            }

            await savePreferencesFromDraft(draft.groupId, draft)
            await refreshSetupSummary()
        })
    }, [draft, registerStepSubmit, refreshSetupSummary])

    function toggleRestriction(id: RestrictionId) {
        setDraft((current) => ({
            ...current,
            selectedRestrictions: current.selectedRestrictions.includes(id)
                ? current.selectedRestrictions.filter((item) => item !== id)
                : [...current.selectedRestrictions, id],
        }))
    }

    function addTag(type: 'loved' | 'disliked') {
        const value = (type === 'loved' ? flavorInput : dislikeInput).trim()

        if (!value) {
            return
        }

        setDraft((current) => ({
            ...current,
            lovedFlavors:
                type === 'loved' && !current.lovedFlavors.includes(value)
                    ? [...current.lovedFlavors, value]
                    : current.lovedFlavors,
            dislikedFoods:
                type === 'disliked' && !current.dislikedFoods.includes(value)
                    ? [...current.dislikedFoods, value]
                    : current.dislikedFoods,
        }))

        if (type === 'loved') {
            setFlavorInput('')
            return
        }

        setDislikeInput('')
    }

    function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>, type: 'loved' | 'disliked') {
        if (event.key === 'Enter') {
            event.preventDefault()
            addTag(type)
        }
    }

    return (
        <section className="onboarding-page onboarding-page--wide">
            <p className="onboarding-page__intro--center">
                Tell us your culinary profile to help the AI craft the perfect plan for your household.
            </p>

            <div className="onboarding-page__section">
                <h2 className="onboarding-page__section-title">Loved Flavors</h2>
                <div className="onboarding-page__tag-input">
                    {draft.lovedFlavors.map((flavor) => (
                        <span key={flavor} className="onboarding-page__tag">
                            {flavor}
                            <button
                                type="button"
                                className="onboarding-page__tag-remove"
                                aria-label={`Remove ${flavor}`}
                                onClick={() =>
                                    setDraft((current) => ({
                                        ...current,
                                        lovedFlavors: current.lovedFlavors.filter((item) => item !== flavor),
                                    }))
                                }
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    <input
                        className="onboarding-page__tag-field"
                        placeholder="Add a flavor..."
                        value={flavorInput}
                        onChange={(event) => setFlavorInput(event.target.value)}
                        onKeyDown={(event) => handleTagKeyDown(event, 'loved')}
                        onBlur={() => addTag('loved')}
                    />
                </div>
            </div>

            <div className="onboarding-page__section">
                <h2 className="onboarding-page__section-title">Disliked Foods</h2>
                <div className="onboarding-page__tag-input">
                    {draft.dislikedFoods.map((food) => (
                        <span key={food} className="onboarding-page__tag onboarding-page__tag--muted">
                            {food}
                            <button
                                type="button"
                                className="onboarding-page__tag-remove"
                                aria-label={`Remove ${food}`}
                                onClick={() =>
                                    setDraft((current) => ({
                                        ...current,
                                        dislikedFoods: current.dislikedFoods.filter((item) => item !== food),
                                    }))
                                }
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    <input
                        className="onboarding-page__tag-field"
                        placeholder="Add a dislike..."
                        value={dislikeInput}
                        onChange={(event) => setDislikeInput(event.target.value)}
                        onKeyDown={(event) => handleTagKeyDown(event, 'disliked')}
                        onBlur={() => addTag('disliked')}
                    />
                </div>
            </div>

            <div className="onboarding-page__section">
                <h2 className="onboarding-page__section-title">Allergies & Restrictions</h2>
                <div className="onboarding-page__tiles">
                    {restrictionOptions.map((option) => {
                        const Icon = option.icon
                        const selected = draft.selectedRestrictions.includes(option.id)

                        return (
                            <button
                                key={option.id}
                                type="button"
                                className={`onboarding-page__tile ${selected ? 'onboarding-page__tile--selected' : ''}`}
                                onClick={() => toggleRestriction(option.id)}
                            >
                                <span className="onboarding-page__restriction-icon">
                                    <Icon className="onboarding-page__icon" />
                                </span>
                                <div className="onboarding-page__tile-label">{option.label}</div>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="onboarding-page__section">
                <h2 className="onboarding-page__section-title">Spice Tolerance</h2>
                <div className="onboarding-page__segmented">
                    {spiceOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`onboarding-page__segmented-option ${draft.spiceTolerance === option.value ? 'onboarding-page__segmented-option--selected' : ''}`}
                            onClick={() =>
                                setDraft((current) => ({ ...current, spiceTolerance: option.value }))
                            }
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="onboarding-page__section">
                <div className="onboarding-page__range-wrap">
                    <div className="onboarding-page__range-top">
                        <h2 className="onboarding-page__section-title" style={{ marginBottom: 0 }}>
                            Max Cooking Time
                        </h2>
                        <span className="onboarding-page__range-value">{draft.cookingTimeMinutes} Minutes</span>
                    </div>

                    <input
                        type="range"
                        min="15"
                        max="120"
                        step="15"
                        value={draft.cookingTimeMinutes}
                        onChange={(event) =>
                            setDraft((current) => ({
                                ...current,
                                cookingTimeMinutes: Number(event.target.value),
                            }))
                        }
                        className="onboarding-page__range-input"
                        style={{ ['--range-percent' as string]: rangePercent }}
                    />

                    <div className="onboarding-page__legend">
                        <span>15 Min</span>
                        <span>120 Min</span>
                    </div>
                </div>
            </div>
        </section>
    )
}
