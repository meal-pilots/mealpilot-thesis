import type { IconName } from '@shared/ui/Icon'

export function mealTypeIcon(meal: string | null | undefined): IconName {
    if (meal === 'breakfast') return 'croissant'
    if (meal === 'lunch') return 'utensils'
    if (meal === 'dinner') return 'chefHat'
    if (meal === 'snack') return 'cookie'
    return 'utensils'
}
