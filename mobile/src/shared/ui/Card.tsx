import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'

type CardProps = {
    children: React.ReactNode
    onPress?: () => void
    style?: StyleProp<ViewStyle>
}

export function Card({ children, onPress, style }: CardProps) {
    const baseStyle: ViewStyle = {
        backgroundColor: '#FFFBF2',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F0E2C5',
    }
    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [baseStyle, { opacity: pressed ? 0.85 : 1 }, style]}
            >
                {children}
            </Pressable>
        )
    }
    return <View style={[baseStyle, style]}>{children}</View>
}
