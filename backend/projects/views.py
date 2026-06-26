"""Project API views."""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Avg
from .models import Project
from .serializers import (
    ProjectSerializer, ProjectCreateSerializer,
    ProjectStatsSerializer, ProjectSettingsSerializer,
)
from ingestion.models import DocumentChunk, SourceDocument, IngestionJob
from common.versioning import get_staleness_report


class ProjectViewSet(viewsets.ModelViewSet):
    """CRUD API for projects."""

    serializer_class = ProjectSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description', 'source_path']

    def get_queryset(self):
        """Return only projects owned by the requesting user."""
        return Project.objects.filter(owner_id=str(self.request.user.id))

    def get_serializer_class(self):
        if self.action == 'create':
            return ProjectCreateSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        """Inject the user ID as the owner_id upon creation."""
        serializer.save(owner_id=str(self.request.user.id))

    def perform_destroy(self, instance):
        """Delete project and all associated data."""
        instance.delete()

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get detailed statistics for a project."""
        project = self.get_object()

        # Chunk distribution by type
        chunks_by_type = dict(
            DocumentChunk.objects.filter(project=project)
            .values_list('chunk_type')
            .annotate(count=Count('id'))
            .values_list('chunk_type', 'count')
        )

        # Chunk distribution by language
        chunks_by_language = dict(
            SourceDocument.objects.filter(project=project)
            .exclude(language='')
            .values_list('language')
            .annotate(count=Count('id'))
            .values_list('language', 'count')
        )

        # Average chunk token count
        avg_tokens = DocumentChunk.objects.filter(project=project).aggregate(
            avg=Avg('token_count')
        )['avg'] or 0

        # Last ingestion job
        last_job = IngestionJob.objects.filter(project=project).first()
        last_job_data = None
        if last_job:
            last_job_data = {
                'id': str(last_job.id),
                'status': last_job.status,
                'total_files': last_job.total_files,
                'processed_files': last_job.processed_files,
                'failed_files': last_job.failed_files,
                'total_chunks_created': last_job.total_chunks_created,
                'duration_seconds': last_job.duration_seconds,
                'created_at': last_job.created_at.isoformat(),
            }

        # Query and eval counts
        total_queries = project.query_sessions.count()
        total_eval_cases = project.evaluation_cases.count()

        data = {
            'total_files': project.total_files,
            'total_chunks': project.total_chunks,
            'chunks_by_type': chunks_by_type,
            'chunks_by_language': chunks_by_language,
            'total_queries': total_queries,
            'total_eval_cases': total_eval_cases,
            'last_ingestion_job': last_job_data,
            'avg_chunk_tokens': round(avg_tokens, 1),
        }

        serializer = ProjectStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='settings')
    def project_settings(self, request, pk=None):
        """PATCH retrieval and access-control settings for a project.

        Accepts partial updates for: retrieval_mode, retrieval_top_k,
        max_context_tokens, visibility.

        Example:
            PATCH /api/projects/<id>/settings/
            {"retrieval_mode": "hybrid", "retrieval_top_k": 15}
        """
        project = self.get_object()
        serializer = ProjectSettingsSerializer(project, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Return full project representation after update
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['get'], url_path='staleness')
    def staleness(self, request, pk=None):
        """GET staleness report for a project.

        Returns counts of stale documents/chunks and the current
        pipeline version constants, so the frontend can show a
        "re-index needed" banner.
        """
        project = self.get_object()
        report = get_staleness_report(str(project.id))
        return Response(report)
