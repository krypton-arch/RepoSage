"""RepoSage URL Configuration."""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/projects/', include('projects.urls')),
    path('api/ingestion/', include('ingestion.urls')),
    path('api/query/', include('query.urls')),
    path('api/evaluation/', include('evaluation.urls')),
    path('api/dashboard/', include('projects.dashboard_urls')),
]
