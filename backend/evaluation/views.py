"""Evaluation API views — CRUD for test cases, batch evaluation runner, and run comparison."""

import time
from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.conf import settings as django_settings

from projects.models import Project
from evaluation.models import EvaluationCase, EvaluationRun
from evaluation.serializers import (
    EvaluationCaseSerializer, EvaluationRunSerializer,
    EvaluationRunCompactSerializer,
)
from generation.services import generate_answer
from common.versioning import get_current_versions


class EvaluationCaseViewSet(viewsets.ModelViewSet):
    """CRUD for evaluation test cases."""
    serializer_class = EvaluationCaseSerializer

    def get_queryset(self):
        project_id = self.kwargs.get('project_id')
        return EvaluationCase.objects.filter(project_id=project_id)

    def perform_create(self, serializer):
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(Project, pk=project_id)
        serializer.save(project=project)


def _build_run_config(project: Project) -> dict:
    """Snapshot the current retrieval/generation config for reproducibility."""
    versions = get_current_versions()
    return {
        'retrieval_mode': project.retrieval_mode,
        'retrieval_top_k': project.retrieval_top_k,
        'max_context_tokens': project.max_context_tokens,
        'embedding_model': versions['embedding_model'],
        'embedding_version': versions['embedding_version'],
        'generation_model': getattr(django_settings, 'GENERATION_MODEL', 'mistral'),
        'parser_version': versions['parser_version'],
        'chunker_version': versions['chunker_version'],
    }


@api_view(['POST'])
def run_evaluation(request, project_id):
    """Run evaluation across all test cases for a project.

    For each case:
    1. Run the query pipeline
    2. Compute retrieval precision and recall against expected_source_files
    3. Record split latencies and config snapshot
    4. Store the run result
    """
    project = get_object_or_404(Project, pk=project_id)
    top_k = request.data.get('top_k', 10)

    cases = EvaluationCase.objects.filter(project=project)
    if not cases.exists():
        return Response(
            {'error': 'No evaluation cases found for this project'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Snapshot config once for the entire batch
    run_config = _build_run_config(project)

    results = []
    for case in cases:
        start_time = time.time()

        # Run pipeline
        result = generate_answer(
            project_id=str(project.id),
            question=case.question,
            top_k=top_k,
        )

        # Compute retrieval metrics
        actual_files = set(c['file_path'] for c in result['retrieved_chunks'])
        expected_files = set(case.expected_source_files) if case.expected_source_files else set()

        if expected_files:
            true_positives = actual_files & expected_files
            precision = len(true_positives) / len(actual_files) if actual_files else 0
            recall = len(true_positives) / len(expected_files)
            expected_files_retrieved = expected_files.issubset(actual_files)
        else:
            precision = None
            recall = None
            expected_files_retrieved = None

        duration = time.time() - start_time

        # Store run with config snapshot and split metrics
        run = EvaluationRun.objects.create(
            evaluation_case=case,
            generated_answer=result['answer'],
            retrieved_chunks=[c['file_path'] for c in result['retrieved_chunks']],
            expected_files_retrieved=expected_files_retrieved,
            retrieval_precision=precision,
            status=EvaluationRun.Status.COMPLETED,
            duration_seconds=round(duration, 2),
            # Config snapshot
            run_config=run_config,
            # Split metrics
            retrieval_recall=recall,
            retrieval_latency_ms=result.get('retrieval_time_ms'),
            generation_latency_ms=result.get('generation_time_ms'),
            context_tokens_used=result.get('context_token_estimate'),
        )

        results.append({
            'case_id': str(case.id),
            'question': case.question,
            'run_id': str(run.id),
            'retrieval_precision': precision,
            'retrieval_recall': recall,
            'expected_files_retrieved': expected_files_retrieved,
            'confidence_level': result['confidence_level'],
            'retrieval_time_ms': result['retrieval_time_ms'],
            'generation_time_ms': result['generation_time_ms'],
            'duration_seconds': round(duration, 2),
        })

    # Compute aggregate metrics
    precisions = [r['retrieval_precision'] for r in results if r['retrieval_precision'] is not None]
    recalls = [r['retrieval_recall'] for r in results if r['retrieval_recall'] is not None]
    files_retrieved = [r['expected_files_retrieved'] for r in results if r['expected_files_retrieved'] is not None]

    summary = {
        'total_cases': len(results),
        'avg_retrieval_precision': round(sum(precisions) / len(precisions), 3) if precisions else None,
        'avg_retrieval_recall': round(sum(recalls) / len(recalls), 3) if recalls else None,
        'expected_files_hit_rate': round(sum(1 for x in files_retrieved if x) / len(files_retrieved), 3) if files_retrieved else None,
        'avg_duration_seconds': round(sum(r['duration_seconds'] for r in results) / len(results), 2) if results else 0,
        'run_config': run_config,
    }

    return Response({
        'summary': summary,
        'results': results,
    })


@api_view(['GET'])
def list_runs(request, project_id, case_id):
    """List evaluation runs for a specific case."""
    case = get_object_or_404(EvaluationCase, pk=case_id, project_id=project_id)
    runs = EvaluationRun.objects.filter(evaluation_case=case)
    serializer = EvaluationRunSerializer(runs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def compare_runs(request, project_id):
    """Compare two evaluation runs side-by-side.

    Query params:
        run_a (uuid): First run ID
        run_b (uuid): Second run ID

    Returns deltas for precision, recall, latency, and config differences.
    """
    project = get_object_or_404(Project, pk=project_id)

    run_a_id = request.query_params.get('run_a')
    run_b_id = request.query_params.get('run_b')

    if not run_a_id or not run_b_id:
        return Response(
            {'error': 'Both run_a and run_b query params are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    run_a = get_object_or_404(
        EvaluationRun, pk=run_a_id,
        evaluation_case__project=project,
    )
    run_b = get_object_or_404(
        EvaluationRun, pk=run_b_id,
        evaluation_case__project=project,
    )

    def _safe_delta(a, b):
        """Compute b - a, returning None if either is None."""
        if a is None or b is None:
            return None
        return round(b - a, 4)

    # Build config diff (keys that changed between runs)
    config_a = run_a.run_config or {}
    config_b = run_b.run_config or {}
    all_keys = set(config_a.keys()) | set(config_b.keys())
    config_diff = {
        k: {'run_a': config_a.get(k), 'run_b': config_b.get(k)}
        for k in all_keys
        if config_a.get(k) != config_b.get(k)
    }

    comparison = {
        'run_a': EvaluationRunCompactSerializer(run_a).data,
        'run_b': EvaluationRunCompactSerializer(run_b).data,
        'deltas': {
            'retrieval_precision': _safe_delta(run_a.retrieval_precision, run_b.retrieval_precision),
            'retrieval_recall': _safe_delta(run_a.retrieval_recall, run_b.retrieval_recall),
            'retrieval_latency_ms': _safe_delta(run_a.retrieval_latency_ms, run_b.retrieval_latency_ms),
            'generation_latency_ms': _safe_delta(run_a.generation_latency_ms, run_b.generation_latency_ms),
            'context_tokens_used': _safe_delta(
                run_a.context_tokens_used and float(run_a.context_tokens_used),
                run_b.context_tokens_used and float(run_b.context_tokens_used),
            ),
            'duration_seconds': _safe_delta(run_a.duration_seconds, run_b.duration_seconds),
        },
        'config_diff': config_diff,
    }

    return Response(comparison)
