import { ReactNode } from 'react'
import { ScrollView, View, ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type ScreenProps = {
    children: ReactNode
    scroll?: boolean
    style?: ViewStyle
    contentContainerStyle?: ViewStyle
    edges?: Array<'top' | 'bottom' | 'left' | 'right'>
}

export function Screen({ children, scroll = false, style, contentContainerStyle, edges }: ScreenProps) {
    const inner = scroll ? (
        <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[{ padding: 24, gap: 16 }, contentContainerStyle]}
        >
            {children}
        </ScrollView>
    ) : (
        <View style={[{ flex: 1, padding: 24, gap: 16 }, contentContainerStyle]}>{children}</View>
    )

    return (
        <SafeAreaView edges={edges ?? ['top', 'bottom']} style={[{ flex: 1, backgroundColor: '#FFF7E6' }, style]}>
            {inner}
        </SafeAreaView>
    )
}
