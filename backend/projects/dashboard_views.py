"""Dashboard API view — global stats across all projects."""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Sum, Count

from .models import Project
from ingestion.models import DocumentChunk, SourceDocument, IngestionJob
from query.models import QuerySession


@api_view(['GET'])
def dashboard_stats(request):
    """Return global statistics for the dashboard."""
    projects = Project.objects.all()
    total_projects = projects.count()
    total_files = SourceDocument.objects.count()
    total_chunks = DocumentChunk.objects.count()
    total_queries = QuerySession.objects.count()

    # Recent ingestion jobs
    recent_jobs = IngestionJob.objects.order_by('-created_at')[:5]
    jobs_data = [
        {
            'id': str(job.id),
            'project_name': job.project.name,
            'project_id': str(job.project.id),
            'status': job.status,
            'total_files': job.total_files,
            'processed_files': job.processed_files,
            'failed_files': job.failed_files,
            'total_chunks_created': job.total_chunks_created,
            'duration_seconds': job.duration_seconds,
            'created_at': job.created_at.isoformat(),
        }
        for job in recent_jobs
    ]

    # Failed jobs count
    failed_jobs = IngestionJob.objects.filter(status='failed').count()

    return Response({
        'total_projects': total_projects,
        'total_files': total_files,
        'total_chunks': total_chunks,
        'total_queries': total_queries,
        'failed_jobs': failed_jobs,
        'recent_jobs': jobs_data,
    })
