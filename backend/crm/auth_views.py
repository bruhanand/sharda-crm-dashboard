from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .admin_views import log_activity


class CustomAuthToken(ObtainAuthToken):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, created = Token.objects.get_or_create(user=user)
        
        # Log login activity
        log_activity(
            user,
            'login',
            f'User logged in',
            request
        )
        
        return Response({
            "token": token.key,
            "user_id": user.pk,
            "username": user.username,
            "email": user.email,
            "is_admin": user.is_superuser,
            "is_staff": user.is_staff,  # Add this for admin tab visibility
        })


@api_view(["POST"])
@permission_classes([AllowAny])
def logout(request):
    if request.user.is_authenticated:
        # Log logout activity
        log_activity(
            request.user,
            'logout',
            f'User logged out',
            request
        )
        request.user.auth_token.delete()
    return Response(status=status.HTTP_200_OK)
