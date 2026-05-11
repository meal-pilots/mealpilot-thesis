import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../app/router/paths'
import { authApi } from '../../features/auth/api/authApi'
import { profileApi, type ProfileSnapshot } from '../../features/profile/api/profileApi'
import { useAuth } from '../../shared/hooks/useAuth'
import { getApiErrorMessage } from '../../shared/lib/get-api-error-message'
import { AppLoader } from '../../shared/ui/AppLoader'
import './AppPages.css'

type ProfileFormState = {
    fullName: string
    preferredLanguage: string
    avatarUrl: string
}

type SettingsFormState = {
    notificationsEnabled: boolean
    measurementSystem: 'metric' | 'imperial'
    currencyCode: string
}

const emptyProfileForm: ProfileFormState = {
    fullName: '',
    preferredLanguage: 'en',
    avatarUrl: '',
}

const emptySettingsForm: SettingsFormState = {
    notificationsEnabled: true,
    measurementSystem: 'metric',
    currencyCode: 'KZT',
}

function startCase(value: string) {
    return value
        ?.split('_')
        ?.filter(Boolean)
        ?.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        ?.join(' ')
}

function formatBudget(amount: string | undefined) {
    if (!amount) {
        return '—'
    }

    const numericAmount = Number(amount)

    if (Number.isNaN(numericAmount)) {
        return `${amount} KZT`
    }

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(numericAmount)
}

function toProfileForm(snapshot: ProfileSnapshot): ProfileFormState {
    return {
        fullName: snapshot.profile.full_name ?? '',
        preferredLanguage: snapshot.profile.preferred_language ?? 'en',
        avatarUrl: snapshot.profile.avatar_url ?? '',
    }
}

function toSettingsForm(snapshot: ProfileSnapshot): SettingsFormState {
    return {
        notificationsEnabled: snapshot.settings.notifications_enabled,
        measurementSystem: snapshot.settings.measurement_system,
        currencyCode: 'KZT',
    }
}

export function ProfilePage() {
    const navigate = useNavigate()
    const { refreshUser, logOut } = useAuth()

    const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null)
    const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm)
    const [settingsForm, setSettingsForm] = useState<SettingsFormState>(emptySettingsForm)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')
    const [profileSuccess, setProfileSuccess] = useState('')
    const [settingsSuccess, setSettingsSuccess] = useState('')
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [isSavingSettings, setIsSavingSettings] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [deletePassword, setDeletePassword] = useState('')
    const [isDeletingAccount, setIsDeletingAccount] = useState(false)

    useEffect(() => {
        let isMounted = true

        async function loadSnapshot() {
            setIsLoading(true)
            setErrorMessage('')

            try {
                const nextSnapshot = await profileApi.getSnapshot()

                if (!isMounted) {
                    return
                }

                setSnapshot(nextSnapshot)
                setProfileForm(toProfileForm(nextSnapshot))
                setSettingsForm(toSettingsForm(nextSnapshot))
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load your profile.'))
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        void loadSnapshot()

        return () => {
            isMounted = false
        }
    }, [])

    const memberSummary = useMemo(() => {
        if (!snapshot?.members.length) {
            return 'No members yet'
        }

        return snapshot.members.map((member) => member.display_name).join(', ')
    }, [snapshot])

    async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setProfileSuccess('')
        setErrorMessage('')

        if (!snapshot) {
            return
        }

        setIsSavingProfile(true)

        try {
            const updatedProfile = await profileApi.updateProfile({
                full_name: profileForm.fullName.trim(),
                preferred_language: profileForm.preferredLanguage.trim(),
                avatar_url: profileForm.avatarUrl.trim() || null,
            })

            const nextSnapshot = {
                ...snapshot,
                profile: updatedProfile,
                settings: {
                    ...snapshot.settings,
                    preferred_language: updatedProfile.preferred_language,
                },
            }

            setSnapshot(nextSnapshot)
            setProfileForm(toProfileForm(nextSnapshot))
            setSettingsForm(toSettingsForm(nextSnapshot))
            setProfileSuccess('Profile saved.')
            await refreshUser()
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error, 'Unable to save your profile.'))
        } finally {
            setIsSavingProfile(false)
        }
    }

    async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSettingsSuccess('')
        setErrorMessage('')

        if (!snapshot) {
            return
        }

        setIsSavingSettings(true)

        try {
            const updatedSettings = await profileApi.updateSettings({
                preferred_language: profileForm.preferredLanguage.trim(),
                notifications_enabled: settingsForm.notificationsEnabled,
                measurement_system: settingsForm.measurementSystem,
                currency_code: 'KZT',
            })

            const nextSnapshot = {
                ...snapshot,
                profile: {
                    ...snapshot.profile,
                    preferred_language: updatedSettings.preferred_language,
                },
                settings: updatedSettings,
            }

            setSnapshot(nextSnapshot)
            setSettingsForm(toSettingsForm(nextSnapshot))
            setProfileForm(toProfileForm(nextSnapshot))
            setSettingsSuccess('Settings saved.')
            await refreshUser()
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error, 'Unable to save your settings.'))
        } finally {
            setIsSavingSettings(false)
        }
    }

    async function handleLogOut() {
        setIsLoggingOut(true)
        await logOut()
        navigate(ROUTES.auth.login, { replace: true })
    }

    async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setErrorMessage('')

        if (!deletePassword.trim()) {
            setErrorMessage('Enter your current password to confirm account deletion.')
            return
        }

        const confirmed = window.confirm(
            'Delete your account permanently? This will remove all households, plans, preferences, and saved data.',
        )

        if (!confirmed) {
            return
        }

        setIsDeletingAccount(true)

        try {
            await authApi.deleteAccount({
                password: deletePassword,
                confirm: true,
            })
            await logOut()
            navigate(ROUTES.auth.login, { replace: true })
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error, 'Unable to delete your account.'))
        } finally {
            setIsDeletingAccount(false)
        }
    }

    if (isLoading) {
        return <AppLoader message="Loading your profile..." />
    }

    if (!snapshot) {
        return (
            <section className="app-page">
                <div className="app-page__section">
                    <div className="app-page__detail-card">
                        <h1 className="app-page__title">Profile</h1>
                        <p className="app-page__body">{errorMessage || 'Unable to load your profile.'}</p>
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section className="app-page">
            <div className="app-page__section">
                <div className="app-page__hero">
                    <div className="app-page__hero-inner">
                        <p className="app-page__eyebrow">Profile</p>
                        <h1 className="app-page__title">{snapshot.profile.full_name}</h1>
                        <p className="app-page__body">{snapshot.profile.email}</p>
                    </div>

                    <div className="app-page__stats">
                        <article className="app-page__stat">
                            <p className="app-page__stat-label">Active household</p>
                            <p className="app-page__stat-value">{snapshot.activeGroup?.name ?? 'Not set'}</p>
                        </article>
                        <article className="app-page__stat">
                            <p className="app-page__stat-label">Members</p>
                            <p className="app-page__stat-value">{snapshot.members.length}</p>
                        </article>
                        <article className="app-page__stat">
                            <p className="app-page__stat-label">Budget</p>
                            <p className="app-page__stat-value">
                                {formatBudget(snapshot.group?.budget_amount)}
                            </p>
                        </article>
                    </div>
                </div>
            </div>

            {errorMessage ? (
                <div className="app-page__section">
                    <div className="app-page__surface">
                        <p className="app-page__body app-page__feedback app-page__feedback--error">{errorMessage}</p>
                    </div>
                </div>
            ) : null}

            <div className="app-page__grid app-page__grid--profile">
                <section className="app-page__section">
                    <div className="app-page__section-header">
                        <h2 className="app-page__subheading">Personal info</h2>
                    </div>

                    <div className="app-page__detail-card">
                        <form className="app-page__form" onSubmit={handleProfileSubmit}>
                            <label className="app-page__field">
                                <span className="app-page__helper">Full name</span>
                                <input
                                    className="app-page__input"
                                    value={profileForm.fullName}
                                    onChange={(event) =>
                                        setProfileForm((current) => ({ ...current, fullName: event.target.value }))
                                    }
                                    disabled={isSavingProfile}
                                />
                            </label>

                            <label className="app-page__field">
                                <span className="app-page__helper">Preferred language</span>
                                <select
                                    className="app-page__input"
                                    value={profileForm.preferredLanguage}
                                    onChange={(event) =>
                                        setProfileForm((current) => ({
                                            ...current,
                                            preferredLanguage: event.target.value,
                                        }))
                                    }
                                    disabled={isSavingProfile || isSavingSettings}
                                >
                                    <option value="en">English</option>
                                    <option value="ru">Russian</option>
                                    <option value="kk">Kazakh</option>
                                </select>
                            </label>

                            {profileSuccess ? (
                                <p className="app-page__helper app-page__feedback app-page__feedback--success">
                                    {profileSuccess}
                                </p>
                            ) : null}

                            <button className="app-page__button" type="submit" disabled={isSavingProfile}>
                                {isSavingProfile ? 'Saving...' : 'Save profile'}
                            </button>
                        </form>
                    </div>
                </section>

                <section className="app-page__section">
                    <div className="app-page__section-header">
                        <h2 className="app-page__subheading">App settings</h2>
                    </div>

                    <div className="app-page__detail-card">
                        <form className="app-page__form" onSubmit={handleSettingsSubmit}>
                            <label className="app-page__field app-page__field--checkbox">
                                <span className="app-page__helper">Notifications</span>
                                <input
                                    type="checkbox"
                                    checked={settingsForm.notificationsEnabled}
                                    onChange={(event) =>
                                        setSettingsForm((current) => ({
                                            ...current,
                                            notificationsEnabled: event.target.checked,
                                        }))
                                    }
                                    disabled={isSavingSettings}
                                />
                            </label>

                            <label className="app-page__field">
                                <span className="app-page__helper">Currency code</span>
                                <select
                                    className="app-page__input"
                                    value={settingsForm.currencyCode}
                                    onChange={() =>
                                        setSettingsForm((current) => ({
                                            ...current,
                                            currencyCode: 'KZT',
                                        }))
                                    }
                                    disabled={isSavingSettings}
                                >
                                    <option value="KZT">KZT (₸)</option>
                                </select>
                            </label>

                            {settingsSuccess ? (
                                <p className="app-page__helper app-page__feedback app-page__feedback--success">
                                    {settingsSuccess}
                                </p>
                            ) : null}

                            <button className="app-page__button" type="submit" disabled={isSavingSettings}>
                                {isSavingSettings ? 'Saving...' : 'Save settings'}
                            </button>
                        </form>
                    </div>
                </section>

                <section className="app-page__section">
                    <div className="app-page__section-header">
                        <h2 className="app-page__subheading">Household</h2>
                    </div>

                    <div className="app-page__detail-card">
                        <div className="app-page__list">
                            <div className="app-page__surface">
                                <p className="app-page__eyebrow">Group type</p>
                                <p className="app-page__body">{snapshot.group ? startCase(snapshot.group.group_type) : 'Not configured yet'}</p>
                            </div>
                            <div className="app-page__surface">
                                <p className="app-page__eyebrow">Budget period</p>
                                <p className="app-page__body">
                                    {snapshot.group ? startCase(snapshot.group.budget_period_type) : '—'}
                                </p>
                            </div>
                            <div className="app-page__surface">
                                <p className="app-page__eyebrow">Members</p>
                                <p className="app-page__body">{memberSummary}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="app-page__section">
                    <div className="app-page__section-header">
                        <h2 className="app-page__subheading">Preferences</h2>
                    </div>

                    <div className="app-page__detail-card">
                        <div className="app-page__list">
                            <div className="app-page__surface">
                                <p className="app-page__eyebrow">Spice tolerance</p>
                                <p className="app-page__body">
                                    {snapshot.preferences ? startCase(snapshot.preferences.spice_tolerance) : 'Not set'}
                                </p>
                            </div>
                            <div className="app-page__surface">
                                <p className="app-page__eyebrow">Max cooking time</p>
                                <p className="app-page__body">
                                    {snapshot.preferences
                                        ? `${snapshot.preferences.max_cooking_time_minutes} minutes`
                                        : 'Not set'}
                                </p>
                            </div>
                            <div className="app-page__surface">
                                <p className="app-page__eyebrow">Preferred cuisines</p>
                                <p className="app-page__body">
                                    {snapshot.preferences?.preferred_cuisines?.length
                                        ? snapshot.preferences.preferred_cuisines.join(', ')
                                        : 'No cuisines selected'}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <div className="app-page__section">
                <div className="app-page__section-header">
                    <h2 className="app-page__subheading">Account</h2>
                </div>

                <div className="app-page__detail-card">
                    <div className="app-page__form">
                        <button
                            className="app-page__button app-page__button--secondary"
                            type="button"
                            onClick={handleLogOut}
                            disabled={isLoggingOut || isDeletingAccount}
                        >
                            {isLoggingOut ? 'Logging out...' : 'Log out'}
                        </button>
                    </div>
                </div>

                <div className="app-page__detail-card app-page__danger-card">
                    <form className="app-page__form" onSubmit={handleDeleteAccount}>
                        <div>
                            <p className="app-page__eyebrow">Danger zone</p>
                            <h3 className="app-page__card-title">Delete account</h3>
                            <p className="app-page__body app-page__danger-copy">
                                Deletion is irreversible: all households, meal plans, preferences, pantry items, favorites, and account data will be permanently deleted.
                            </p>
                        </div>

                        <label className="app-page__field">
                            <span className="app-page__helper">Current password</span>
                            <input
                                className="app-page__input"
                                type="password"
                                autoComplete="current-password"
                                value={deletePassword}
                                onChange={(event) => setDeletePassword(event.target.value)}
                                disabled={isDeletingAccount}
                                placeholder="Enter your current password"
                            />
                        </label>

                        <button
                            className="app-page__button app-page__button--danger"
                            type="submit"
                            disabled={isDeletingAccount || !deletePassword.trim()}
                        >
                            {isDeletingAccount ? 'Deleting account...' : 'Delete account'}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    )
}
