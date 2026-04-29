export function AppLoader({ message = 'Loading...' }: { message?: string }) {
    return (
        <div
            style={{
                minHeight: '100dvh',
                display: 'grid',
                placeItems: 'center',
                padding: '24px',
                background: '#f9f9f8',
                color: '#446347',
                fontFamily: 'Manrope, Inter, sans-serif',
                fontWeight: 700,
                letterSpacing: '-0.02em',
            }}
        >
            {message}
        </div>
    )
}