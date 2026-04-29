import { Link } from 'react-router-dom'
import { ROUTES } from '../../app/router/paths'
import './WelcomePage.css'

const HERO_IMAGE_URL =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCf8Ce0LxkE6xLcE8sooielBnHgD2LaL3uffD4ek_Wi9WFaff_MjDQV4KcsNvZrz5IQto1yL5e4HxK7KgRBg6ur2N3gH7t3PQfOxXhl1-JAU_lhAPt9tZLjDmCyqnMNhurC9KYJLhvpB3Sg112ksq0rnxrKhwfk48lb3rHTTuPfFKiWuD1kXiCZ1-j9mTQXPVg3ndKIndPfQ8i6vUjkFDydIYBxYpR7JZ_G77p6SHkjeXAQuoCERTvH1cEYVBn2vrjxOlc2yeQwf5uf'

export function WelcomePage() {
    return (
        <main className="welcome-page">
            <div className="welcome-page__glow" aria-hidden="true" />

            <section className="welcome-page__content">
                <div className="welcome-page__hero-card">
                    <img
                        className="welcome-page__hero-image"
                        src={HERO_IMAGE_URL}
                        alt="Rustic kitchen table with fresh herbs and oil bottles"
                    />
                </div>

                <div className="welcome-page__copy">
                    <h1 className="welcome-page__title">The Editorial Kitchen</h1>

                    <p className="welcome-page__description">
                        Your household&apos;s intelligent recipe atelier. Curated by taste, budget,
                        and health.
                    </p>
                </div>

                <div className="welcome-page__actions">
                    <Link className="welcome-page__primary-button" to={ROUTES.auth.signUp}>
                        Begin Your Journey
                    </Link>

                    <Link className="welcome-page__secondary-link" to={ROUTES.auth.login}>
                        <span>Sign In</span>
                        <span aria-hidden="true" className="welcome-page__secondary-arrow">
                            →
                        </span>
                    </Link>
                </div>
            </section>
        </main>
    )
}