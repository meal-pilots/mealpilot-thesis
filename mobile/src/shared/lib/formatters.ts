export function formatCurrency(value: string | number | null | undefined, currency: string = 'KZT'): string {
    const n = typeof value === 'string' ? Number(value) : Number(value ?? 0)
    if (!Number.isFinite(n)) return '—'
    if (currency === 'KZT') {
        return `${Math.round(n).toLocaleString('ru-RU')} ₸`
    }
    return `${n.toLocaleString('ru-RU')} ${currency}`
}

export function formatMinutes(minutes: number | string | null | undefined): string {
    const n = typeof minutes === 'string' ? Number(minutes) : Number(minutes ?? 0)
    if (!Number.isFinite(n) || n <= 0) return '—'
    if (n < 60) return `${n} мин`
    const hours = Math.floor(n / 60)
    const rest = n % 60
    return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`
}

export function formatGrams(value: string | number | null | undefined): string {
    const n = typeof value === 'string' ? Number(value) : Number(value ?? 0)
    if (!Number.isFinite(n) || n <= 0) return '—'
    return `${Math.round(n)} г`
}

export function formatCalories(value: string | number | null | undefined): string {
    const n = typeof value === 'string' ? Number(value) : Number(value ?? 0)
    if (!Number.isFinite(n) || n <= 0) return '—'
    return `${Math.round(n)} ккал`
}

export function formatDate(value: string | Date | null | undefined): string {
    if (!value) return '—'
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

export function formatDateRange(start?: string | null, end?: string | null): string {
    if (!start && !end) return '—'
    if (!end) return formatDate(start ?? '')
    return `${formatDate(start)} — ${formatDate(end)}`
}

export function formatScore(value: string | number | null | undefined): string {
    const n = typeof value === 'string' ? Number(value) : Number(value ?? 0)
    if (!Number.isFinite(n)) return '—'
    return `${Math.round(n * 100)}%`
}

const MEAL_TYPE_LABELS_RU: Record<string, string> = {
    breakfast: 'Завтрак',
    lunch: 'Обед',
    dinner: 'Ужин',
    snack: 'Перекус',
}

export function mealTypeLabel(meal: string): string {
    return MEAL_TYPE_LABELS_RU[meal] ?? meal
}

const TAG_LABELS_RU: Record<string, string> = {
    high_protein: 'Высокий белок',
    low_carb: 'Мало углеводов',
    quick_meal: 'Быстрое',
    budget_friendly: 'Бюджетное',
    kid_friendly: 'Детям',
    healthy: 'Здоровое',
    traditional: 'Традиционное',
    weight_loss: 'Похудение',
    mass_gain: 'Набор массы',
}

export function tagLabel(key: string): string {
    return TAG_LABELS_RU[key] ?? key.replace(/_/g, ' ')
}
