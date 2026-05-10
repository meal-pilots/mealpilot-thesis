import { View } from 'react-native'

import { tagLabel } from '@shared/lib/formatters'
import { usePalette } from '@shared/lib/use-palette'
import { Text } from '@shared/ui/Text'
import { radii, spacing } from '@shared/ui/theme'

type TagTone = 'accent' | 'neutral' | 'success' | 'danger' | 'info'

type TagProps = {
    value?: string
    label?: string
    tone?: TagTone
}

export function Tag({ value, label, tone = 'accent' }: TagProps) {
    const palette = usePalette()
    const text = label ?? tagLabel(value ?? '')
    const palettes: Record<TagTone, { bg: string; fg: string }> = {
        accent: { bg: palette.accentSoft, fg: palette.accentText },
        neutral: { bg: palette.canvasMuted, fg: palette.textSecondary },
        success: { bg: palette.successBg, fg: palette.success },
        danger: { bg: palette.dangerBg, fg: palette.danger },
        info: { bg: palette.infoBg, fg: palette.info },
    }
    const tones = palettes[tone]
    return (
        <View
            style={{
                backgroundColor: tones.bg,
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: radii.pill,
            }}
        >
            <Text variant="caption" style={{ color: tones.fg, fontWeight: '700' }}>
                {text}
            </Text>
        </View>
    )
}

export function TagList({ items, tone }: { items: string[]; tone?: TagTone }) {
    if (!items?.length) return null
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {items.map((item) => (
                <Tag key={item} value={item} tone={tone} />
            ))}
        </View>
    )
}
