from decimal import Decimal


def derive_macro_targets(goal_type: str, weight_kg: Decimal | None) -> dict:
    if weight_kg is None:
        return {
            'daily_calorie_target': None,
            'protein_target_g': None,
            'fat_target_g': None,
            'carb_target_g': None,
        }

    weight = float(weight_kg)
    if goal_type == 'mass_gain':
        calories = int(weight * 36)
        protein = int(weight * 2.0)
    elif goal_type == 'weight_loss':
        calories = int(weight * 28)
        protein = int(weight * 1.8)
    elif goal_type == 'high_protein':
        calories = int(weight * 32)
        protein = int(weight * 2.0)
    else:
        calories = int(weight * 31)
        protein = int(weight * 1.6)

    fat = max(40, int(weight * 0.9))
    remaining = max(0, calories - (protein * 4 + fat * 9))
    carbs = int(remaining / 4)
    return {
        'daily_calorie_target': calories,
        'protein_target_g': protein,
        'fat_target_g': fat,
        'carb_target_g': carbs,
    }
