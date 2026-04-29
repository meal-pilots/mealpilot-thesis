import { Link, Outlet } from 'react-router-dom'
import { ROUTES } from '../router/paths'
import './AuthLayout.css'

function BackArrowIcon() {
    return (
        <svg
            aria-hidden="true"
            className="auth-layout__icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M15 6L9 12L15 18"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function AuthLayout() {
    return (
        <div className="auth-layout">
            <header className="auth-layout__header">
                <div className="auth-layout__header-inner">
                    <Link
                        to={ROUTES.welcome}
                        className="auth-layout__back-link"
                        aria-label="Back to welcome page"
                    >
                        <BackArrowIcon />
                    </Link>

                    <Link to={ROUTES.welcome} className="auth-layout__brand">
                        The Editorial Kitchen
                    </Link>
                </div>
            </header>

            <main className="auth-layout__main">
                <div className="auth-layout__canvas">
                    <div className="auth-layout__texture auth-layout__texture--top" aria-hidden="true" />
                    <div
                        className="auth-layout__texture auth-layout__texture--bottom"
                        aria-hidden="true"
                    />
                    <div className="auth-layout__content">
                        <Outlet />
                    </div>
                </div>
            </main>

            <div className="auth-layout__ghost-image" aria-hidden="true" />
        </div>
    )
}