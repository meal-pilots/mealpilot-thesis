import { View, type StyleProp, type ViewStyle } from 'react-native'

import { Text } from '@shared/ui/Text'
import { spacing } from '@shared/ui/theme'

type SectionProps = {
    title?: string
    subtitle?: string
    children: React.ReactNode
    style?: StyleProp<ViewStyle>
    actionRight?: React.ReactNode
}

export function Section({ title, subtitle, children, style, actionRight }: SectionProps) {
    return (
        <View style={[{ gap: spacing.md }, style]}>
            {title || actionRight ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                        {title ? <Text variant="h3">{title}</Text> : null}
                        {subtitle ? (
                            <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                                {subtitle}
                            </Text>
                        ) : null}
                    </View>
                    {actionRight}
                </View>
            ) : null}
            {children}
        </View>
    )
}
