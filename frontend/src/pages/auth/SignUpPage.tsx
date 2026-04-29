import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../app/router/paths'
import { useAuth } from '../../shared/hooks/useAuth'
import { getApiErrorMessage } from '../../shared/lib/get-api-error-message'
import './AuthPage.css'

function EyeOffIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none">
            <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path
                d="M10.58 10.58C10.21 10.95 10 11.46 10 12C10 13.1 10.9 14 12 14C12.54 14 13.05 13.79 13.42 13.42"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M9.88 5.09C10.57 4.86 11.28 4.75 12 4.75C16.5 4.75 20.18 9.02 21 12C20.63 13.35 19.55 15.06 17.92 16.43"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M6.11 6.1C3.97 7.55 2.56 9.92 2 12C2.82 14.98 6.5 19.25 11 19.25C12.28 19.25 13.49 18.9 14.56 18.31"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function EyeIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none">
            <path
                d="M2 12C2.82 9.02 6.5 4.75 11 4.75C15.5 4.75 19.18 9.02 20 12C19.18 14.98 15.5 19.25 11 19.25C6.5 19.25 2.82 14.98 2 12Z"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M11 14.75C12.5188 14.75 13.75 13.5188 13.75 12C13.75 10.4812 12.5188 9.25 11 9.25C9.48122 9.25 8.25 10.4812 8.25 12C8.25 13.5188 9.48122 14.75 11 14.75Z"
                stroke="currentColor"
                strokeWidth="2.2"
            />
        </svg>
    )
}

function GoogleIcon() {
    return (
        <svg aria-hidden="true" className="auth-social__icon" width="24" height="24" viewBox="0 0 24 24">
            <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.5 5.5 0 0 1-2.39 3.61v2.99h3.86c2.25-2.07 3.57-5.12 3.57-8.63Z"
            />
            <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.86-2.99c-1.07.72-2.44 1.14-4.09 1.14-3.14 0-5.8-2.12-6.75-4.97H1.26v3.13A11.99 11.99 0 0 0 12 24Z"
            />
            <path
                fill="#FBBC05"
                d="M5.25 14.28A7.2 7.2 0 0 1 4.86 12c0-.79.14-1.56.39-2.28V6.59H1.26A11.98 11.99 0 0 0 0 12c0 1.93.46 3.76 1.26 5.41l3.99-3.13Z"
            />
            <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.34.61 4.58 1.79l3.43-3.43C17.96 1.2 15.24 0 12 0A11.99 11.99 0 0 0 1.26 6.59l3.99 3.13C6.2 6.88 8.86 4.77 12 4.77Z"
            />
        </svg>
    )
}

export function SignUpPage() {
    const navigate = useNavigate()
    const { signUp } = useAuth()

    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setErrorMessage('')

        if (!fullName.trim()) {
            setErrorMessage('Please enter your full name.')
            return
        }

        if (!email.trim()) {
            setErrorMessage('Please enter your email address.')
            return
        }

        if (password.length < 8) {
            setErrorMessage('Password must be at least 8 characters long.')
            return
        }

        setIsSubmitting(true)

        try {
            await signUp({
                fullName,
                email,
                password,
                remember: true,
            })
            navigate(ROUTES.onboarding.modeSelection, { replace: true })
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error, 'Unable to create your account right now.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <section className="auth-page">
            <div className="auth-page__inner">
                <h1 className="auth-page__title">Create your account</h1>
                <p className="auth-page__subtitle">Join the curated culinary experience.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-form__stack">
                        <div className="auth-form__field">
                            <label className="auth-form__label" htmlFor="signup-name">
                                Full Name
                            </label>
                            <input
                                id="signup-name"
                                className="auth-form__input"
                                type="text"
                                placeholder="Enter your full name"
                                autoComplete="name"
                                value={fullName}
                                onChange={(event) => setFullName(event.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="auth-form__field">
                            <label className="auth-form__label" htmlFor="signup-email">
                                Email Address
                            </label>
                            <input
                                id="signup-email"
                                className="auth-form__input"
                                type="email"
                                placeholder="Enter your email address"
                                autoComplete="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="auth-form__field">
                            <label className="auth-form__label" htmlFor="signup-password">
                                Password
                            </label>
                            <div className="auth-form__control-wrap">
                                <input
                                    id="signup-password"
                                    className="auth-form__input auth-form__input--with-button"
                                    type={isPasswordVisible ? 'text' : 'password'}
                                    placeholder="Create a strong password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    className="auth-form__icon-button"
                                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                                    onClick={() => setIsPasswordVisible((value) => !value)}
                                    disabled={isSubmitting}
                                >
                                    {isPasswordVisible ? <EyeIcon /> : <EyeOffIcon />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}

                    <button className="auth-form__submit" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-social">
                    <div className="auth-social__divider">or continue with</div>

                    <div className="auth-social__list">
                        <button className="auth-social__button" type="button" disabled>
                            <GoogleIcon />
                            <span>Google</span>
                        </button>
                    </div>
                </div>

                <p className="auth-page__footer">
                    Already have an account?{' '}
                    <Link className="auth-page__text-link" to={ROUTES.auth.login}>
                        Log in here
                    </Link>
                </p>
            </div>
        </section>
    )
}