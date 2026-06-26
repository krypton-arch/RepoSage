from django.contrib.auth.models import User
from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer, CharField, ValidationError
import re

class UserSerializer(ModelSerializer):
    password = CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'password')
        
    def validate_password(self, value):
        if len(value) < 8:
            raise ValidationError("Password must be at least 8 characters long.")
        return value

    def validate_username(self, value):
        if not re.match(r'^[a-zA-Z0-9_.-]+$', value):
            raise ValidationError("Username can only contain alphanumeric characters, underscores, hyphens, and periods.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer

class MeView(views.APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        
        # Calculate some basic statistics
        from projects.models import Project
        from query.models import QuerySession
        
        # Enforce strict RBAC for user stats
        projects_owned = Project.objects.filter(owner_id=str(user.id)).count()
        queries_executed = QuerySession.objects.filter(project__owner_id=str(user.id)).count()
        
        return Response({
            'username': user.username,
            'email': user.email,
            'date_joined': user.date_joined.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'is_superuser': user.is_superuser,
            'stats': {
                'projects_created': projects_owned,
                'queries_executed': queries_executed,
                'clearance_level': 5 if user.is_superuser else 3,
            }
        })
