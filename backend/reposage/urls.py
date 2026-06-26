"""RepoSage URL Configuration."""

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from common.auth_views import RegisterView, MeView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/projects/', include('projects.urls')),
    path('api/ingestion/', include('ingestion.urls')),
    path('api/query/', include('query.urls')),
    path('api/evaluation/', include('evaluation.urls')),
    path('api/dashboard/', include('projects.dashboard_urls')),
    path('api/settings/', include('projects.settings_urls')),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/users/me/', MeView.as_view(), name='me'),
]
