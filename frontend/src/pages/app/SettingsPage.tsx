import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../app/router/paths'
import { profileApi, type ProfileSnapshot } from '../../features/profile/api/profileApi'
import { useAuth } from '../../shared/hooks/useAuth'
import { getApiErrorMessage } from '../../shared/lib/get-api-error-message'
import { AppLoader } from '../../shared/ui/AppLoader'
import { ArrowLeftIcon, BellIcon, GlobeIcon, RulerIcon } from './AppIcons'
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

function languageLabel(value: string) {
    const labels: Record<string, string> = {
        en: 'English',
        ru: 'Russian',
        kk: 'Kazakh',
    }

    return labels[value] ?? value.toUpperCase()
}

function measurementLabel(value: SettingsFormState['measurementSystem']) {
    return value === 'metric' ? 'Metric' : 'Imperial'
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
        currencyCode: snapshot.settings.currency_code || 'KZT',
    }
}

export function SettingsPage() {
    const { refreshUser } = useAuth()

    const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null)
    const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm)
    const [settingsForm, setSettingsForm] = useState<SettingsFormState>(emptySettingsForm)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')
    const [profileSuccess, setProfileSuccess] = useState('')
    const [settingsSuccess, setSettingsSuccess] = useState('')
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [isSavingSettings, setIsSavingSettings] = useState(false)

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
                    setErrorMessage(getApiErrorMessage(error, 'Unable to load your settings.'))
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

    async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setProfileSuccess('')
        setSettingsSuccess('')
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
        setProfileSuccess('')
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
                currency_code: settingsForm.currencyCode,
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

    if (isLoading) {
        return <AppLoader message="Loading settings..." />
    }

    if (!snapshot) {
        return (
            <section className="app-page app-page--profile">
                <SettingsHeader />
                <div className="app-page__profile-list-card">
                    <p className="app-page__profile-card-subtitle">
                        {errorMessage || 'Unable to load your settings.'}
                    </p>
                </div>
            </section>
        )
    }

    return (
        <section className="app-page app-page--profile">
            <SettingsHeader />

            {errorMessage ? (
                <div className="app-page__profile-alert" role="status">
                    {errorMessage}
                </div>
            ) : null}

            <div className="app-page__profile-sections">
                <ProfileSection title="Profile details">
                    <div className="app-page__profile-list-card app-page__profile-list-card--settings">
                        <form className="app-page__profile-form" onSubmit={handleProfileSubmit}>
                            <label className="app-page__profile-setting-row app-page__profile-setting-row--field">
                                <span>
                                    <span className="app-page__profile-list-label">Full name</span>
                                    <span className="app-page__profile-card-subtitle">Shown across your household</span>
                                </span>
                                <input
                                    className="app-page__profile-input"
                                    value={profileForm.fullName}
                                    onChange={(event) =>
                                        setProfileForm((current) => ({ ...current, fullName: event.target.value }))
                                    }
                                    disabled={isSavingProfile}
                                />
                            </label>

                            <label className="app-page__profile-setting-row app-page__profile-setting-row--field">
                                <span>
                                    <span className="app-page__profile-list-label">Language</span>
                                    <span className="app-page__profile-card-subtitle">
                                        {languageLabel(profileForm.preferredLanguage)}
                                    </span>
                                </span>
                                <select
                                    className="app-page__profile-input"
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

                            <div className="app-page__profile-form-actions">
                                {profileSuccess ? (
                                    <p className="app-page__profile-feedback app-page__profile-feedback--success">
                                        {profileSuccess}
                                    </p>
                                ) : null}
                                <button
                                    className="app-page__profile-pill-button app-page__profile-pill-button--primary"
                                    type="submit"
                                    disabled={isSavingProfile}
                                >
                                    {isSavingProfile ? 'Saving...' : 'Save profile'}
                                </button>
                            </div>
                        </form>
                    </div>
                </ProfileSection>

                <ProfileSection title="App settings">
                    <div className="app-page__profile-list-card app-page__profile-list-card--settings">
                        <form className="app-page__profile-form" onSubmit={handleSettingsSubmit}>
                            <div className="app-page__profile-setting-row">
                                <div className="app-page__profile-list-item-main">
                                    <span className="app-page__profile-list-icon-wrap" aria-hidden="true">
                                        <BellIcon className="app-page__profile-list-icon" />
                                    </span>
                                    <div>
                                        <p className="app-page__profile-list-label">Notifications</p>
                                        <p className="app-page__profile-card-subtitle">
                                            {settingsForm.notificationsEnabled ? 'Enabled' : 'Disabled'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className={`app-page__profile-toggle ${settingsForm.notificationsEnabled ? 'app-page__profile-toggle--on' : ''
                                        }`}
                                    type="button"
                                    role="switch"
                                    aria-checked={settingsForm.notificationsEnabled}
                                    disabled={isSavingSettings}
                                    onClick={() =>
                                        setSettingsForm((current) => ({
                                            ...current,
                                            notificationsEnabled: !current.notificationsEnabled,
                                        }))
                                    }
                                >
                                    <span className="app-page__profile-toggle-knob" />
                                </button>
                            </div>

                            <label className="app-page__profile-setting-row app-page__profile-setting-row--field">
                                <span className="app-page__profile-list-item-main">
                                    <span className="app-page__profile-list-icon-wrap" aria-hidden="true">
                                        <RulerIcon className="app-page__profile-list-icon" />
                                    </span>
                                    <span>
                                        <span className="app-page__profile-list-label">Measurement</span>
                                        <span className="app-page__profile-card-subtitle">
                                            {measurementLabel(settingsForm.measurementSystem)}
                                        </span>
                                    </span>
                                </span>
                                <select
                                    className="app-page__profile-input"
                                    value={settingsForm.measurementSystem}
                                    onChange={(event) =>
                                        setSettingsForm((current) => ({
                                            ...current,
                                            measurementSystem: event.target.value as SettingsFormState['measurementSystem'],
                                        }))
                                    }
                                    disabled={isSavingSettings}
                                >
                                    <option value="metric">Metric</option>
                                    <option value="imperial">Imperial</option>
                                </select>
                            </label>

                            <label className="app-page__profile-setting-row app-page__profile-setting-row--field">
                                <span className="app-page__profile-list-item-main">
                                    <span className="app-page__profile-list-icon-wrap" aria-hidden="true">
                                        <GlobeIcon className="app-page__profile-list-icon" />
                                    </span>
                                    <span>
                                        <span className="app-page__profile-list-label">Currency</span>
                                        <span className="app-page__profile-card-subtitle">{settingsForm.currencyCode}</span>
                                    </span>
                                </span>
                                <select
                                    className="app-page__profile-input"
                                    value={settingsForm.currencyCode}
                                    onChange={() =>
                                        setSettingsForm((current) => ({
                                            ...current,
                                            currencyCode: 'KZT',
                                        }))
                                    }
                                    disabled={isSavingSettings}
                                >
                                    <option value="KZT">KZT</option>
                                </select>
                            </label>

                            <div className="app-page__profile-form-actions">
                                {settingsSuccess ? (
                                    <p className="app-page__profile-feedback app-page__profile-feedback--success">
                                        {settingsSuccess}
                                    </p>
                                ) : null}
                                <button
                                    className="app-page__profile-pill-button app-page__profile-pill-button--primary"
                                    type="submit"
                                    disabled={isSavingSettings}
                                >
                                    {isSavingSettings ? 'Saving...' : 'Save settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </ProfileSection>
            </div>
        </section>
    )
}

function SettingsHeader() {
    return (
        <header className="app-page__profile-header">
            <Link className="app-page__profile-back" to={ROUTES.app.profile} aria-label="Back to profile">
                <ArrowLeftIcon className="app-page__profile-back-icon" />
            </Link>
            <h1 className="app-page__profile-heading">Settings</h1>
            <span className="app-page__profile-header-spacer" aria-hidden="true" />
        </header>
    )
}

function ProfileSection({
    title,
    children,
}: {
    title: string
    children: ReactNode
}) {
    return (
        <section className="app-page__profile-section">
            <h2 className="app-page__profile-section-title">{title}</h2>
            {children}
        </section>
    )
}
