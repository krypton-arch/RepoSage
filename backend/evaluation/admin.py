"""Evaluation admin configuration."""

from django.contrib import admin
from .models import EvaluationCase, EvaluationRun


@admin.register(EvaluationCase)
class EvaluationCaseAdmin(admin.ModelAdmin):
    list_display = ['question', 'project', 'benchmark_suite', 'created_at']
    search_fields = ['question', 'expected_answer_traits']
    list_filter = ['project', 'benchmark_suite']


@admin.register(EvaluationRun)
class EvaluationRunAdmin(admin.ModelAdmin):
    list_display = [
        'evaluation_case', 'retrieval_precision', 'retrieval_recall',
        'groundedness_rating', 'retrieval_latency_ms', 'status', 'created_at',
    ]
    list_filter = ['status', 'groundedness_rating']

