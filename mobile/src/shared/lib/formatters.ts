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

/**
 * Formats `qty unit` pairs like the API returns them (e.g. `300 g`, `2 pc`)
 * into a localized human-readable string. Falls back to the raw unit if
 * unknown so we never lose information.
 */
export function formatQuantity(value: string | number | null | undefined, unit: string | null | undefined): string {
    const n = typeof value === 'string' ? Number(value) : Number(value ?? 0)
    if (!Number.isFinite(n)) return '—'
    const unitText = unit ? unitLabel(unit, n) : ''
    const num = Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, '')
    return unitText ? `${num} ${unitText}` : num
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
    kid_friendly: 'Для детей',
    healthy: 'Здоровое',
    traditional: 'Традиционное',
    weight_loss: 'Похудение',
    mass_gain: 'Набор массы',
    asian_cuisine: 'Азиатская кухня',
    dairy_based: 'На молочной основе',
    holiday: 'Праздничное',
    lamb: 'Баранина',
    local_cuisine: 'Местная кухня',
    meat_based: 'Мясное',
    potato_based: 'Картофельное',
    traditional_pastry: 'Традиционная выпечка',
    vegetarian: 'Вегетарианское',
    vegan: 'Веганское',
    gluten_free: 'Без глютена',
    spicy: 'Острое',
    seafood: 'Морепродукты',
}

export function tagLabel(key: string): string {
    if (!key) return ''
    if (TAG_LABELS_RU[key]) return TAG_LABELS_RU[key]
    const humanized = key.replace(/_/g, ' ')
    return humanized.charAt(0).toUpperCase() + humanized.slice(1)
}

const CUISINE_LABELS_RU: Record<string, string> = {
    kazakh: 'Казахская',
    uzbek: 'Узбекская',
    russian: 'Русская',
    turkish: 'Турецкая',
    czech: 'Чешская',
    hungarian: 'Венгерская',
    italian: 'Итальянская',
    japanese: 'Японская',
    chinese: 'Китайская',
    korean: 'Корейская',
    thai: 'Тайская',
    indian: 'Индийская',
    french: 'Французская',
    mexican: 'Мексиканская',
    american: 'Американская',
    mediterranean: 'Средиземноморская',
    georgian: 'Грузинская',
    ukrainian: 'Украинская',
    azerbaijani: 'Азербайджанская',
    central_asian: 'Центрально-азиатская',
    local_modern: 'Локальная современная',
    local_open_web: 'Локальная',
    international: 'Интернациональная',
    european: 'Европейская',
    asian: 'Азиатская',
    other: 'Другое',
}

export function cuisineLabel(key: string | null | undefined): string {
    if (!key) return ''
    if (CUISINE_LABELS_RU[key]) return CUISINE_LABELS_RU[key]
    const humanized = key.replace(/_/g, ' ')
    return humanized.charAt(0).toUpperCase() + humanized.slice(1)
}

const MEMBER_TYPE_LABELS_RU: Record<string, string> = {
    adult: 'Взрослый',
    child: 'Ребёнок',
    teen: 'Подросток',
    senior: 'Пожилой',
    custom: 'Иной',
}

export function memberTypeLabel(key: string | null | undefined): string {
    if (!key) return ''
    return MEMBER_TYPE_LABELS_RU[key] ?? key
}

const GROUP_TYPE_LABELS_RU: Record<string, string> = {
    solo: 'Один человек',
    two_adults: 'Двое взрослых',
    adults_kids: 'Взрослые + дети',
    custom: 'Своя группа',
}

export function groupTypeLabel(key: string | null | undefined): string {
    if (!key) return ''
    return GROUP_TYPE_LABELS_RU[key] ?? key
}

const GOAL_LABELS_RU: Record<string, string> = {
    maintenance: 'Поддержка',
    weight_loss: 'Похудение',
    mass_gain: 'Набор массы',
    high_protein: 'Больше белка',
    low_carb: 'Меньше углеводов',
    healthy: 'Здоровое питание',
}

export function goalLabel(key: string | null | undefined): string {
    if (!key) return ''
    return GOAL_LABELS_RU[key] ?? key
}

const PLAN_STATUS_LABELS_RU: Record<string, string> = {
    draft: 'Черновик',
    generated: 'Готов',
    approved: 'Утверждён',
    modified: 'Изменён',
    archived: 'В архиве',
}

export function planStatusLabel(key: string | null | undefined): string {
    if (!key) return ''
    return PLAN_STATUS_LABELS_RU[key] ?? key
}

const INGREDIENT_CATEGORY_LABELS_RU: Record<string, string> = {
    bakery: 'Выпечка',
    beverage: 'Напитки',
    dairy: 'Молочное',
    fat: 'Масла и жиры',
    fruit: 'Фрукты',
    grain: 'Крупы и злаки',
    grains: 'Крупы и злаки',
    herb: 'Зелень',
    other: 'Другое',
    pantry: 'Бакалея',
    protein: 'Белок',
    seasoning: 'Специи',
    spices: 'Специи',
    vegetable: 'Овощи',
    produce: 'Овощи и фрукты',
    meat: 'Мясо и птица',
    fish: 'Рыба',
    drinks: 'Напитки',
}

export function ingredientCategoryLabel(key: string | null | undefined): string {
    if (!key) return 'Другое'
    return INGREDIENT_CATEGORY_LABELS_RU[key] ?? key
}

/**
 * Localised unit names. Russian plurals depend on the numeric quantity
 * (1 шт / 2 шт / 5 шт differ in some words but `шт` / `г` are invariant —
 * we only branch where it actually matters).
 */
const UNIT_SHORT_RU: Record<string, string> = {
    g: 'г',
    kg: 'кг',
    ml: 'мл',
    l: 'л',
    pc: 'шт',
    pcs: 'шт',
    piece: 'шт',
    cup: 'стакан',
    tbsp: 'ст. л.',
    tsp: 'ч. л.',
    pinch: 'щепотка',
    to_taste: 'по вкусу',
    unit: 'шт',
    serving: 'порция',
    bunch: 'пучок',
    clove: 'зуб.',
}

const UNIT_PLURALS_RU: Record<string, [string, string, string]> = {
    cup: ['стакан', 'стакана', 'стаканов'],
    pinch: ['щепотка', 'щепотки', 'щепоток'],
    serving: ['порция', 'порции', 'порций'],
    bunch: ['пучок', 'пучка', 'пучков'],
    clove: ['зубчик', 'зубчика', 'зубчиков'],
}

/**
 * Russian plural picker: returns the right form for 1/2-4/5+ counts.
 * Example: `pluralRu(3, ['человек', 'человека', 'человек'])` → 'человека'.
 */
export function pluralRu(qty: number, forms: [string, string, string]): string {
    const abs = Math.abs(qty) % 100
    const n1 = abs % 10
    if (abs > 10 && abs < 20) return forms[2]
    if (n1 > 1 && n1 < 5) return forms[1]
    if (n1 === 1) return forms[0]
    return forms[2]
}

export function unitLabel(unit: string | null | undefined, quantity?: number): string {
    if (!unit) return ''
    const key = unit.toLowerCase()
    const plurals = UNIT_PLURALS_RU[key]
    if (plurals && typeof quantity === 'number') return pluralRu(Math.round(quantity), plurals)
    return UNIT_SHORT_RU[key] ?? unit
}

const SHOPPING_CATEGORY_LABELS_RU: Record<string, string> = {
    produce: 'Овощи и фрукты',
    meat: 'Мясо и птица',
    fish: 'Рыба',
    dairy: 'Молочное',
    grains: 'Крупы и хлеб',
    grain: 'Крупы и хлеб',
    pantry: 'Бакалея',
    spices: 'Специи',
    seasoning: 'Специи',
    drinks: 'Напитки',
    beverage: 'Напитки',
    bakery: 'Выпечка',
    other: 'Другое',
}

export function shoppingCategoryLabel(key: string | null | undefined): string {
    if (!key) return 'Другое'
    return SHOPPING_CATEGORY_LABELS_RU[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}

const ADAPTATION_LABELS_RU: Record<string, string> = {
    portion_change: 'Изменена порция',
    ingredient_remove: 'Убран ингредиент',
    ingredient_replace: 'Заменён ингредиент',
    low_carb: 'Меньше углеводов',
    high_protein: 'Больше белка',
    child_friendly: 'Для ребёнка',
    allergen_free: 'Без аллергенов',
    cheaper_version: 'Дешевле',
}

export function adaptationLabel(key: string | null | undefined): string {
    if (!key) return ''
    return ADAPTATION_LABELS_RU[key] ?? key
}

const EXPLANATION_TYPE_LABELS_RU: Record<string, string> = {
    budget: 'Бюджет',
    nutrition: 'Нутриенты',
    diversity: 'Разнообразие',
    group_fit: 'Под семью',
    tradeoff: 'Компромисс',
}

export function explanationTypeLabel(key: string | null | undefined): string {
    if (!key) return ''
    return EXPLANATION_TYPE_LABELS_RU[key] ?? key
}
