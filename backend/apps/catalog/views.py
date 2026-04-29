from django.db.models import Prefetch, Q
from rest_framework import generics, permissions, serializers, status
from rest_framework.views import APIView

from apps.common.response import ok
from .models import FavoriteRecipe, Recipe, RecipeCategory, RecipeStatus, Tag
from .serializers import (
    FavoriteRecipeCreateSerializer,
    FavoriteRecipeListItemSerializer,
    RecipeCardSerializer,
    RecipeDetailSerializer,
    TagSerializer,
    _get_active_group,
)


class RecipeListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RecipeCardSerializer

    def get_queryset(self):
        queryset = (
            Recipe.objects.filter(status=RecipeStatus.PUBLISHED)
            .select_related('nutrition')
            .prefetch_related(
                'recipe_tags__tag',
            )
            .order_by('title')
        )

        search = self.request.query_params.get('search')
        category = self.request.query_params.get('category')
        cuisine_type = self.request.query_params.get('cuisine_type')
        max_time = self.request.query_params.get('max_time')
        max_cost = self.request.query_params.get('max_cost')
        tags = self.request.query_params.get('tags')

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(short_description__icontains=search)
                | Q(slug__icontains=search)
            )

        if category:
            queryset = queryset.filter(category=category)

        if cuisine_type:
            queryset = queryset.filter(cuisine_type=cuisine_type)

        if max_time:
            queryset = queryset.filter(total_time_minutes__lte=max_time)

        if max_cost:
            queryset = queryset.filter(estimated_cost__lte=max_cost)

        if tags:
            tag_keys = [tag.strip() for tag in tags.split(',') if tag.strip()]
            if tag_keys:
                queryset = queryset.filter(recipe_tags__tag__key__in=tag_keys).distinct()

        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['active_group'] = _get_active_group(self.request.user)
        return context


class RecipeRetrieveAPIView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RecipeDetailSerializer
    lookup_url_kwarg = 'recipe_id'

    def get_queryset(self):
        return (
            Recipe.objects.filter(status=RecipeStatus.PUBLISHED)
            .select_related('nutrition')
            .prefetch_related(
                'recipe_tags__tag',
                'steps',
                'ingredients_map__ingredient__prices',
            )
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        active_group = _get_active_group(self.request.user)
        context['active_group'] = active_group
        context['region_code'] = active_group.region_code if active_group else None
        return context

    def retrieve(self, request, *args, **kwargs):
        recipe = self.get_object()
        serializer = self.get_serializer(recipe)
        return ok(serializer.data)


class RecipeTagListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tags = Tag.objects.all().order_by('label')
        return ok(TagSerializer(tags, many=True).data)


class RecipeCategoryListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return ok([choice[0] for choice in RecipeCategory.choices])


class RecipeSearchSuggestionsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('query', '').strip()
        if not query:
            return ok([])

        recipes = (
            Recipe.objects.filter(status=RecipeStatus.PUBLISHED, title__icontains=query)
            .only('id', 'title')
            .order_by('title')[:10]
        )

        return ok(
            [
                {
                    'id': recipe.id,
                    'title': recipe.title,
                }
                for recipe in recipes
            ]
        )


class FavoriteRecipeListCreateAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FavoriteRecipeCreateSerializer

    def get_queryset(self):
        return (
            FavoriteRecipe.objects.filter(user=self.request.user)
            .select_related('recipe', 'recipe__nutrition')
            .prefetch_related('recipe__recipe_tags__tag')
            .order_by('-created_at')
        )

    def get(self, request, *args, **kwargs):
        favorites = self.get_queryset()
        active_group = _get_active_group(request.user)
        serializer = FavoriteRecipeListItemSerializer(
            favorites,
            many=True,
            context={'active_group': active_group},
        )
        return ok(serializer.data)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        favorite = serializer.save()
        return ok(
            {
                'id': favorite.id,
                'recipe_id': favorite.recipe_id,
                'created_at': favorite.created_at,
            },
            status_code=status.HTTP_201_CREATED,
        )


class FavoriteRecipeDestroyAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, recipe_id):
        deleted, _ = FavoriteRecipe.objects.filter(
            user=request.user,
            recipe_id=recipe_id,
        ).delete()
        if not deleted:
            raise serializers.ValidationError({'recipe_id': ['Favorite recipe not found.']})
        return ok(status_code=status.HTTP_204_NO_CONTENT)