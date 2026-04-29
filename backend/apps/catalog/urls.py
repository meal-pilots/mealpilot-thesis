from django.urls import path
from .pricing_views import IngredientListAPIView, IngredientPriceListAPIView
from .views import (
    FavoriteRecipeDestroyAPIView,
    FavoriteRecipeListCreateAPIView,
    RecipeCategoryListAPIView,
    RecipeListAPIView,
    RecipeRetrieveAPIView,
    RecipeSearchSuggestionsAPIView,
    RecipeTagListAPIView,
)

urlpatterns = [
    path('recipes', RecipeListAPIView.as_view(), name='recipe-list'),
    path('recipes/tags', RecipeTagListAPIView.as_view(), name='recipe-tags'),
    path('recipes/categories', RecipeCategoryListAPIView.as_view(), name='recipe-categories'),
    path('recipes/search-suggestions', RecipeSearchSuggestionsAPIView.as_view(), name='recipe-search-suggestions'),
    path('recipes/<uuid:recipe_id>', RecipeRetrieveAPIView.as_view(), name='recipe-detail'),
    path('favorites/recipes', FavoriteRecipeListCreateAPIView.as_view(), name='favorite-recipes'),
    path('favorites/recipes/<uuid:recipe_id>', FavoriteRecipeDestroyAPIView.as_view(), name='favorite-recipe-delete'),
    path('ingredients', IngredientListAPIView.as_view(), name='ingredient-list'),
    path('ingredients/<uuid:ingredient_id>/prices', IngredientPriceListAPIView.as_view(), name='ingredient-prices'),
]