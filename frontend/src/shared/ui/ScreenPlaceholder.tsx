import { Link } from 'react-router-dom'

type ScreenPlaceholderProps = {
    section: string
    title: string
    description: string
    nextHref?: string
    nextLabel?: string
}

export function ScreenPlaceholder({
    section,
    title,
    description,
    nextHref,
    nextLabel,
}: ScreenPlaceholderProps) {
    return (
        <div
            style={{
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                background: '#f4f1ea',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 520,
                    background: '#fffdf9',
                    borderRadius: 24,
                    padding: 24,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }}
            >
                <span
                    style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: '#6b6b5d',
                    }}
                >
                    {section}
                </span>

                <h1
                    style={{
                        margin: 0,
                        fontSize: 28,
                        lineHeight: 1.2,
                        color: '#2d2d2a',
                    }}
                >
                    {title}
                </h1>

                <p
                    style={{
                        margin: 0,
                        fontSize: 16,
                        lineHeight: 1.6,
                        color: '#5c5c54',
                    }}
                >
                    {description}
                </p>

                {nextHref && nextLabel ? (
                    <Link
                        to={nextHref}
                        style={{
                            marginTop: 8,
                            minHeight: 48,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 14,
                            background: '#7a8b6f',
                            color: '#ffffff',
                            textDecoration: 'none',
                            fontWeight: 700,
                        }}
                    >
                        {nextLabel}
                    </Link>
                ) : null}
            </div>
        </div>
    )
}