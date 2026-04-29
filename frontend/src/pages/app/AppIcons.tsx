type IconProps = {
    className?: string
}

export function HomeIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M4 10.5L12 4L20 10.5V20H14V14H10V20H4V10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function RecipesIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M6 4H18V20H6V4Z" stroke="currentColor" strokeWidth="2" />
            <path d="M9 8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M9 16H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function PlanIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M8 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 15H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function PantryIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M7 7H17V20H7V7Z" stroke="currentColor" strokeWidth="2" />
            <path d="M9 4H15V7H9V4Z" stroke="currentColor" strokeWidth="2" />
            <path d="M10 11H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function ProfileIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
            <path d="M5 20C5.9 16.86 8.64 15 12 15C15.36 15 18.1 16.86 19 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function SearchIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function SparkIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M12 3L13.8 8.2L19 10L13.8 11.8L12 17L10.2 11.8L5 10L10.2 8.2L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    )
}

export function ChevronRightIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function HeartIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M12 20C12 20 4 15.2 4 9.6C4 7.06 6.01 5 8.5 5C10.08 5 11.47 5.86 12 7.14C12.53 5.86 13.92 5 15.5 5C17.99 5 20 7.06 20 9.6C20 15.2 12 20 12 20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    )
}

export function ClockIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8V12L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function FireIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M13.2 4C13.2 7.4 9.4 8.3 9.4 11.2C9.4 13.1 10.88 14.6 12.7 14.6C14.52 14.6 16 13.1 16 11.2C16 9.9 15.53 8.96 14.6 7.8C16.96 8.43 19 10.69 19 13.8C19 17.22 16.24 20 12.84 20C9.18 20 6 17.1 6 13.2C6 8.9 9.04 6.2 13.2 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function BowlIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M5 12C5 16.42 8.13 20 12 20C15.87 20 19 16.42 19 12H5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M8 8C8 6.34 9.34 5 11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 8C12 6.34 13.34 5 15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function ArrowLeftIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function EditIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M4 20H8L18 10C18.8 9.2 18.8 7.9 18 7.1L16.9 6C16.1 5.2 14.8 5.2 14 6L4 16V20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M13 7L17 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function PersonIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
            <path d="M6 19C6.95 16.2 9.15 14.75 12 14.75C14.85 14.75 17.05 16.2 18 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function LockIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <rect x="6" y="10" width="12" height="10" rx="2.5" stroke="currentColor" strokeWidth="2" />
            <path d="M9 10V8.5C9 6.57 10.57 5 12.5 5C14.43 5 16 6.57 16 8.5V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function BellIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M7 10.2C7 7.33 9.24 5 12 5C14.76 5 17 7.33 17 10.2V13.4L18.8 16.2H5.2L7 13.4V10.2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M10.2 18C10.57 18.85 11.22 19.25 12 19.25C12.78 19.25 13.43 18.85 13.8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function AddUserIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
            <path d="M4.5 18C5.22 15.86 6.92 14.75 9 14.75C11.08 14.75 12.78 15.86 13.5 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M17 8V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 11H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function RestaurantIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M7 4V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5 4V8C5 9.1 5.9 10 7 10C8.1 10 9 9.1 9 8V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 10V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 4V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 4C17.21 4 19 5.79 19 8V10H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function WalletIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M5 8.5H17.5C18.88 8.5 20 9.62 20 11V17C20 18.38 18.88 19.5 17.5 19.5H6.5C5.12 19.5 4 18.38 4 17V10C4 9.17 4.67 8.5 5.5 8.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M15 13.5H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 8.5V7.5C6 6.67 6.67 6 7.5 6H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="15.8" cy="13.5" r="1" fill="currentColor" />
        </svg>
    )
}

export function SettingsSparkIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M12 6.2L12.9 8.8L15.5 9.7L12.9 10.6L12 13.2L11.1 10.6L8.5 9.7L11.1 8.8L12 6.2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M18.2 4L18.6 5.2L19.8 5.6L18.6 6L18.2 7.2L17.8 6L16.6 5.6L17.8 5.2L18.2 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="12" cy="15.5" r="4.2" stroke="currentColor" strokeWidth="2" />
            <path d="M12 13.6V15.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 18.2H12.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
    )
}

export function SpiceIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M13.2 5C13.2 7.75 10 8.5 10 10.9C10 12.45 11.22 13.7 12.72 13.7C14.22 13.7 15.44 12.45 15.44 10.9C15.44 9.84 15.05 9.05 14.3 8.1C16.25 8.62 17.95 10.48 17.95 13.02C17.95 15.81 15.69 18.08 12.9 18.08C9.89 18.08 7.28 15.69 7.28 12.48C7.28 8.95 9.79 6.72 13.2 5Z" fill="currentColor" />
        </svg>
    )
}

export function GlobeIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 4C13.9 6.02 14.98 8.86 15.05 12C14.98 15.14 13.9 17.98 12 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 4C10.1 6.02 9.02 8.86 8.95 12C9.02 15.14 10.1 17.98 12 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function MoonIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M16.8 5.4C16.15 5.16 15.44 5.03 14.7 5.03C11.3 5.03 8.55 7.78 8.55 11.18C8.55 13.98 10.43 16.33 13 17.04C11.98 17.54 10.83 17.82 9.62 17.82C5.42 17.82 2 14.4 2 10.2C2 6 5.42 2.58 9.62 2.58C12.79 2.58 15.51 4.53 16.8 7.3C17.03 6.65 17.16 5.94 17.16 5.2C17.16 5.27 17.04 5.31 16.8 5.4Z" fill="currentColor" />
        </svg>
    )
}

export function RulerIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M4 8H20V16H4V8Z" stroke="currentColor" strokeWidth="2" />
            <path d="M7 8V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 8V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M13 8V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 8V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function LogoutIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M10 5H6C4.9 5 4 5.9 4 7V17C4 18.1 4.9 19 6 19H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 8L18 12L14 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}
export function DotsVerticalIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
        </svg>
    )
}

export function PriceTagIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M4 8.5V5H11L20 14L15 19L6 10V8.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        </svg>
    )
}

export function TrendUpBarsIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M5 18V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 18V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 18V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5 9.5L10 6.5L14.5 8.5L20 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function TrendDownIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M5 8L10 13L14 10L19 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 10V15H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function ShoppingCartIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="10" cy="19" r="1.6" fill="currentColor" />
            <circle cx="17" cy="19" r="1.6" fill="currentColor" />
            <path d="M3.5 5H6L8.2 14H18.2L20.5 8H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function SunIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
            <path d="M12 3V5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 18.5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M3 12H5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M18.5 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5.6 5.6L7.3 7.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16.7 16.7L18.4 18.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16.7 7.3L18.4 5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5.6 18.4L7.3 16.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function MoonSmallIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M16.65 4.8C15.92 4.53 15.13 4.39 14.3 4.39C10.45 4.39 7.32 7.52 7.32 11.37C7.32 14.53 9.45 17.2 12.36 18C11.21 18.56 9.92 18.87 8.57 18.87C3.81 18.87 0 15.06 0 10.3C0 5.54 3.81 1.73 8.57 1.73C12.17 1.73 15.23 3.94 16.65 7.09C16.91 6.36 17.06 5.57 17.06 4.75C17.06 4.78 16.92 4.79 16.65 4.8Z" transform="translate(3.5 1.5)" />
        </svg>
    )
}

export function SwapArrowsIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M7 7H18L15 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 17H6L9 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function CoinStackIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <ellipse cx="12" cy="6" rx="5" ry="2.5" stroke="currentColor" strokeWidth="2" />
            <path d="M7 6V10C7 11.38 9.24 12.5 12 12.5C14.76 12.5 17 11.38 17 10V6" stroke="currentColor" strokeWidth="2" />
            <path d="M7 10V14C7 15.38 9.24 16.5 12 16.5C14.76 16.5 17 15.38 17 14V10" stroke="currentColor" strokeWidth="2" />
            <path d="M7 14V18C7 19.38 9.24 20.5 12 20.5C14.76 20.5 17 19.38 17 18V14" stroke="currentColor" strokeWidth="2" />
        </svg>
    )
}

export function ProteinBoltIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M13 2L6 13H11L10 22L18 10H13V2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    )
}

export function LeafCircleIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M15.5 8.5C12.4 8.3 9.9 10 9.2 12.8C11.8 13.5 14.2 12.7 15.5 8.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M10 15.5C10.7 14.2 11.6 13.2 13 12.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function MagicWandIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M5 19L19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 4L15.8 6.2L18 7L15.8 7.8L15 10L14.2 7.8L12 7L14.2 6.2L15 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M6 12L6.6 13.4L8 14L6.6 14.6L6 16L5.4 14.6L4 14L5.4 13.4L6 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
    )
}

export function HeartPulseIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M12 20C12 20 4 15.2 4 9.6C4 7.06 6.01 5 8.5 5C10.08 5 11.47 5.86 12 7.14C12.53 5.86 13.92 5 15.5 5C17.99 5 20 7.06 20 9.6C20 15.2 12 20 12 20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M8 12H10.2L11.5 9.5L13.4 14.2L14.8 12H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function MenuIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M5 7H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5 17H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function PlusIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function LeafIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M18 6C12 6.2 8.8 9.4 8.2 14.8C13.3 15.8 17.2 13.6 18 6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M9.5 16.5C10.5 14.9 12 13.4 14.2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function CheckBadgeIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M8.5 12.2L10.8 14.5L15.6 9.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function ShieldCheckIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M12 4L18 6.5V11.5C18 15.4 15.48 18.86 12 20C8.52 18.86 6 15.4 6 11.5V6.5L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M9.4 12.2L11.2 14L14.8 10.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function BrainIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M9.5 7.5C9.5 5.57 11.07 4 13 4C14.93 4 16.5 5.57 16.5 7.5C18.16 7.74 19.4 9.16 19.4 10.9C19.4 12.57 18.24 13.96 16.66 14.26C16.54 16.3 14.86 17.9 12.8 17.9H11.8C9.71 17.9 8 16.19 8 14.1V7.9C8 6.85 8.85 6 9.9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 10.2C6.57 10.34 5.46 11.54 5.46 13.01C5.46 14.58 6.73 15.85 8.3 15.85H8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M11.8 7.6V13.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M11.8 10.6C12.8 10.6 13.6 9.8 13.6 8.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M11.8 12.4C13.05 12.4 14.06 13.41 14.06 14.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

export function StarBadgeIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M12 3.8L14.1 8.05L18.8 8.73L15.4 12.05L16.2 16.73L12 14.5L7.8 16.73L8.6 12.05L5.2 8.73L9.9 8.05L12 3.8Z" />
        </svg>
    )
}

export function RegenerateIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M21.1679 8C19.6247 4.46819 16.1006 2 11.9999 2C6.81459 2 2.55104 5.94668 2.04932 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 8H21.4C21.7314 8 22 7.73137 22 7.4V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2.88146 16C4.42458 19.5318 7.94874 22 12.0494 22C17.2347 22 21.4983 18.0533 22 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7.04932 16H2.64932C2.31795 16 2.04932 16.2686 2.04932 16.6V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}