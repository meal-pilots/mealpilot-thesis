import { ReactNode } from 'react'
import { ScrollView, View, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { usePalette } from '@shared/lib/use-palette'
import { spacing } from '@shared/ui/theme'

type ScreenProps = {
    children: ReactNode
    scroll?: boolean
    style?: ViewStyle
    contentContainerStyle?: ViewStyle
    edges?: ('top' | 'bottom' | 'left' | 'right')[]
    /** Disable default padding when you control layout end-to-end. */
    bare?: boolean
}

export function Screen({
    children,
    scroll = false,
    style,
    contentContainerStyle,
    edges,
    bare = false,
}: ScreenProps) {
    const palette = usePalette()
    const padding = bare ? 0 : spacing.xxl
    const gap = bare ? 0 : spacing.lg

    const inner = scroll ? (
        <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[{ padding, gap }, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
        >
            {children}
        </ScrollView>
    ) : (
        <View style={[{ flex: 1, padding, gap }, contentContainerStyle]}>{children}</View>
    )

    return (
        <SafeAreaView edges={edges ?? ['top', 'bottom']} style={[{ flex: 1, backgroundColor: palette.canvas }, style]}>
            {inner}
        </SafeAreaView>
    )
}
