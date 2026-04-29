import { Text, View } from 'react-native'

type Stat = { label: string; value: string; emphasis?: boolean }

export function StatRow({ stats }: { stats: Stat[] }) {
    return (
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {stats.map((stat) => (
                <View
                    key={stat.label}
                    style={{
                        flexBasis: '47%',
                        flexGrow: 1,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: stat.emphasis ? '#1F2937' : '#FFE4B5',
                    }}
                >
                    <Text
                        style={{
                            fontSize: 12,
                            color: stat.emphasis ? '#FFE4B5' : '#7A4A0A',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                        }}
                    >
                        {stat.label}
                    </Text>
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: '700',
                            color: stat.emphasis ? '#FFFFFF' : '#111827',
                            marginTop: 4,
                        }}
                    >
                        {stat.value}
                    </Text>
                </View>
            ))}
        </View>
    )
}
