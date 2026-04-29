import { Text, View, type StyleProp, type ViewStyle } from 'react-native'

type SectionProps = {
    title?: string
    subtitle?: string
    children: React.ReactNode
    style?: StyleProp<ViewStyle>
    actionRight?: React.ReactNode
}

export function Section({ title, subtitle, children, style, actionRight }: SectionProps) {
    return (
        <View style={[{ gap: 12 }, style]}>
            {title || actionRight ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                        {title ? (
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{title}</Text>
                        ) : null}
                        {subtitle ? (
                            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{subtitle}</Text>
                        ) : null}
                    </View>
                    {actionRight}
                </View>
            ) : null}
            {children}
        </View>
    )
}
