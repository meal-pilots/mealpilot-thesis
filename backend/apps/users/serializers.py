from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


def normalize_auth_email(value: str) -> str:
    return User.objects.normalize_email(value).strip().lower()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'preferred_language', 'avatar_url', 'created_at')
        read_only_fields = ('id', 'created_at')


class SignUpSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('email', 'password', 'full_name')

    def validate_email(self, value):
        email = normalize_auth_email(value)

        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError('A user with this email already exists.')

        return email

    def validate(self, attrs):
        password = attrs.get('password')
        user = User(
            email=attrs.get('email', ''),
            full_name=attrs.get('full_name', ''),
        )

        try:
            validate_password(password, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)}) from exc

        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('full_name', 'preferred_language', 'avatar_url')


class MealPlannerTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        return token

    def validate(self, attrs):
        email = attrs.get(self.username_field)

        if isinstance(email, str):
            attrs[self.username_field] = normalize_auth_email(email)

        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data
