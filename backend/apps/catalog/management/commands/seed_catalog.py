from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import (
    Ingredient,
    IngredientPrice,
    IngredientSubstitution,
    Recipe,
    RecipeCategory,
    RecipeDifficulty,
    RecipeIngredient,
    RecipeNutrition,
    RecipeStatus,
    RecipeStep,
    RecipeTag,
    SubstitutionReason,
    Tag,
)


TODAY = date.today()


TAG_DEFINITIONS = [
    ("budget_friendly", "Budget Friendly"),
    ("high_protein", "High Protein"),
    ("low_carb", "Low Carb"),
    ("kid_friendly", "Kid Friendly"),
    ("quick_meal", "Quick Meal"),
    ("traditional", "Traditional"),
    ("healthy", "Healthy"),
    ("mass_gain", "Mass Gain"),
    ("weight_loss", "Weight Loss"),
]


INGREDIENT_DEFINITIONS = [
    {
        "name": "Chicken breast",
        "normalized_name": "chicken_breast",
        "category": "protein",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Turkey breast",
        "normalized_name": "turkey_breast",
        "category": "protein",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Beef",
        "normalized_name": "beef",
        "category": "protein",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Salmon",
        "normalized_name": "salmon",
        "category": "protein",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Mackerel",
        "normalized_name": "mackerel",
        "category": "protein",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Eggs",
        "normalized_name": "eggs",
        "category": "protein",
        "default_unit": "pc",
        "is_common_allergen": True,
    },
    {
        "name": "Cottage cheese",
        "normalized_name": "cottage_cheese",
        "category": "dairy",
        "default_unit": "kg",
        "is_common_allergen": True,
    },
    {
        "name": "Greek yogurt",
        "normalized_name": "greek_yogurt",
        "category": "dairy",
        "default_unit": "kg",
        "is_common_allergen": True,
    },
    {
        "name": "Buckwheat",
        "normalized_name": "buckwheat",
        "category": "grain",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Rice",
        "normalized_name": "rice",
        "category": "grain",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Millet",
        "normalized_name": "millet",
        "category": "grain",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Lentils",
        "normalized_name": "lentils",
        "category": "legume",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Potatoes",
        "normalized_name": "potatoes",
        "category": "vegetable",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Onion",
        "normalized_name": "onion",
        "category": "vegetable",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Carrot",
        "normalized_name": "carrot",
        "category": "vegetable",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Tomato",
        "normalized_name": "tomato",
        "category": "vegetable",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Cucumber",
        "normalized_name": "cucumber",
        "category": "vegetable",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Bell pepper",
        "normalized_name": "bell_pepper",
        "category": "vegetable",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Spinach",
        "normalized_name": "spinach",
        "category": "vegetable",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Zucchini",
        "normalized_name": "zucchini",
        "category": "vegetable",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Apple",
        "normalized_name": "apple",
        "category": "fruit",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Banana",
        "normalized_name": "banana",
        "category": "fruit",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
    {
        "name": "Olive oil",
        "normalized_name": "olive_oil",
        "category": "fat",
        "default_unit": "l",
        "is_common_allergen": False,
    },
    {
        "name": "Butter",
        "normalized_name": "butter",
        "category": "fat",
        "default_unit": "kg",
        "is_common_allergen": True,
    },
    {
        "name": "Whole wheat bread",
        "normalized_name": "whole_wheat_bread",
        "category": "grain",
        "default_unit": "pc",
        "is_common_allergen": True,
    },
    {
        "name": "Oat flakes",
        "normalized_name": "oat_flakes",
        "category": "grain",
        "default_unit": "kg",
        "is_common_allergen": False,
    },
]


PRICE_DEFINITIONS = [
    ("chicken_breast", "Magnum", "KZ-AST", "3200", "kg"),
    ("turkey_breast", "Magnum", "KZ-AST", "3700", "kg"),
    ("beef", "Magnum", "KZ-AST", "4200", "kg"),
    ("salmon", "Magnum", "KZ-AST", "7800", "kg"),
    ("mackerel", "Magnum", "KZ-AST", "3500", "kg"),
    ("eggs", "Magnum", "KZ-AST", "65", "pc"),
    ("cottage_cheese", "Magnum", "KZ-AST", "2400", "kg"),
    ("greek_yogurt", "Magnum", "KZ-AST", "2800", "kg"),
    ("buckwheat", "Magnum", "KZ-AST", "550", "kg"),
    ("rice", "Magnum", "KZ-AST", "650", "kg"),
    ("millet", "Magnum", "KZ-AST", "500", "kg"),
    ("lentils", "Magnum", "KZ-AST", "900", "kg"),
    ("potatoes", "Magnum", "KZ-AST", "220", "kg"),
    ("onion", "Magnum", "KZ-AST", "180", "kg"),
    ("carrot", "Magnum", "KZ-AST", "200", "kg"),
    ("tomato", "Magnum", "KZ-AST", "750", "kg"),
    ("cucumber", "Magnum", "KZ-AST", "700", "kg"),
    ("bell_pepper", "Magnum", "KZ-AST", "1100", "kg"),
    ("spinach", "Magnum", "KZ-AST", "2200", "kg"),
    ("zucchini", "Magnum", "KZ-AST", "650", "kg"),
    ("apple", "Magnum", "KZ-AST", "500", "kg"),
    ("banana", "Magnum", "KZ-AST", "650", "kg"),
    ("olive_oil", "Magnum", "KZ-AST", "3500", "l"),
    ("butter", "Magnum", "KZ-AST", "4200", "kg"),
    ("whole_wheat_bread", "Magnum", "KZ-AST", "95", "pc"),
    ("oat_flakes", "Magnum", "KZ-AST", "850", "kg"),
]


RECIPE_DEFINITIONS = [
    {
        "slug": "chicken-buckwheat-bowl",
        "title": "Chicken Buckwheat Bowl",
        "short_description": "Balanced weekday lunch with lean protein and buckwheat.",
        "long_description": "A simple high-protein lunch built around local pantry staples and fast preparation.",
        "cuisine_type": "local_modern",
        "region_code": "KZ",
        "is_local_cuisine": True,
        "category": RecipeCategory.LUNCH,
        "difficulty_level": RecipeDifficulty.EASY,
        "prep_time_minutes": 10,
        "cook_time_minutes": 20,
        "servings_default": 4,
        "is_child_friendly": True,
        "image_url": "https://images.unsplash.com/photo-1547592180-85f173990554",
        "status": RecipeStatus.PUBLISHED,
        "tags": ["budget_friendly", "high_protein", "healthy", "quick_meal", "kid_friendly"],
        "nutrition": {
            "calories_total": "2160",
            "protein_total_g": "136",
            "fat_total_g": "64",
            "carb_total_g": "232",
            "calories_per_serving": "540",
            "protein_per_serving_g": "34",
            "fat_per_serving_g": "16",
            "carb_per_serving_g": "58",
            "micronutrients": {"iron_mg": 4.2, "calcium_mg": 120},
        },
        "ingredients": [
            ("chicken_breast", "600", "g", False, "cubed"),
            ("buckwheat", "300", "g", False, ""),
            ("onion", "150", "g", False, "sliced"),
            ("carrot", "150", "g", False, "julienned"),
            ("olive_oil", "20", "ml", False, ""),
        ],
        "steps": [
            "Rinse the buckwheat and cook until tender.",
            "Sauté onion and carrot in olive oil.",
            "Add chicken breast and cook until golden and fully done.",
            "Serve over warm buckwheat.",
        ],
    },
    {
        "slug": "beef-lentil-stew",
        "title": "Beef Lentil Stew",
        "short_description": "Hearty protein-rich stew for family dinners.",
        "long_description": "A filling dinner with beef, lentils, and vegetables that works well for cooler evenings.",
        "cuisine_type": "comfort_local",
        "region_code": "KZ",
        "is_local_cuisine": True,
        "category": RecipeCategory.DINNER,
        "difficulty_level": RecipeDifficulty.MEDIUM,
        "prep_time_minutes": 15,
        "cook_time_minutes": 45,
        "servings_default": 4,
        "is_child_friendly": True,
        "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947",
        "status": RecipeStatus.PUBLISHED,
        "tags": ["high_protein", "healthy", "traditional", "kid_friendly"],
        "nutrition": {
            "calories_total": "2480",
            "protein_total_g": "156",
            "fat_total_g": "82",
            "carb_total_g": "212",
            "calories_per_serving": "620",
            "protein_per_serving_g": "39",
            "fat_per_serving_g": "20.5",
            "carb_per_serving_g": "53",
            "micronutrients": {"iron_mg": 7.6, "zinc_mg": 5.1},
        },
        "ingredients": [
            ("beef", "700", "g", False, "cubed"),
            ("lentils", "250", "g", False, ""),
            ("onion", "150", "g", False, "diced"),
            ("carrot", "180", "g", False, "diced"),
            ("tomato", "300", "g", False, "chopped"),
            ("olive_oil", "20", "ml", False, ""),
        ],
        "steps": [
            "Brown the beef in olive oil.",
            "Add onion and carrot and cook until softened.",
            "Stir in lentils and chopped tomato.",
            "Add water and simmer until beef and lentils are tender.",
        ],
    },
    {
        "slug": "millet-cottage-cheese-bowl",
        "title": "Millet Cottage Cheese Bowl",
        "short_description": "Comforting breakfast with slow carbs and protein.",
        "long_description": "A breakfast option that balances digestible grains with dairy protein.",
        "cuisine_type": "breakfast_classic",
        "region_code": "KZ",
        "is_local_cuisine": True,
        "category": RecipeCategory.BREAKFAST,
        "difficulty_level": RecipeDifficulty.EASY,
        "prep_time_minutes": 5,
        "cook_time_minutes": 15,
        "servings_default": 4,
        "is_child_friendly": True,
        "image_url": "https://images.unsplash.com/photo-1517673400267-0251440c45dc",
        "status": RecipeStatus.PUBLISHED,
        "tags": ["high_protein", "healthy", "kid_friendly", "quick_meal"],
        "nutrition": {
            "calories_total": "1880",
            "protein_total_g": "112",
            "fat_total_g": "44",
            "carb_total_g": "248",
            "calories_per_serving": "470",
            "protein_per_serving_g": "28",
            "fat_per_serving_g": "11",
            "carb_per_serving_g": "62",
            "micronutrients": {"calcium_mg": 380, "magnesium_mg": 120},
        },
        "ingredients": [
            ("millet", "280", "g", False, ""),
            ("cottage_cheese", "500", "g", False, ""),
            ("banana", "300", "g", False, "sliced"),
            ("butter", "20", "g", True, ""),
        ],
        "steps": [
            "Cook millet until soft.",
            "Fold in cottage cheese while warm.",
            "Top with sliced banana and a little butter if desired.",
        ],
    },
    {
        "slug": "salmon-rice-plate",
        "title": "Salmon Rice Plate",
        "short_description": "Omega-3 rich dinner with rice and vegetables.",
        "long_description": "A more premium option for evenings when the budget can stretch a little.",
        "cuisine_type": "modern_balanced",
        "region_code": "KZ",
        "is_local_cuisine": False,
        "category": RecipeCategory.DINNER,
        "difficulty_level": RecipeDifficulty.MEDIUM,
        "prep_time_minutes": 10,
        "cook_time_minutes": 25,
        "servings_default": 4,
        "is_child_friendly": True,
        "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288",
        "status": RecipeStatus.PUBLISHED,
        "tags": ["high_protein", "healthy", "kid_friendly"],
        "nutrition": {
            "calories_total": "2520",
            "protein_total_g": "148",
            "fat_total_g": "96",
            "carb_total_g": "248",
            "calories_per_serving": "630",
            "protein_per_serving_g": "37",
            "fat_per_serving_g": "24",
            "carb_per_serving_g": "62",
            "micronutrients": {"omega3_g": 2.6, "vitamin_d_mcg": 8.5},
        },
        "ingredients": [
            ("salmon", "700", "g", False, "filleted"),
            ("rice", "320", "g", False, ""),
            ("cucumber", "250", "g", False, "sliced"),
            ("tomato", "250", "g", False, "wedged"),
            ("olive_oil", "20", "ml", False, ""),
        ],
        "steps": [
            "Cook rice until fluffy.",
            "Bake or pan-sear the salmon until just cooked.",
            "Serve with fresh cucumber and tomato.",
        ],
    },
    {
        "slug": "mackerel-rice-plate",
        "title": "Mackerel Rice Plate",
        "short_description": "Budget-friendly fish dinner with a similar structure to salmon.",
        "long_description": "A practical substitute for premium fish dishes while preserving protein and healthy fats.",
        "cuisine_type": "modern_balanced",
        "region_code": "KZ",
        "is_local_cuisine": False,
        "category": RecipeCategory.DINNER,
        "difficulty_level": RecipeDifficulty.EASY,
        "prep_time_minutes": 10,
        "cook_time_minutes": 20,
        "servings_default": 4,
        "is_child_friendly": True,
        "image_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
        "status": RecipeStatus.PUBLISHED,
        "tags": ["budget_friendly", "high_protein", "healthy", "kid_friendly"],
        "nutrition": {
            "calories_total": "2300",
            "protein_total_g": "140",
            "fat_total_g": "84",
            "carb_total_g": "228",
            "calories_per_serving": "575",
            "protein_per_serving_g": "35",
            "fat_per_serving_g": "21",
            "carb_per_serving_g": "57",
            "micronutrients": {"omega3_g": 1.8, "vitamin_d_mcg": 6.2},
        },
        "ingredients": [
            ("mackerel", "700", "g", False, "filleted"),
            ("rice", "320", "g", False, ""),
            ("cucumber", "250", "g", False, "sliced"),
            ("tomato", "250", "g", False, "wedged"),
            ("olive_oil", "20", "ml", False, ""),
        ],
        "steps": [
            "Cook rice until fluffy.",
            "Bake or pan-sear the mackerel until just cooked.",
            "Serve with fresh cucumber and tomato.",
        ],
    },
    {
        "slug": "turkey-zucchini-skillet",
        "title": "Turkey Zucchini Skillet",
        "short_description": "Low-carb lunch with lean turkey and vegetables.",
        "long_description": "A fast low-carb dish that works well for weight-loss and lighter lunch plans.",
        "cuisine_type": "light_modern",
        "region_code": "KZ",
        "is_local_cuisine": False,
        "category": RecipeCategory.LUNCH,
        "difficulty_level": RecipeDifficulty.EASY,
        "prep_time_minutes": 10,
        "cook_time_minutes": 18,
        "servings_default": 4,
        "is_child_friendly": True,
        "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
        "status": RecipeStatus.PUBLISHED,
        "tags": ["low_carb", "high_protein", "healthy", "quick_meal", "weight_loss"],
        "nutrition": {
            "calories_total": "1640",
            "protein_total_g": "148",
            "fat_total_g": "72",
            "carb_total_g": "68",
            "calories_per_serving": "410",
            "protein_per_serving_g": "37",
            "fat_per_serving_g": "18",
            "carb_per_serving_g": "17",
            "micronutrients": {"vitamin_c_mg": 42, "potassium_mg": 610},
        },
        "ingredients": [
            ("turkey_breast", "650", "g", False, "sliced"),
            ("zucchini", "450", "g", False, "half-moons"),
            ("bell_pepper", "250", "g", False, "strips"),
            ("onion", "120", "g", False, "sliced"),
            ("olive_oil", "15", "ml", False, ""),
        ],
        "steps": [
            "Heat olive oil and cook onion until translucent.",
            "Add turkey and cook until nearly done.",
            "Add zucchini and bell pepper and sauté until tender.",
        ],
    },
    {
        "slug": "egg-spinach-breakfast-wrap",
        "title": "Egg Spinach Breakfast Wrap",
        "short_description": "Fast protein breakfast using eggs, greens, and bread.",
        "long_description": "A quick breakfast suitable for weekdays and adaptable for different household needs.",
        "cuisine_type": "quick_breakfast",
        "region_code": "KZ",
        "is_local_cuisine": False,
        "category": RecipeCategory.BREAKFAST,
        "difficulty_level": RecipeDifficulty.EASY,
        "prep_time_minutes": 5,
        "cook_time_minutes": 10,
        "servings_default": 4,
        "is_child_friendly": True,
        "image_url": "https://images.unsplash.com/photo-1482049016688-2d3e1b311543",
        "status": RecipeStatus.PUBLISHED,
        "tags": ["high_protein", "quick_meal", "kid_friendly", "healthy"],
        "nutrition": {
            "calories_total": "1760",
            "protein_total_g": "96",
            "fat_total_g": "82",
            "carb_total_g": "148",
            "calories_per_serving": "440",
            "protein_per_serving_g": "24",
            "fat_per_serving_g": "20.5",
            "carb_per_serving_g": "37",
            "micronutrients": {"iron_mg": 3.4, "folate_mcg": 130},
        },
        "ingredients": [
            ("eggs", "8", "pc", False, ""),
            ("spinach", "200", "g", False, ""),
            ("whole_wheat_bread", "8", "pc", False, ""),
            ("olive_oil", "10", "ml", False, ""),
        ],
        "steps": [
            "Whisk eggs and cook them gently in olive oil.",
            "Fold in spinach until just wilted.",
            "Serve on toasted whole wheat bread.",
        ],
    },
    {
        "slug": "greek-yogurt-oats-bowl",
        "title": "Greek Yogurt Oats Bowl",
        "short_description": "Light breakfast bowl with oats, yogurt, and fruit.",
        "long_description": "An easy breakfast option for healthy and weight-conscious plans.",
        "cuisine_type": "quick_breakfast",
        "region_code": "KZ",
        "is_local_cuisine": False,
        "category": RecipeCategory.BREAKFAST,
        "difficulty_level": RecipeDifficulty.EASY,
        "prep_time_minutes": 5,
        "cook_time_minutes": 0,
        "servings_default": 4,
        "is_child_friendly": True,
        "image_url": "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f",
        "status": RecipeStatus.PUBLISHED,
        "tags": ["healthy", "weight_loss", "quick_meal", "kid_friendly"],
        "nutrition": {
            "calories_total": "1520",
            "protein_total_g": "76",
            "fat_total_g": "28",
            "carb_total_g": "236",
            "calories_per_serving": "380",
            "protein_per_serving_g": "19",
            "fat_per_serving_g": "7",
            "carb_per_serving_g": "59",
            "micronutrients": {"calcium_mg": 340, "fiber_g": 7.2},
        },
        "ingredients": [
            ("greek_yogurt", "600", "g", False, ""),
            ("oat_flakes", "220", "g", False, ""),
            ("apple", "350", "g", False, "chopped"),
            ("banana", "200", "g", False, "sliced"),
        ],
        "steps": [
            "Combine yogurt and oat flakes.",
            "Top with chopped apple and banana.",
            "Serve immediately or chill for a thicker texture.",
        ],
    },
    {
        "slug": "beef-potato-skillet",
        "title": "Beef Potato Skillet",
        "short_description": "Traditional-style dinner built for satiety and family appeal.",
        "long_description": "A straightforward skillet meal with beef, potatoes, and vegetables.",
        "cuisine_type": "traditional_home",
        "region_code": "KZ",
        "is_local_cuisine": True,
        "category": RecipeCategory.DINNER,
        "difficulty_level": RecipeDifficulty.EASY,
        "prep_time_minutes": 10,
        "cook_time_minutes": 30,
        "servings_default": 4,
        "is_child_friendly": True,
        "image_url": "https://images.unsplash.com/photo-1525351484163-7529414344d8",
        "status": RecipeStatus.PUBLISHED,
        "tags": ["traditional", "kid_friendly", "mass_gain"],
        "nutrition": {
            "calories_total": "2680",
            "protein_total_g": "136",
            "fat_total_g": "98",
            "carb_total_g": "296",
            "calories_per_serving": "670",
            "protein_per_serving_g": "34",
            "fat_per_serving_g": "24.5",
            "carb_per_serving_g": "74",
            "micronutrients": {"potassium_mg": 880, "iron_mg": 5.4},
        },
        "ingredients": [
            ("beef", "650", "g", False, "strips"),
            ("potatoes", "700", "g", False, "cubed"),
            ("onion", "150", "g", False, "sliced"),
            ("carrot", "150", "g", False, "sliced"),
            ("olive_oil", "20", "ml", False, ""),
        ],
        "steps": [
            "Brown beef in olive oil.",
            "Add vegetables and potatoes.",
            "Cook covered until potatoes are tender and beef is cooked through.",
        ],
    },
    {
        "slug": "chicken-rice-mass-gain-bowl",
        "title": "Chicken Rice Mass Gain Bowl",
        "short_description": "A higher-calorie lunch for performance and mass-gain plans.",
        "long_description": "A practical bowl with extra rice and protein for users targeting higher intake.",
        "cuisine_type": "performance_meal",
        "region_code": "KZ",
        "is_local_cuisine": False,
        "category": RecipeCategory.LUNCH,
        "difficulty_level": RecipeDifficulty.EASY,
        "prep_time_minutes": 10,
        "cook_time_minutes": 20,
        "servings_default": 4,
        "is_child_friendly": True,
        "image_url": "https://images.unsplash.com/photo-1512058564366-18510be2db19",
        "status": RecipeStatus.PUBLISHED,
        "tags": ["high_protein", "mass_gain", "quick_meal"],
        "nutrition": {
            "calories_total": "2800",
            "protein_total_g": "160",
            "fat_total_g": "72",
            "carb_total_g": "360",
            "calories_per_serving": "700",
            "protein_per_serving_g": "40",
            "fat_per_serving_g": "18",
            "carb_per_serving_g": "90",
            "micronutrients": {"magnesium_mg": 90, "selenium_mcg": 32},
        },
        "ingredients": [
            ("chicken_breast", "700", "g", False, "cubed"),
            ("rice", "420", "g", False, ""),
            ("bell_pepper", "200", "g", False, "strips"),
            ("olive_oil", "20", "ml", False, ""),
        ],
        "steps": [
            "Cook rice until fluffy.",
            "Cook chicken and bell pepper in olive oil.",
            "Serve the chicken mixture over a generous portion of rice.",
        ],
    },
    {
        "slug": "apple-yogurt-snack",
        "title": "Apple Yogurt Snack",
        "short_description": "Light snack for optional fourth meal plans.",
        "long_description": "An easy snack with fruit and dairy protein.",
        "cuisine_type": "snack_simple",
        "region_code": "KZ",
        "is_local_cuisine": False,
        "category": RecipeCategory.SNACK,
        "difficulty_level": RecipeDifficulty.EASY,
        "prep_time_minutes": 5,
        "cook_time_minutes": 0,
        "servings_default": 4,
        "is_child_friendly": True,
        "image_url": "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea",
        "status": RecipeStatus.PUBLISHED,
        "tags": ["healthy", "kid_friendly", "quick_meal"],
        "nutrition": {
            "calories_total": "720",
            "protein_total_g": "36",
            "fat_total_g": "8",
            "carb_total_g": "124",
            "calories_per_serving": "180",
            "protein_per_serving_g": "9",
            "fat_per_serving_g": "2",
            "carb_per_serving_g": "31",
            "micronutrients": {"calcium_mg": 180, "vitamin_c_mg": 7.1},
        },
        "ingredients": [
            ("greek_yogurt", "400", "g", False, ""),
            ("apple", "400", "g", False, "sliced"),
        ],
        "steps": [
            "Slice the apples.",
            "Serve with chilled Greek yogurt.",
        ],
    },
]


SUBSTITUTION_DEFINITIONS = [
    ("salmon", "mackerel", SubstitutionReason.CHEAPER, "-1400", {"omega3_g": -0.8}),
    ("chicken_breast", "turkey_breast", SubstitutionReason.HIGHER_PROTEIN, "250", {"protein_g": 2}),
    ("rice", "zucchini", SubstitutionReason.LOW_CARB, "-120", {"carb_g": -45}),
]


class Command(BaseCommand):
    help = "Seed tags, ingredients, prices, recipes, nutrition, substitutions, and favorite-ready catalog data."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding catalog data..."))

        tags = self._seed_tags()
        ingredients = self._seed_ingredients()
        self._seed_prices(ingredients)
        recipes = self._seed_recipes(tags, ingredients)
        self._seed_substitutions(ingredients)

        self.stdout.write(self.style.SUCCESS(
            f"Catalog seed completed. Tags={len(tags)}, Ingredients={len(ingredients)}, Recipes={len(recipes)}"
        ))

    def _seed_tags(self) -> dict[str, Tag]:
        result: dict[str, Tag] = {}
        for key, label in TAG_DEFINITIONS:
            tag, _ = Tag.objects.update_or_create(
                key=key,
                defaults={"label": label},
            )
            result[key] = tag
        return result

    def _seed_ingredients(self) -> dict[str, Ingredient]:
        result: dict[str, Ingredient] = {}
        for item in INGREDIENT_DEFINITIONS:
            ingredient, _ = Ingredient.objects.update_or_create(
                normalized_name=item["normalized_name"],
                defaults={
                    "name": item["name"],
                    "category": item["category"],
                    "default_unit": item["default_unit"],
                    "is_common_allergen": item["is_common_allergen"],
                },
            )
            result[item["normalized_name"]] = ingredient
        return result

    def _seed_prices(self, ingredients: dict[str, Ingredient]) -> None:
        for ingredient_key, store_name, region_code, price_amount, price_unit in PRICE_DEFINITIONS:
            IngredientPrice.objects.update_or_create(
                ingredient=ingredients[ingredient_key],
                store_name=store_name,
                region_code=region_code,
                price_unit=price_unit,
                effective_from=TODAY,
                defaults={
                    "price_amount": Decimal(price_amount),
                    "source_type": "manual",
                    "confidence_score": Decimal("0.90"),
                },
            )

    def _seed_recipes(self, tags: dict[str, Tag], ingredients: dict[str, Ingredient]) -> list[Recipe]:
        created_recipes: list[Recipe] = []

        for payload in RECIPE_DEFINITIONS:
            recipe, _ = Recipe.objects.update_or_create(
                slug=payload["slug"],
                defaults={
                    "title": payload["title"],
                    "short_description": payload["short_description"],
                    "long_description": payload["long_description"],
                    "cuisine_type": payload["cuisine_type"],
                    "region_code": payload["region_code"],
                    "is_local_cuisine": payload["is_local_cuisine"],
                    "category": payload["category"],
                    "difficulty_level": payload["difficulty_level"],
                    "prep_time_minutes": payload["prep_time_minutes"],
                    "cook_time_minutes": payload["cook_time_minutes"],
                    "servings_default": payload["servings_default"],
                    "is_child_friendly": payload["is_child_friendly"],
                    "image_url": payload["image_url"],
                    "status": payload["status"],
                },
            )

            RecipeNutrition.objects.update_or_create(
                recipe=recipe,
                defaults={
                    "calories_total": Decimal(payload["nutrition"]["calories_total"]),
                    "protein_total_g": Decimal(payload["nutrition"]["protein_total_g"]),
                    "fat_total_g": Decimal(payload["nutrition"]["fat_total_g"]),
                    "carb_total_g": Decimal(payload["nutrition"]["carb_total_g"]),
                    "calories_per_serving": Decimal(payload["nutrition"]["calories_per_serving"]),
                    "protein_per_serving_g": Decimal(payload["nutrition"]["protein_per_serving_g"]),
                    "fat_per_serving_g": Decimal(payload["nutrition"]["fat_per_serving_g"]),
                    "carb_per_serving_g": Decimal(payload["nutrition"]["carb_per_serving_g"]),
                    "micronutrients": payload["nutrition"]["micronutrients"],
                },
            )

            recipe.steps.all().delete()
            recipe.ingredients_map.all().delete()
            recipe.recipe_tags.all().delete()

            for order, step_text in enumerate(payload["steps"], start=1):
                RecipeStep.objects.create(
                    recipe=recipe,
                    step_order=order,
                    instruction_text=step_text,
                )

            for ingredient_key, quantity, unit, is_optional, preparation_note in payload["ingredients"]:
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    ingredient=ingredients[ingredient_key],
                    quantity=Decimal(quantity),
                    unit=unit,
                    is_optional=is_optional,
                    preparation_note=preparation_note,
                )

            for tag_key in payload["tags"]:
                RecipeTag.objects.create(
                    recipe=recipe,
                    tag=tags[tag_key],
                )

            recipe.estimated_cost = self._estimate_recipe_cost(recipe, region_code=recipe.region_code)
            recipe.save(update_fields=["estimated_cost", "updated_at"])

            created_recipes.append(recipe)

        return created_recipes

    def _seed_substitutions(self, ingredients: dict[str, Ingredient]) -> None:
        for source_key, substitute_key, reason, price_delta, nutrition_delta in SUBSTITUTION_DEFINITIONS:
            IngredientSubstitution.objects.update_or_create(
                ingredient=ingredients[source_key],
                substitute_ingredient=ingredients[substitute_key],
                substitution_reason=reason,
                defaults={
                    "price_delta_estimate": Decimal(price_delta),
                    "nutrition_delta_json": nutrition_delta,
                    "confidence_score": Decimal("0.85"),
                },
            )

    def _estimate_recipe_cost(self, recipe: Recipe, region_code: str | None = None) -> Decimal:
        total = Decimal("0.00")

        for item in recipe.ingredients_map.select_related("ingredient").all():
            price = self._latest_price_for_ingredient(item.ingredient, region_code=region_code)
            if not price:
                continue

            total += self._normalize_cost(
                quantity=Decimal(str(item.quantity)),
                quantity_unit=item.unit,
                price_amount=Decimal(str(price.price_amount)),
                price_unit=price.price_unit,
            )

        return total.quantize(Decimal("0.01"))

    def _latest_price_for_ingredient(self, ingredient: Ingredient, region_code: str | None = None):
        qs = ingredient.prices.all()
        if region_code:
            qs = qs.filter(region_code=region_code)

        price = qs.order_by("-effective_from").first()
        if price:
            return price

        return ingredient.prices.order_by("-effective_from").first()

    def _normalize_cost(
        self,
        *,
        quantity: Decimal,
        quantity_unit: str,
        price_amount: Decimal,
        price_unit: str,
    ) -> Decimal:
        quantity_unit = (quantity_unit or "").lower()
        price_unit = (price_unit or "").lower()

        if quantity_unit == price_unit:
            return quantity * price_amount

        if quantity_unit == "g" and price_unit == "kg":
            return (quantity / Decimal("1000")) * price_amount

        if quantity_unit == "kg" and price_unit == "g":
            return (quantity * Decimal("1000")) * price_amount

        if quantity_unit == "ml" and price_unit == "l":
            return (quantity / Decimal("1000")) * price_amount

        if quantity_unit == "l" and price_unit == "ml":
            return (quantity * Decimal("1000")) * price_amount

        if quantity_unit in {"pc", "pcs", "piece"} and price_unit in {"pc", "pcs", "piece"}:
            return quantity * price_amount

        return quantity * price_amount