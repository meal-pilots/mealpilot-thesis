import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

const isMobile = Platform.OS === 'ios' || Platform.OS === 'android'

function safe<T>(fn: () => Promise<T>): void {
    if (!isMobile) return
    fn().catch(() => {
        // haptics are best-effort; never throw
    })
}

export const haptic = {
    light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
    medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
    heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
    soft: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
    rigid: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
    success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
    warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
    error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
    selection: () => safe(() => Haptics.selectionAsync()),
}
