from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.views import APIView

from apps.common.response import ok
from .models import Ingredient


class IngredientListAPIView(APIView):
    """
    GET /api/v1/ingredients?search=...&limit=20

    Lightweight ingredient lookup used by the mobile pantry/recipe-search UIs.
    Returns id + name + canonical unit so the client can submit pantry
    additions without a second round-trip.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        search = (request.query_params.get('search') or '').strip()
        try:
            limit = int(request.query_params.get('limit') or '20')
        except ValueError:
            limit = 20
        limit = max(1, min(limit, 50))

        qs = Ingredient.objects.all()
        if search:
            qs = qs.filter(name__icontains=search)
        qs = qs.order_by('name')[:limit]

        payload = [
            {
                'id': str(ingredient.id),
                'name': ingredient.name,
                'unit': ingredient.default_unit or 'г',
                'category': ingredient.category or '',
            }
            for ingredient in qs
        ]
        return ok(payload)


class IngredientPriceListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, ingredient_id):
        ingredient = get_object_or_404(
            Ingredient.objects.prefetch_related('prices'),
            id=ingredient_id,
        )
        region_code = request.query_params.get('region_code')

        qs = ingredient.prices.all().order_by('store_name', '-effective_from')
        if region_code:
            qs = qs.filter(region_code=region_code)

        seen = set()
        payload = []

        for price in qs:
            key = (price.store_name or 'Default store', price.region_code)
            if key in seen:
                continue
            seen.add(key)
            payload.append(
                {
                    'store_name': price.store_name or 'Default store',
                    'price_amount': price.price_amount,
                    'price_unit': price.price_unit,
                    'region_code': price.region_code,
                    'effective_from': price.effective_from,
                    'source_type': price.source_type,
                    'confidence_score': price.confidence_score,
                }
            )

        return ok(payload)