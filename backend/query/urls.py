"""Query URL routes."""

from django.urls import path
from . import views

urlpatterns = [
    path('projects/<uuid:project_id>/query/', views.ask_question, name='ask-question'),
    path('projects/<uuid:project_id>/queries/', views.list_queries, name='list-queries'),
    path('projects/<uuid:project_id>/queries/<uuid:query_id>/', views.get_query, name='get-query'),
]
