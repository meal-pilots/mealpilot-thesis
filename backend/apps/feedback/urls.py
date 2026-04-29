from django.urls import path
from .notification_views import (
    NotificationListAPIView,
    NotificationReadAPIView,
    NotificationReadAllAPIView,
)
from .views import (
    InteractionEventCreateAPIView,
    MealPlanFeedbackCreateAPIView,
    MealPlanHistoryAPIView,
    RecipeFeedbackCreateAPIView,
    RecipeHistoryAPIView,
)

urlpatterns = [
    path('recipes/<uuid:recipe_id>/feedback', RecipeFeedbackCreateAPIView.as_view(), name='recipe-feedback-create'),
    path('meal-plans/<uuid:meal_plan_id>/feedback', MealPlanFeedbackCreateAPIView.as_view(), name='meal-plan-feedback-create'),
    path('events', InteractionEventCreateAPIView.as_view(), name='interaction-event-create'),
    path('groups/<uuid:group_id>/history/meal-plans', MealPlanHistoryAPIView.as_view(), name='meal-plan-history'),
    path('groups/<uuid:group_id>/history/recipes', RecipeHistoryAPIView.as_view(), name='recipe-history'),
    path('notifications', NotificationListAPIView.as_view(), name='notifications'),
    path('notifications/<uuid:notification_id>/read', NotificationReadAPIView.as_view(), name='notification-read'),
    path('notifications/read-all', NotificationReadAllAPIView.as_view(), name='notifications-read-all'),
]