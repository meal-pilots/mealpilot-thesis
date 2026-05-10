import { type TextProps, type TextStyle } from 'react-native'

import { Text } from '@shared/ui/Text'

type HeadingProps = Omit<TextProps, 'maxFontSizeMultiplier' | 'style'> & {
    children: React.ReactNode
    level?: 1 | 2 | 3
    style?: TextStyle | TextStyle[]
}

const levelToVariant = {
    1: 'h1',
    2: 'h2',
    3: 'h3',
} as const

export function Heading({ children, level = 1, style, ...rest }: HeadingProps) {
    return (
        <Text variant={levelToVariant[level]} {...rest} style={style}>
            {children}
        </Text>
    )
}
