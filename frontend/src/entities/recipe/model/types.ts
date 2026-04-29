export interface RecipeTagItem {
    id: string
    key: string
    label: string
}

export interface RecipeCard {
    id: string
    title: string
    image_url: string | null
    category: string
    cuisine_type: string
    total_time_minutes: number
    estimated_cost: string | number | null
    calories_per_serving: string | number | null
    protein_per_serving_g: string | number | null
    fat_per_serving_g: string | number | null
    carb_per_serving_g: string | number | null
    tags: string[]
    fit_score: number
    is_child_friendly: boolean
}

export interface RecipeIngredient {
    ingredient_id: string
    name: string
    quantity: string | number
    unit: string
    estimated_price: string | null
    is_optional: boolean
    preparation_note: string | null
}

export interface RecipeStep {
    order: number
    instruction_text: string
    duration_minutes: number | null
    is_optional: boolean
}

export interface RecipeNutrition {
    calories_total: string | number | null
    protein_total_g: string | number | null
    fat_total_g: string | number | null
    carb_total_g: string | number | null
    calories_per_serving: string | number | null
    protein_per_serving_g: string | number | null
    fat_per_serving_g: string | number | null
    carb_per_serving_g: string | number | null
    micronutrients: Record<string, unknown>
}

export interface RecipeSubstitution {
    ingredient_id: string
    ingredient_name: string
    substitute_ingredient_id: string
    substitute_name: string
    reason: string
    price_delta_estimate: string | number | null
    nutrition_delta_json: Record<string, unknown> | null
    confidence_score: string | number | null
}

export interface RecipeSuitability {
    fit_score: number
    matches: string[]
    conflicts: string[]
}

export interface RecipeDetail {
    id: string
    title: string
    slug: string
    short_description: string
    long_description: string
    cuisine_type: string
    region_code: string
    is_local_cuisine: boolean
    category: string
    difficulty_level: string
    prep_time_minutes: number
    cook_time_minutes: number
    total_time_minutes: number
    servings_default: number
    estimated_cost: string | number | null
    is_child_friendly: boolean
    image_url: string | null
    video_url: string | null
    chef_note: string | null
    seasonality_score: string | number | null
    nutrition: RecipeNutrition
    ingredients: RecipeIngredient[]
    steps: RecipeStep[]
    tags: string[]
    substitutions: RecipeSubstitution[]
    suitability: RecipeSuitability
}

export interface FavoriteRecipeListItem {
    recipe_id: string
    title: string
    image_url: string | null
    fit_score: number
}
