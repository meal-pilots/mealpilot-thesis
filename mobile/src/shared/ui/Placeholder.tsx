import { Heading } from '@shared/ui/Heading'
import { Screen } from '@shared/ui/Screen'
import { Text } from '@shared/ui/Text'
import { spacing } from '@shared/ui/theme'

export function Placeholder({ title, description }: { title: string; description?: string }) {
    return (
        <Screen contentContainerStyle={{ justifyContent: 'center' }}>
            <Heading level={1}>{title}</Heading>
            {description ? (
                <Text variant="body" tone="secondary" style={{ marginTop: spacing.md }}>
                    {description}
                </Text>
            ) : null}
        </Screen>
    )
}
