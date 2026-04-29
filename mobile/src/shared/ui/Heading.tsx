import { Text, type TextStyle } from 'react-native'

type HeadingProps = {
    children: React.ReactNode
    level?: 1 | 2 | 3
    style?: TextStyle
}

const styles: Record<NonNullable<HeadingProps['level']>, TextStyle> = {
    1: { fontSize: 28, fontWeight: '700', color: '#111827' },
    2: { fontSize: 22, fontWeight: '700', color: '#111827' },
    3: { fontSize: 17, fontWeight: '600', color: '#111827' },
}

export function Heading({ children, level = 1, style }: HeadingProps) {
    return <Text style={[styles[level], style]}>{children}</Text>
}
