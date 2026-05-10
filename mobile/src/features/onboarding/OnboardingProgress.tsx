import { View } from 'react-native'

import { usePalette } from '@shared/lib/use-palette'

const TOTAL_STEPS = 6

export function OnboardingProgress({ step }: { step: number }) {
    const palette = usePalette()
    return (
        <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 4 }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View
                    key={i}
                    style={{
                        width: 22,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: i <= step ? palette.accent : palette.border,
                    }}
                />
            ))}
        </View>
    )
}
