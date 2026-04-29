import { useEffect } from 'react'
import {
    saveGroupFromDraft,
    useOnboardingFlow,
    type MealSlot,
    type PlanningDuration,
} from '../../features/onboarding/model/OnboardingFlowContext'
import './OnboardingPage.css'

const durations: { value: PlanningDuration; label: string }[] = [
    { value: 'weekly', label: 'Weekly' }
]

const mealOptions: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

export function CreateHouseholdPage() {
    const { draft, setDraft, registerStepSubmit, refreshSetupSummary } = useOnboardingFlow()

    useEffect(() => {
        return registerStepSubmit(async () => {
            if (!draft.householdName.trim()) {
                throw new Error('Please enter a household name.')
            }

            if (!draft.meals.length) {
                throw new Error('Please select at least one meal per day.')
            }

            const group = await saveGroupFromDraft(draft)

            setDraft((current) => ({ ...current, groupId: group.id }))
            await refreshSetupSummary(group.id)
        })
    }, [draft, registerStepSubmit, refreshSetupSummary, setDraft])

    function toggleMeal(meal: MealSlot) {
        setDraft((current) => ({
            ...current,
            meals: current.meals.includes(meal)
                ? current.meals.filter((item) => item !== meal)
                : [...current.meals, meal],
        }))
    }

    return (
        <section className="onboarding-page onboarding-page--wide">
            <div className="onboarding-page__stack">
                <p className="onboarding-page__intro">
                    Set the foundation for your household's meal planning, budget targets, and kitchen rhythm.
                </p>

                <div className="onboarding-page__field">
                    <label className="onboarding-page__field-label" htmlFor="household-name">
                        Household Name
                    </label>
                    <input
                        id="household-name"
                        className="onboarding-page__input"
                        type="text"
                        placeholder="e.g., The Mercer Kitchen"
                        value={draft.householdName}
                        onChange={(event) =>
                            setDraft((current) => ({ ...current, householdName: event.target.value }))
                        }
                    />
                </div>

                <div className="onboarding-page__field">
                    <span className="onboarding-page__field-label">Planning Duration</span>
                    <div className="onboarding-page__durations">
                        {durations.map((duration) => (
                            <button
                                key={duration.value}
                                type="button"
                                className={`onboarding-page__duration ${draft.planningDuration === duration.value ? 'onboarding-page__duration--selected' : ''}`}
                                onClick={() =>
                                    setDraft((current) => ({ ...current, planningDuration: duration.value }))
                                }
                            >
                                {duration.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="onboarding-page__field">
                    <span className="onboarding-page__field-label">Meals Per Day</span>
                    <div className="onboarding-page__meals">
                        {mealOptions.map((meal) => {
                            const checked = draft.meals.includes(meal)

                            return (
                                <button
                                    key={meal}
                                    type="button"
                                    className={`onboarding-page__selectable ${checked ? 'onboarding-page__selectable--checked' : ''}`}
                                    onClick={() => toggleMeal(meal)}
                                >
                                    <span className="onboarding-page__selectable-label">{meal}</span>
                                    <span className="onboarding-page__selectable-check">{checked ? '✓' : ''}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="onboarding-page__grid-2">
                    <div className="onboarding-page__field">
                        <label className="onboarding-page__field-label" htmlFor="currency-select">
                            Currency
                        </label>
                        <select
                            id="currency-select"
                            className="onboarding-page__select"
                            value={draft.currencyCode}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    currencyCode: event.target.value,
                                }))
                            }
                        >
                            <option value="KZT">KZT (₸)</option>
                        </select>
                    </div>

                    <div className="onboarding-page__field">
                        <label className="onboarding-page__field-label" htmlFor="budget-period-select">
                            Budget Period
                        </label>
                        <select
                            id="budget-period-select"
                            className="onboarding-page__select"
                            value={draft.budgetPeriodType}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    budgetPeriodType: event.target.value as 'daily' | 'weekly',
                                }))
                            }
                        >
                            <option value="weekly">Weekly</option>
                        </select>
                    </div>
                </div>
            </div>
        </section>
    )
}
