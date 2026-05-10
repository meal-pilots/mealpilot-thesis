import { useColorScheme } from 'react-native'

import { darkPalette, lightPalette, type ColorScheme, type Palette } from '@shared/ui/theme'

export function usePalette(): Palette {
    const scheme = useColorScheme()
    return (scheme === 'dark' ? darkPalette : lightPalette) as Palette
}

export function useScheme(): ColorScheme {
    const scheme = useColorScheme()
    return scheme === 'dark' ? 'dark' : 'light'
}
