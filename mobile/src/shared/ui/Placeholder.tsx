import { Text } from 'react-native'

import { Heading } from './Heading'
import { Screen } from './Screen'

export function Placeholder({ title, description }: { title: string; description?: string }) {
    return (
        <Screen contentContainerStyle={{ justifyContent: 'center' }}>
            <Heading level={1}>{title}</Heading>
            {description ? (
                <Text style={{ fontSize: 16, color: '#4B5563', marginTop: 12 }}>{description}</Text>
            ) : null}
        </Screen>
    )
}
