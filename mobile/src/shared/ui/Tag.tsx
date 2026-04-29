import { Text, View } from 'react-native'

import { tagLabel } from '@shared/lib/formatters'

export function Tag({ value, label }: { value?: string; label?: string }) {
    const text = label ?? tagLabel(value ?? '')
    return (
        <View
            style={{
                backgroundColor: '#FFE4B5',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
            }}
        >
            <Text style={{ color: '#7A4A0A', fontSize: 12, fontWeight: '600' }}>{text}</Text>
        </View>
    )
}

export function TagList({ items }: { items: string[] }) {
    if (!items?.length) return null
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {items.map((item) => (
                <Tag key={item} value={item} />
            ))}
        </View>
    )
}
