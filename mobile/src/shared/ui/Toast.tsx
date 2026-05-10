import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { usePalette } from '@shared/lib/use-palette'
import { Icon, type IconName } from '@shared/ui/Icon'
import { Text } from '@shared/ui/Text'
import { radii, shadows, spacing, type Palette } from '@shared/ui/theme'

type ToastVariant = 'info' | 'success' | 'warning' | 'error'

type Toast = {
    id: string
    message: string
    variant: ToastVariant
    duration?: number
}

type ToastContextValue = {
    show: (message: string, variant?: ToastVariant, duration?: number) => void
    success: (msg: string) => void
    error: (msg: string) => void
    warning: (msg: string) => void
    info: (msg: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_ICONS: Record<ToastVariant, IconName> = {
    info: 'info',
    success: 'checkCircle',
    warning: 'alertCircle',
    error: 'alertCircle',
}

function variantStyles(palette: Palette): Record<ToastVariant, { bg: string; fg: string; border: string }> {
    return {
        info: { bg: palette.infoBg, fg: palette.info, border: palette.info },
        success: { bg: palette.successBg, fg: palette.success, border: palette.success },
        warning: { bg: palette.warningBg, fg: palette.warning, border: palette.warning },
        error: { bg: palette.dangerBg, fg: palette.danger, border: palette.danger },
    }
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const show = useCallback(
        (message: string, variant: ToastVariant = 'info', duration = 3000) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
            setToasts((prev) => [...prev, { id, message, variant, duration }])
            if (duration > 0) {
                setTimeout(() => dismiss(id), duration)
            }
        },
        [dismiss],
    )

    const value: ToastContextValue = {
        show,
        success: (msg) => show(msg, 'success'),
        error: (msg) => show(msg, 'error', 5000),
        warning: (msg) => show(msg, 'warning'),
        info: (msg) => show(msg, 'info'),
    }

    return (
        <ToastContext.Provider value={value}>
            {children}
            <SafeAreaView
                pointerEvents="box-none"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }}
            >
                <View style={{ width: '92%', gap: spacing.sm, paddingTop: spacing.sm }} pointerEvents="box-none">
                    {toasts.map((t) => (
                        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
                    ))}
                </View>
            </SafeAreaView>
        </ToastContext.Provider>
    )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const palette = usePalette()
    const opacity = useRef(new Animated.Value(0)).current
    const translateY = useRef(new Animated.Value(-20)).current
    const v = variantStyles(palette)[toast.variant]
    const iconName = VARIANT_ICONS[toast.variant]

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]).start()
    }, [opacity, translateY])

    return (
        <Animated.View
            style={[
                {
                    backgroundColor: v.bg,
                    borderLeftWidth: 4,
                    borderLeftColor: v.border,
                    borderRadius: radii.md,
                    padding: spacing.md,
                    opacity,
                    transform: [{ translateY }],
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                },
                shadows.raised,
            ]}
        >
            <Pressable
                onPress={onDismiss}
                accessibilityRole="alert"
                accessibilityLabel={toast.message}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}
            >
                <Icon name={iconName} size={20} color={v.fg} />
                <Text variant="bodyStrong" style={{ color: v.fg, flex: 1 }}>
                    {toast.message}
                </Text>
            </Pressable>
        </Animated.View>
    )
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) {
        return {
            show: () => {},
            success: () => {},
            error: () => {},
            warning: () => {},
            info: () => {},
        }
    }
    return ctx
}
