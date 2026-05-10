import { View } from 'react-native'

import { usePalette } from '@shared/lib/use-palette'
import { Text } from '@shared/ui/Text'
import { radii, spacing } from '@shared/ui/theme'

type Stat = { label: string; value: string; emphasis?: boolean }

export function StatRow({ stats }: { stats: Stat[] }) {
    const palette = usePalette()
    return (
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
            {stats.map((stat) => {
                const bg = stat.emphasis ? palette.primary : palette.accentSoft
                const labelColor = stat.emphasis ? palette.accentSoft : palette.accentText
                const valueColor = stat.emphasis ? palette.onPrimary : palette.text
                return (
                    <View
                        key={stat.label}
                        style={{
                            flexBasis: '47%',
                            flexGrow: 1,
                            padding: spacing.md,
                            borderRadius: radii.lg,
                            backgroundColor: bg,
                        }}
                    >
                        <Text variant="overline" style={{ color: labelColor }}>
                            {stat.label}
                        </Text>
                        <Text variant="h3" style={{ color: valueColor, marginTop: spacing.xs }}>
                            {stat.value}
                        </Text>
                    </View>
                )
            })}
        </View>
    )
}
