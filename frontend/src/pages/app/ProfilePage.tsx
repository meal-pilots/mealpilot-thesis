import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../app/router/paths'
import { authApi } from '../../features/auth/api/authApi'
import { profileApi, type ProfileSnapshot } from '../../features/profile/api/profileApi'
import { useAuth } from '../../shared/hooks/useAuth'
import { getApiErrorMessage } from '../../shared/lib/get-api-error-message'
import { AppLoader } from '../../shared/ui/AppLoader'
import {
    AddUserIcon,
    BellIcon,
    BowlIcon,
    ChevronRightIcon,
    ClockIcon,
    EditIcon,
    FireIcon,
    GlobeIcon,
    HeartIcon,
    LockIcon,
    LogoutIcon,
    PantryIcon,
    RulerIcon,
    SettingsSparkIcon,
    WalletIcon,
} from './AppIcons'
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

type IconComponent = ComponentType<{ className?: string }>

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

function startCase(value: string | undefined | null) {
    if (!value) {
        return 'Not set'
    }

    return value
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function formatBudget(amount: string | undefined) {
    if (!amount) {
        return 'Not set'
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

function getInitials(nameOrEmail: string | undefined | null) {
    const source = nameOrEmail?.trim() || '?'
    const parts = source.includes('@') ? source.split('@')[0].split(/[._-]/) : source.split(/\s+/)

    return parts
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
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

function memberCountLabel(count: number) {
    return `${count} ${count === 1 ? 'member' : 'members'}`
}

function spiceScore(value: string | undefined) {
    const normalized = value?.toLowerCase()

    if (normalized === 'high' || normalized === 'hot') {
        return 3
    }

    if (normalized === 'medium') {
        return 2
    }

    return normalized ? 1 : 0
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

export function ProfilePage() {
    const navigate = useNavigate()
    const profileEditorRef = useRef<HTMLElement | null>(null)
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

    const displayName = snapshot?.profile.full_name?.trim() || 'User'
    const initials = getInitials(displayName || snapshot?.profile.email)
    const activeGroupName = snapshot?.activeGroup?.name ?? snapshot?.group?.name ?? 'No active group'
    const groupType = snapshot?.group ? startCase(snapshot.group.group_type) : 'Household'
    const membersCount = snapshot?.members.length ?? 0
    const preferredCuisines = snapshot?.preferences?.preferred_cuisines?.length
        ? snapshot.preferences.preferred_cuisines.join(', ')
        : 'No cuisines selected'

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
            <section className="app-page app-page--profile">
                <div className="app-page__profile-list-card">
                    <h1 className="app-page__profile-heading">Profile</h1>
                    <p className="app-page__profile-card-subtitle">
                        {errorMessage || 'Unable to load your profile.'}
                    </p>
                </div>
            </section>
        )
    }

    return (
        <section className="app-page app-page--profile">
            <header className="app-page__profile-header">
                <span className="app-page__profile-header-spacer" aria-hidden="true" />
                <h1 className="app-page__profile-heading">Profile</h1>
                <span className="app-page__profile-header-spacer" aria-hidden="true" />
            </header>

            <div className="app-page__profile-hero">
                <div className="app-page__profile-avatar-wrap">
                    <div className="app-page__profile-avatar-shell">
                        {snapshot.profile.avatar_url ? (
                            <img
                                className="app-page__profile-avatar"
                                src={snapshot.profile.avatar_url}
                                alt=""
                            />
                        ) : (
                            <span className="app-page__profile-avatar-fallback">{initials}</span>
                        )}
                    </div>
                    <button
                        className="app-page__profile-avatar-edit"
                        type="button"
                        aria-label="Edit profile"
                        onClick={() => profileEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    >
                        <EditIcon className="app-page__profile-avatar-edit-icon" />
                    </button>
                </div>

                <div className="app-page__profile-identity">
                    <h2 className="app-page__profile-name">{displayName}</h2>
                    <p className="app-page__profile-email">{snapshot.profile.email}</p>
                </div>
            </div>

            {errorMessage ? (
                <div className="app-page__profile-alert" role="status">
                    {errorMessage}
                </div>
            ) : null}

            <div className="app-page__profile-sections">
                <ProfileSection title="Current group">
                    <div className="app-page__profile-household-card">
                        <div className="app-page__profile-household-top">
                            <div className="app-page__profile-list-item-main">
                                <span className="app-page__profile-list-icon-wrap" aria-hidden="true">
                                    <AddUserIcon className="app-page__profile-list-icon" />
                                </span>
                                <div>
                                    <h3 className="app-page__profile-card-title">{activeGroupName}</h3>
                                    <p className="app-page__profile-card-subtitle">
                                        {groupType} - {memberCountLabel(membersCount)}
                                    </p>
                                </div>
                            </div>
                            <MemberStack snapshot={snapshot} />
                        </div>
                        <p className="app-page__profile-card-subtitle app-page__profile-card-subtitle--members">
                            {memberSummary}
                        </p>
                    </div>
                </ProfileSection>

                <ProfileSection title="Menu">
                    <div className="app-page__profile-list-card">
                        <ProfileMenuLink
                            to={ROUTES.app.notifications}
                            icon={BellIcon}
                            label="Notifications"
                            hint="Notification center and reminders"
                        />
                        <ProfileMenuLink
                            to={ROUTES.app.pantry}
                            icon={PantryIcon}
                            label="Pantry"
                            hint="Use ingredients you already have"
                        />
                        <ProfileMenuLink
                            to={ROUTES.app.favorites}
                            icon={HeartIcon}
                            label="Favorite recipes"
                            hint="Saved meals and recipes"
                        />
                        <ProfileMenuLink
                            to={ROUTES.app.settings}
                            icon={SettingsSparkIcon}
                            label="Settings"
                            hint="Language, currency, notifications"
                        />
                    </div>
                </ProfileSection>

                <section ref={profileEditorRef} className="app-page__profile-section">
                    <h2 className="app-page__profile-section-title">Profile details</h2>
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

                            <label className="app-page__profile-setting-row app-page__profile-setting-row--field">
                                <span>
                                    <span className="app-page__profile-list-label">Avatar URL</span>
                                    <span className="app-page__profile-card-subtitle">Optional profile image</span>
                                </span>
                                <input
                                    className="app-page__profile-input"
                                    value={profileForm.avatarUrl}
                                    onChange={(event) =>
                                        setProfileForm((current) => ({ ...current, avatarUrl: event.target.value }))
                                    }
                                    disabled={isSavingProfile}
                                    placeholder="https://..."
                                />
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
                </section>

                <ProfileSection title="Preferences">
                    <div className="app-page__profile-pref-grid">
                        <PreferenceCard
                            icon={WalletIcon}
                            label="Budget"
                            value={formatBudget(snapshot.group?.budget_amount)}
                            badgeTone="sage"
                        >
                            <span className="app-page__profile-budget-bar" aria-hidden="true">
                                <span className="app-page__profile-budget-bar-fill" />
                            </span>
                        </PreferenceCard>

                        <PreferenceCard
                            icon={ClockIcon}
                            label="Cooking time"
                            value={
                                snapshot.preferences
                                    ? `${snapshot.preferences.max_cooking_time_minutes} min`
                                    : 'Not set'
                            }
                            badgeTone="warm"
                        />

                        <PreferenceCard
                            icon={FireIcon}
                            label="Spice tolerance"
                            value={snapshot.preferences ? startCase(snapshot.preferences.spice_tolerance) : 'Not set'}
                            badgeTone="soft-red"
                        >
                            <span className="app-page__profile-heat-scale" aria-hidden="true">
                                {[1, 2, 3].map((level) => (
                                    <FireIcon
                                        key={level}
                                        className={`app-page__profile-heat-icon ${
                                            level <= spiceScore(snapshot.preferences?.spice_tolerance)
                                                ? 'app-page__profile-heat-icon--active'
                                                : ''
                                        }`}
                                    />
                                ))}
                            </span>
                        </PreferenceCard>

                        <PreferenceCard icon={BowlIcon} label="Cuisines" value={preferredCuisines} badgeTone="sage" />
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
                                    className={`app-page__profile-toggle ${
                                        settingsForm.notificationsEnabled ? 'app-page__profile-toggle--on' : ''
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

                <ProfileSection title="Account">
                    <div className="app-page__profile-list-card">
                        <button
                            className="app-page__profile-list-item app-page__profile-list-item--danger"
                            type="button"
                            onClick={handleLogOut}
                            disabled={isLoggingOut || isDeletingAccount}
                        >
                            <span className="app-page__profile-list-item-main">
                                <span className="app-page__profile-list-icon-wrap app-page__profile-list-icon-wrap--danger" aria-hidden="true">
                                    <LogoutIcon className="app-page__profile-list-icon" />
                                </span>
                                <span>
                                    <span className="app-page__profile-list-label">
                                        {isLoggingOut ? 'Logging out...' : 'Log out'}
                                    </span>
                                    <span className="app-page__profile-card-subtitle">Clear this session</span>
                                </span>
                            </span>
                            <ChevronRightIcon className="app-page__profile-chevron" />
                        </button>
                    </div>

                    <form className="app-page__profile-danger-card" onSubmit={handleDeleteAccount}>
                        <div className="app-page__profile-list-item-main">
                            <span className="app-page__profile-list-icon-wrap app-page__profile-list-icon-wrap--danger" aria-hidden="true">
                                <LockIcon className="app-page__profile-list-icon" />
                            </span>
                            <div>
                                <h3 className="app-page__profile-card-title">Delete account</h3>
                                <p className="app-page__profile-card-subtitle">
                                    Deletion is irreversible and removes households, plans, pantry items, and saved data.
                                </p>
                            </div>
                        </div>

                        <label className="app-page__profile-delete-field">
                            <span className="app-page__profile-section-title">Current password</span>
                            <input
                                className="app-page__profile-input"
                                type="password"
                                autoComplete="current-password"
                                value={deletePassword}
                                onChange={(event) => setDeletePassword(event.target.value)}
                                disabled={isDeletingAccount}
                                placeholder="Enter your current password"
                            />
                        </label>

                        <button
                            className="app-page__profile-logout"
                            type="submit"
                            disabled={isDeletingAccount || !deletePassword.trim()}
                        >
                            <LockIcon className="app-page__profile-logout-icon" />
                            {isDeletingAccount ? 'Deleting account...' : 'Delete account'}
                        </button>
                    </form>
                </ProfileSection>

                <p className="app-page__profile-version">Meal Planner Web</p>
            </div>
        </section>
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

function ProfileMenuLink({
    to,
    icon: Icon,
    label,
    hint,
}: {
    to: string
    icon: IconComponent
    label: string
    hint: string
}) {
    return (
        <Link className="app-page__profile-list-item" to={to}>
            <span className="app-page__profile-list-item-main">
                <span className="app-page__profile-list-icon-wrap" aria-hidden="true">
                    <Icon className="app-page__profile-list-icon" />
                </span>
                <span>
                    <span className="app-page__profile-list-label">{label}</span>
                    <span className="app-page__profile-card-subtitle">{hint}</span>
                </span>
            </span>
            <ChevronRightIcon className="app-page__profile-chevron" />
        </Link>
    )
}

function PreferenceCard({
    icon: Icon,
    label,
    value,
    badgeTone,
    children,
}: {
    icon: IconComponent
    label: string
    value: string
    badgeTone: 'sage' | 'warm' | 'soft-red'
    children?: ReactNode
}) {
    return (
        <article className="app-page__profile-pref-card">
            <div className="app-page__profile-pref-main">
                <span className={`app-page__profile-pref-badge app-page__profile-pref-badge--${badgeTone}`} aria-hidden="true">
                    <Icon className="app-page__profile-pref-badge-icon" />
                </span>
                <div>
                    <h3 className="app-page__profile-card-title">{label}</h3>
                    <p className="app-page__profile-card-subtitle">{value}</p>
                </div>
            </div>
            {children ?? <ChevronRightIcon className="app-page__profile-pref-side-icon" />}
        </article>
    )
}

function MemberStack({ snapshot }: { snapshot: ProfileSnapshot }) {
    const previewMembers = snapshot.members.slice(0, 4)
    const extraCount = Math.max(snapshot.members.length - previewMembers.length, 0)

    if (!previewMembers.length) {
        return null
    }

    return (
        <div className="app-page__profile-member-stack" aria-label={memberCountLabel(snapshot.members.length)}>
            {previewMembers.map((member) => (
                <span key={member.id} className="app-page__profile-member-avatar">
                    {getInitials(member.display_name)}
                </span>
            ))}
            {extraCount > 0 ? <span className="app-page__profile-member-extra">+{extraCount}</span> : null}
        </div>
    )
}
