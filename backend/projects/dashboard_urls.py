"""Dashboard API for global stats."""

from django.urls import path
from .dashboard_views import dashboard_stats

urlpatterns = [
    path('', dashboard_stats, name='dashboard-stats'),
]
