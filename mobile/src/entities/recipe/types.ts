export type RecipeCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type RecipeNutritionPerServing = {
    calories_per_serving?: string | null
    protein_per_serving_g?: string | null
    fat_per_serving_g?: string | null
    carb_per_serving_g?: string | null
}

export type RecipeCard = RecipeNutritionPerServing & {
    id: string
    title: string
    image_url: string | null
    category: RecipeCategory
    cuisine_type: string
    total_time_minutes: number
    estimated_cost: string
    tags: string[]
    fit_score: number
    is_child_friendly: boolean
}

export type RecipeStep = {
    order: number
    instruction_text: string
    duration_minutes?: number | null
    is_optional: boolean
}

export type RecipeIngredientView = {
    ingredient_id: string
    name: string
    quantity: string
    unit: string
    estimated_price: string | null
    is_optional: boolean
    preparation_note: string
}

export type RecipeNutritionFull = {
    calories_total?: string | null
    protein_total_g?: string | null
    fat_total_g?: string | null
    carb_total_g?: string | null
    calories_per_serving?: string | null
    protein_per_serving_g?: string | null
    fat_per_serving_g?: string | null
    carb_per_serving_g?: string | null
    micronutrients?: Record<string, unknown>
}

export type RecipeDetail = {
    id: string
    title: string
    slug: string
    short_description: string
    long_description: string
    cuisine_type: string
    region_code: string
    is_local_cuisine: boolean
    category: RecipeCategory
    difficulty_level: 'easy' | 'medium' | 'hard'
    prep_time_minutes: number
    cook_time_minutes: number
    total_time_minutes: number
    servings_default: number
    estimated_cost: string
    is_child_friendly: boolean
    image_url: string | null
    video_url: string | null
    chef_note: string
    nutrition: RecipeNutritionFull | null
    ingredients: RecipeIngredientView[]
    steps: RecipeStep[]
    tags: string[]
    suitability: {
        fit_score: number
        matches: string[]
        conflicts: string[]
    }
}

export type RecipeFilters = {
    search?: string
    category?: RecipeCategory
    cuisine_type?: string
    max_time?: number
    max_cost?: number
    tags?: string[]
}

export type Tag = {
    id: string
    key: string
    label: string
}
