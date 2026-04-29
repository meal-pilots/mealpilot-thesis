import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { getApiErrorMessage } from '../../../shared/lib/get-api-error-message'
import { onboardingApi, type SetupSummaryDto } from '../api/onboardingApi'
import {
    OnboardingFlowContext,
    DEFAULT_DRAFT,
    readStoredDraft,
    writeStoredDraft,
    writeStoredGroupId,
    readStoredGroupId,
    fromSummary,
    type OnboardingDraft,
    type OnboardingFlowContextValue,
    type StepSubmitHandler,
} from './OnboardingFlowContext'

export function OnboardingFlowProvider({ children }: PropsWithChildren) {
    const [draft, setDraft] = useState<OnboardingDraft>(() => readStoredDraft() ?? DEFAULT_DRAFT)
    const [setupSummary, setSetupSummary] = useState<SetupSummaryDto | null>(null)
    const [isBootstrapping, setIsBootstrapping] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const stepSubmitRef = useRef<StepSubmitHandler | null>(null)

    useEffect(() => {
        writeStoredDraft(draft)
        writeStoredGroupId(draft.groupId)
    }, [draft])

    const refreshSetupSummary = useCallback(async (groupIdOverride?: string) => {
        const groupId = groupIdOverride ?? draft.groupId ?? readStoredGroupId()

        if (!groupId) {
            setSetupSummary(null)
            return null
        }

        const summary = await onboardingApi.getSetupSummary(groupId)
        setSetupSummary(summary)
        setDraft(fromSummary(summary))
        return summary
    }, [draft.groupId])

    useEffect(() => {
        let isMounted = true

        async function bootstrap() {
            setIsBootstrapping(true)

            try {
                const activeGroup = await onboardingApi.getActiveGroup()
                const activeGroupId = activeGroup?.id ?? readStoredGroupId()

                if (!activeGroupId) {
                    if (isMounted) {
                        setSetupSummary(null)
                    }
                    return
                }

                const summary = await onboardingApi.getSetupSummary(activeGroupId)

                if (!isMounted) {
                    return
                }

                setSetupSummary(summary)
                setDraft(fromSummary(summary))
            } catch {
                const storedDraft = readStoredDraft()

                if (isMounted && storedDraft) {
                    setDraft(storedDraft)
                }
            } finally {
                if (isMounted) {
                    setIsBootstrapping(false)
                }
            }
        }

        void bootstrap()

        return () => {
            isMounted = false
        }
    }, [])

    const registerStepSubmit = useCallback((handler: StepSubmitHandler | null) => {
        stepSubmitRef.current = handler

        return () => {
            if (stepSubmitRef.current === handler) {
                stepSubmitRef.current = null
            }
        }
    }, [])

    const submitCurrentStep = useCallback(async () => {
        const handler = stepSubmitRef.current

        if (!handler) {
            return true
        }

        setIsSubmitting(true)
        setErrorMessage('')

        try {
            await handler()
            return true
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error, 'Unable to continue.'))
            return false
        } finally {
            setIsSubmitting(false)
        }
    }, [])

    const value = useMemo<OnboardingFlowContextValue>(
        () => ({
            draft,
            setDraft,
            setupSummary,
            isBootstrapping,
            isSubmitting,
            errorMessage,
            setErrorMessage,
            registerStepSubmit,
            submitCurrentStep,
            refreshSetupSummary,
        }),
        [
            draft,
            setupSummary,
            isBootstrapping,
            isSubmitting,
            errorMessage,
            registerStepSubmit,
            submitCurrentStep,
            refreshSetupSummary,
        ],
    )

    return <OnboardingFlowContext.Provider value={value}>{children}</OnboardingFlowContext.Provider>
}
