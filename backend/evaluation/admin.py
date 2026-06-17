"""Evaluation admin configuration."""

from django.contrib import admin
from .models import EvaluationCase, EvaluationRun


@admin.register(EvaluationCase)
class EvaluationCaseAdmin(admin.ModelAdmin):
    list_display = ['question', 'project', 'created_at']
    search_fields = ['question', 'expected_answer']
    list_filter = ['project']


@admin.register(EvaluationRun)
class EvaluationRunAdmin(admin.ModelAdmin):
    list_display = ['case', 'retrieval_precision', 'retrieval_recall', 'confidence_level', 'retrieval_time_ms', 'created_at']
    list_filter = ['confidence_level']
