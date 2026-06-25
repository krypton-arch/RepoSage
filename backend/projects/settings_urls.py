from django.urls import path
from .settings_views import global_settings

urlpatterns = [
    path('', global_settings, name='global-settings'),
]
