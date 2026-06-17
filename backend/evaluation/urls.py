"""Evaluation URL routes."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EvaluationCaseViewSet, run_evaluation, list_runs, compare_runs

router = DefaultRouter()
router.register(r'cases', EvaluationCaseViewSet, basename='evaluation-case')

urlpatterns = [
    path('projects/<uuid:project_id>/evaluation/', include(router.urls)),
    path('projects/<uuid:project_id>/evaluation/run/', run_evaluation, name='run-evaluation'),
    path('projects/<uuid:project_id>/evaluation/cases/<uuid:case_id>/runs/', list_runs, name='list-runs'),
    path('projects/<uuid:project_id>/evaluation/compare/', compare_runs, name='compare-runs'),
]
