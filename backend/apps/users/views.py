from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.common.response import ok
from apps.common.throttling import AuthEndpointThrottle

from .models import User
from .serializers import (
    MealPlannerTokenObtainPairSerializer,
    ProfileUpdateSerializer,
    SignUpSerializer,
    UserSerializer,
)


class SignUpAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = SignUpSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = 'auth'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return ok(UserSerializer(user).data, status_code=status.HTTP_201_CREATED)


class LoginAPIView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = MealPlannerTokenObtainPairSerializer
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = 'auth'

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return ok(response.data)


class RefreshAPIView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = 'auth'

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return ok(response.data)


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return ok(UserSerializer(request.user).data)


class ProfileAPIView(generics.UpdateAPIView):
    serializer_class = ProfileUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        return ok(response.data)
