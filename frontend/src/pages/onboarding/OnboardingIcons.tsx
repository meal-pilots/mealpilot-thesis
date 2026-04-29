import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
    filled?: boolean
}

function BaseIcon({ children, ...props }: IconProps & { children: React.ReactNode }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            {children}
        </svg>
    )
}

export function PersonIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M12 12C14.4853 12 16.5 9.98528 16.5 7.5C16.5 5.01472 14.4853 3 12 3C9.51472 3 7.5 5.01472 7.5 7.5C7.5 9.98528 9.51472 12 12 12Z" fill="currentColor" />
            <path d="M4.5 20.25C4.5 16.7982 7.29822 14 10.75 14H13.25C16.7018 14 19.5 16.7982 19.5 20.25V21H4.5V20.25Z" fill="currentColor" />
        </BaseIcon>
    )
}

export function GroupIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M8 11C9.65685 11 11 9.65685 11 8C11 6.34315 9.65685 5 8 5C6.34315 5 5 6.34315 5 8C5 9.65685 6.34315 11 8 11Z" fill="currentColor" />
            <path d="M16.5 10.5C17.8807 10.5 19 9.38071 19 8C19 6.61929 17.8807 5.5 16.5 5.5C15.1193 5.5 14 6.61929 14 8C14 9.38071 15.1193 10.5 16.5 10.5Z" fill="currentColor" />
            <path d="M3.5 19.5C3.5 16.7386 5.73858 14.5 8.5 14.5H9.5C12.2614 14.5 14.5 16.7386 14.5 19.5V20H3.5V19.5Z" fill="currentColor" />
            <path d="M14 20V19.4C14 17.3827 15.6102 15.7448 17.6164 15.7006C19.6847 15.6549 21.375 17.3174 21.375 19.375V20H14Z" fill="currentColor" opacity="0.82" />
        </BaseIcon>
    )
}

export function FamilyIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M8.25 10.5C9.90685 10.5 11.25 9.15685 11.25 7.5C11.25 5.84315 9.90685 4.5 8.25 4.5C6.59315 4.5 5.25 5.84315 5.25 7.5C5.25 9.15685 6.59315 10.5 8.25 10.5Z" fill="currentColor" />
            <path d="M15.75 10.5C17.4069 10.5 18.75 9.15685 18.75 7.5C18.75 5.84315 17.4069 4.5 15.75 4.5C14.0931 4.5 12.75 5.84315 12.75 7.5C12.75 9.15685 14.0931 10.5 15.75 10.5Z" fill="currentColor" />
            <path d="M12 14.5C13.2426 14.5 14.25 13.4926 14.25 12.25C14.25 11.0074 13.2426 10 12 10C10.7574 10 9.75 11.0074 9.75 12.25C9.75 13.4926 10.7574 14.5 12 14.5Z" fill="currentColor" />
            <path d="M3.75 20C3.75 17.3076 5.93261 15.125 8.625 15.125H8.875C10.1841 15.125 11.3726 15.6423 12.25 16.4838C13.1274 15.6423 14.3159 15.125 15.625 15.125H15.875C18.5674 15.125 20.75 17.3076 20.75 20V20.5H3.75V20Z" fill="currentColor" />
        </BaseIcon>
    )
}

export function GroupsIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M6.5 10C7.88071 10 9 8.88071 9 7.5C9 6.11929 7.88071 5 6.5 5C5.11929 5 4 6.11929 4 7.5C4 8.88071 5.11929 10 6.5 10Z" fill="currentColor" />
            <path d="M17.5 10C18.8807 10 20 8.88071 20 7.5C20 6.11929 18.8807 5 17.5 5C16.1193 5 15 6.11929 15 7.5C15 8.88071 16.1193 10 17.5 10Z" fill="currentColor" />
            <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="currentColor" opacity="0.88" />
            <path d="M2.75 18.75C2.75 16.6789 4.42893 15 6.5 15H7.25C8.61673 15 9.8127 15.7315 10.4714 16.8234C10.165 17.4122 10 18.0809 10 18.75V19.5H2.75V18.75Z" fill="currentColor" />
            <path d="M14 19.5V18.75C14 16.6789 12.3211 15 10.25 15H13.75C15.8211 15 17.5 16.6789 17.5 18.75V19.5H14Z" fill="currentColor" opacity="0.88" />
            <path d="M14 19.5V18.75C14 18.0809 13.835 17.4122 13.5286 16.8234C14.1873 15.7315 15.3833 15 16.75 15H17.5C19.5711 15 21.25 16.6789 21.25 18.75V19.5H14Z" fill="currentColor" />
        </BaseIcon>
    )
}

export function CheckCircleIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.16" />
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8.5 12.2L10.8 14.5L15.8 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </BaseIcon>
    )
}

export function EditIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M4 16.75V20H7.25L17.4 9.85L14.15 6.6L4 16.75Z" fill="currentColor" opacity="0.9" />
            <path d="M18.35 8.9L15.1 5.65L16.35 4.4C16.9 3.85 17.8 3.85 18.35 4.4L19.6 5.65C20.15 6.2 20.15 7.1 19.6 7.65L18.35 8.9Z" fill="currentColor" />
        </BaseIcon>
    )
}

export function PlusIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M12 5V19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M5 12H19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </BaseIcon>
    )
}

export function HouseIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M4 10.75L12 4L20 10.75V20H14.5V14.25H9.5V20H4V10.75Z" fill="currentColor" />
        </BaseIcon>
    )
}

export function CalendarIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <rect x="4" y="6" width="16" height="14" rx="2.4" stroke="currentColor" strokeWidth="2" />
            <path d="M8 3.75V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 3.75V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 10H20" stroke="currentColor" strokeWidth="2" />
        </BaseIcon>
    )
}

export function ShieldIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M12 4L18 6.5V11C18 15.1 15.4 18.7 12 20C8.6 18.7 6 15.1 6 11V6.5L12 4Z" fill="currentColor" />
            <path d="M9.5 11.8L11.2 13.5L14.8 9.9" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </BaseIcon>
    )
}

export function AlertIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M12 4L20 18H4L12 4Z" fill="currentColor" />
            <path d="M12 9V13" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill="#FFFFFF" />
        </BaseIcon>
    )
}

export function LeafIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M18 5C11.5 5.2 7 8.8 7 14.25C7 17.2 9.2 19 11.8 19C16.1 19 19 15.5 19 10.8C19 8.9 18.6 7 18 5Z" fill="currentColor" />
            <path d="M7 18C9.4 14.7 11.7 12.7 16 10.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        </BaseIcon>
    )
}

export function DropletIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M12 3.75C12 3.75 6.75 9.32 6.75 13C6.75 16.45 9.55 19.25 13 19.25C16.45 19.25 19.25 16.45 19.25 13C19.25 9.32 14 3.75 14 3.75H12Z" fill="currentColor" />
            <path d="M10 13.5C10.2 12.1 11 10.9 12.15 9.95" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        </BaseIcon>
    )
}

export function GrainIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M12 4V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 7.5C10.3 6.6 8.5 6.65 7 7.8C8.1 9.45 9.85 10.15 12 10.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 10.2C13.7 9.3 15.5 9.35 17 10.5C15.9 12.15 14.15 12.85 12 12.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </BaseIcon>
    )
}

export function GridIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            {[6.5, 10.5, 14.5].map((x) =>
                [6.5, 10.5, 14.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="currentColor" />),
            )}
        </BaseIcon>
    )
}

export function StarCircleIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <circle cx="12" cy="12" r="9" fill="currentColor" />
            <path d="M12 7.2L13.2 9.7L16 10L14 11.8L14.55 14.5L12 13.1L9.45 14.5L10 11.8L8 10L10.8 9.7L12 7.2Z" fill="#FFFFFF" />
        </BaseIcon>
    )
}

export function SavingsIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M8 6.5H16.25C17.77 6.5 19 7.73 19 9.25C19 10.03 18.67 10.77 18.1 11.28L19.4 13.6V17.5C19.4 18.33 18.73 19 17.9 19H7.1C6.27 19 5.6 18.33 5.6 17.5V16L4.2 13.55C3.97 13.14 4.27 12.63 4.74 12.63H5.6V9.9C5.6 8.02 6.92 6.5 8.8 6.5H8Z" fill="currentColor" />
            <circle cx="15.5" cy="10" r="1.15" fill="#FFFFFF" />
            <path d="M9 12H14" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" />
        </BaseIcon>
    )
}

export function HeartPulseIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M4 12H7L9 8.75L11.2 14L13 11.3H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 20.25L5.9 14.4C3.85 12.43 3.85 9.22 5.9 7.25C7.95 5.28 11.25 5.28 13.3 7.25L14 7.92L14.7 7.25C16.75 5.28 20.05 5.28 22.1 7.25C24.15 9.22 24.15 12.43 22.1 14.4L16 20.25H12Z" fill="none" />
        </BaseIcon>
    )
}

export function RestaurantIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M7 4V10C7 11.1 6.1 12 5 12V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 4V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 4V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 4C18.2 6.6 18.2 9.9 16 12.5V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </BaseIcon>
    )
}

export function TimerIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M12 13L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M9 3H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </BaseIcon>
    )
}

export function FireIcon(props: IconProps) {
    return (
        <BaseIcon {...props}>
            <path d="M12 4.5C13.6 6.2 14.5 7.5 14.5 9.4C14.5 10.35 14.15 11.2 13.58 11.88C14.9 11.5 16 10.28 16 8.8C16 6.9 14.6 5.35 13.05 4C15.8 4.68 18 7.13 18 10.2C18 14.05 15.1 17 11.5 17C8.46 17 6 14.57 6 11.55C6 9.15 7.55 7.3 9.7 6.2C9.05 7.1 8.75 7.95 8.75 9C8.75 10.38 9.77 11.5 11.05 11.5C12.4 11.5 13.5 10.36 13.5 8.95C13.5 7.55 12.92 6.35 12 4.5Z" fill="currentColor" />
        </BaseIcon>
    )
}
