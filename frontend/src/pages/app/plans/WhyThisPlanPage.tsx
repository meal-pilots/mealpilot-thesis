import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/paths'
import { planningApi, type MealPlanDetailDto, type PlanExplanationDto } from '../../../features/planning/api/planningApi'
import { getApiErrorMessage } from '../../../shared/lib/get-api-error-message'
import { AppLoader } from '../../../shared/ui/AppLoader'
import {
    BrainIcon,
    CheckBadgeIcon,
    CoinStackIcon,
    HeartIcon,
    ShieldCheckIcon,
    SparkIcon,
    StarBadgeIcon,
    TrendUpBarsIcon,
} from '../AppIcons'
import '../AppPages.css'

function formatPercent(value: string | number | null | undefined) {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
        return '—'
    }
    const scaled = numeric <= 1 ? numeric * 100 : numeric
    return `${Math.round(scaled)}%`
}

function getExplanation(explanations: PlanExplanationDto[], type: PlanExplanationDto['explanation_type']) {
    return explanations.find((entry) => entry.explanation_type === type) ?? null
}

export function WhyThisPlanPage() {
    const { mealPlanId } = useParams<{ mealPlanId: string }>()
    const [mealPlanDetail, setMealPlanDetail] = useState<MealPlanDetailDto | null>(null)
    const [explanations, setExplanations] = useState<PlanExplanationDto[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        if (!mealPlanId) {
            setIsLoading(false)
            setErrorMessage('Meal plan was not found.')
            return
        }

        let isMounted = true

        async function loadExplanations() {
            if (!mealPlanId) {
                setIsLoading(false)
                setErrorMessage('Meal plan was not found.')
                return
            }

            setIsLoading(true)
            setErrorMessage('')

            try {
                const [detail, explanationList] = await Promise.all([
                    planningApi.getMealPlanDetail(mealPlanId),
                    planningApi.getPlanExplanations(mealPlanId),
                ])

                if (!isMounted) {
                    return
                }

                setMealPlanDetail(detail)
                setExplanations(explanationList)
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load plan insights.'))
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void loadExplanations()

        return () => {
            isMounted = false
        }
    }, [mealPlanId])

    const grouped = useMemo(() => {
        return {
            budget: getExplanation(explanations, 'budget'),
            nutrition: getExplanation(explanations, 'nutrition'),
            diversity: getExplanation(explanations, 'diversity'),
            groupFit: getExplanation(explanations, 'group_fit'),
            tradeoff: getExplanation(explanations, 'tradeoff'),
        }
    }, [explanations])

    const fitScore = useMemo(() => {
        const overall = Number(mealPlanDetail?.summary.overall_score ?? 0)
        if (Number.isNaN(overall)) {
            return '—'
        }
        return overall <= 1 ? Math.round(overall * 100) : Math.round(overall)
    }, [mealPlanDetail])

    const logicTags = useMemo(
        () => explanations.map((entry) => entry.title).slice(0, 4),
        [explanations],
    )

    if (isLoading) {
        return <AppLoader message="Loading plan insights..." />
    }

    if (!mealPlanId || !mealPlanDetail) {
        return (
            <section className="atelier-page atelier-page--insights">
                <section className="atelier-page__card atelier-page__hero-card">
                    <h1 className="atelier-page__headline">We couldn&apos;t load plan insights</h1>
                    <p className="atelier-page__body-copy atelier-page__body-copy--centered">{errorMessage || 'This meal plan is unavailable.'}</p>
                    <Link className="atelier-page__button atelier-page__button--wide" to={ROUTES.app.mealPlans.current}>
                        Back to weekly plan
                    </Link>
                </section>
            </section>
        )
    }

    return (
        <section className="atelier-page atelier-page--insights">
            <section className="atelier-page__card atelier-page__hero-card">
                <p className="atelier-page__eyebrow">Weekly Synthesis</p>
                <h1 className="atelier-page__fit-score">{fitScore}% Fit Score</h1>
                <p className="atelier-page__body-copy atelier-page__body-copy--centered">
                    {grouped.tradeoff?.explanation_text || grouped.groupFit?.explanation_text || 'This plan has been generated to balance cost, nutrition, and household fit.'}
                </p>
                <div className="atelier-page__insight-ring-shell">
                    <div className="atelier-page__insight-ring">
                        <div className="atelier-page__insight-ring-inner">
                            <SparkIcon className="atelier-page__ring-spark" />
                            <span className="atelier-page__caption atelier-page__caption--strong">{mealPlanDetail.summary.status}</span>
                        </div>
                    </div>
                </div>
            </section>

            {grouped.groupFit || grouped.diversity ? (
                <section className="atelier-page__card atelier-page__insight-block">
                    <div className="atelier-page__group-heading">
                        <span className="atelier-page__mini-icon-badge atelier-page__mini-icon-badge--olive">
                            <HeartIcon className="atelier-page__mini-icon" />
                        </span>
                        <h2 className="atelier-page__headline">Personalized Curation</h2>
                    </div>
                    <div className="atelier-page__bullets">
                        {grouped.groupFit ? (
                            <div className="atelier-page__bullet-row">
                                <CheckBadgeIcon className="atelier-page__mini-icon atelier-page__mini-icon--green" />
                                <p className="atelier-page__caption">
                                    <strong>{grouped.groupFit.title}:</strong> {grouped.groupFit.explanation_text}
                                </p>
                            </div>
                        ) : null}
                        {grouped.diversity ? (
                            <div className="atelier-page__bullet-row">
                                <ShieldCheckIcon className="atelier-page__mini-icon atelier-page__mini-icon--green" />
                                <p className="atelier-page__caption">
                                    <strong>{grouped.diversity.title}:</strong> {grouped.diversity.explanation_text}
                                </p>
                            </div>
                        ) : null}
                    </div>
                </section>
            ) : null}

            {grouped.budget ? (
                <section className="atelier-page__card atelier-page__insight-block">
                    <div className="atelier-page__group-heading">
                        <span className="atelier-page__mini-icon-badge atelier-page__mini-icon-badge--soft">
                            <CoinStackIcon className="atelier-page__mini-icon" />
                        </span>
                        <h2 className="atelier-page__headline">Financial Stewardship</h2>
                    </div>
                    <div className="atelier-page__metric-chip-row">
                        <div className="atelier-page__metric-chip">
                            <span className="atelier-page__caption">Budget Fit</span>
                            <strong>{formatPercent(mealPlanDetail.summary.budget_fit_score)}</strong>
                        </div>
                    </div>
                    <p className="atelier-page__caption">{grouped.budget.explanation_text}</p>
                </section>
            ) : null}

            {grouped.nutrition ? (
                <section className="atelier-page__card atelier-page__insight-block">
                    <div className="atelier-page__group-heading">
                        <span className="atelier-page__mini-icon-badge atelier-page__mini-icon-badge--dark">
                            <TrendUpBarsIcon className="atelier-page__mini-icon" />
                        </span>
                        <div>
                            <h2 className="atelier-page__headline">Health Mastery</h2>
                            <p className="atelier-page__caption">Bio-alignment with your health goals</p>
                        </div>
                    </div>

                    <div className="atelier-page__health-grid">
                        <div className="atelier-page__health-metric">
                            <span className="atelier-page__eyebrow">Nutrition Fit</span>
                            <strong>{formatPercent(mealPlanDetail.summary.nutrition_fit_score)}</strong>
                        </div>
                        <div className="atelier-page__health-metric">
                            <span className="atelier-page__eyebrow">Group Fit</span>
                            <strong>{formatPercent(mealPlanDetail.summary.group_fit_score)}</strong>
                        </div>
                    </div>

                    <div className="atelier-page__sub-card">
                        <div className="atelier-page__group-heading">
                            <StarBadgeIcon className="atelier-page__mini-icon atelier-page__mini-icon--amber" />
                            <span className="atelier-page__caption atelier-page__caption--strong">Primary Nutrition Insight</span>
                        </div>
                        <p className="atelier-page__caption">{grouped.nutrition.explanation_text}</p>
                    </div>

                    {grouped.tradeoff ? (
                        <div className="atelier-page__sub-card">
                            <div className="atelier-page__group-heading">
                                <BrainIcon className="atelier-page__mini-icon atelier-page__mini-icon--green" />
                                <span className="atelier-page__caption atelier-page__caption--strong">Tradeoff Observed</span>
                            </div>
                            <p className="atelier-page__caption">{grouped.tradeoff.explanation_text}</p>
                        </div>
                    ) : null}
                </section>
            ) : null}

            <section className="atelier-page__logic-card">
                <h2 className="atelier-page__headline atelier-page__headline--inverse">Variety & Practical Logic</h2>
                <p className="atelier-page__note-copy atelier-page__note-copy--compact">
                    {grouped.diversity?.explanation_text || grouped.groupFit?.explanation_text || 'This plan balances repetition, household fit, and available budget signals.'}
                </p>
                <div className="atelier-page__chip-group">
                    {logicTags.map((tag) => (
                        <span key={tag} className="atelier-page__logic-chip">
                            {tag}
                        </span>
                    ))}
                </div>
            </section>

            <Link className="atelier-page__button atelier-page__button--wide" to={ROUTES.app.mealPlans.details(mealPlanId)}>
                Proceed with this Plan
            </Link>

        </section>
    )
}
