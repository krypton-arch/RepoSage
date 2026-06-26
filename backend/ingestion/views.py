"""Ingestion API views — file upload, zip upload, trigger ingestion, view jobs/documents."""

from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from projects.models import Project
from ingestion.models import SourceDocument, DocumentChunk, IngestionJob
from ingestion.serializers import (
    SourceDocumentSerializer, DocumentChunkSerializer,
    IngestionJobSerializer, FileUploadSerializer, ZipUploadSerializer,
)
from ingestion.services.file_handler import save_uploaded_file, extract_zip
from ingestion.services.pipeline import run_ingestion


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_files(request, project_id):
    """Upload one or more files to a project."""
    project = get_object_or_404(Project, pk=project_id)
    from common.acl import assert_project_access
    assert_project_access(project_id, str(request.user.id))
    files = request.FILES.getlist('files')

    if not files:
        return Response(
            {'error': 'No files provided'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    saved_files = []
    for f in files:
        path = save_uploaded_file(str(project.id), f)
        saved_files.append({
            'name': f.name,
            'size': f.size,
            'path': str(path),
        })

    return Response({
        'message': f'{len(saved_files)} file(s) uploaded successfully',
        'files': saved_files,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_zip(request, project_id):
    """Upload a zip archive to a project."""
    project = get_object_or_404(Project, pk=project_id)
    from common.acl import assert_project_access
    assert_project_access(project_id, str(request.user.id))

    if 'file' not in request.FILES:
        return Response(
            {'error': 'No zip file provided'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    zip_file = request.FILES['file']
    if not zip_file.name.endswith('.zip'):
        return Response(
            {'error': 'File must be a .zip archive'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    extract_dir = extract_zip(str(project.id), zip_file)

    return Response({
        'message': 'Zip archive extracted successfully',
        'extract_dir': str(extract_dir),
    }, status=status.HTTP_201_CREATED)


import threading

@api_view(['POST'])
def trigger_ingestion(request, project_id):
    """Trigger the ingestion pipeline for a project.

    Optional body params:
        resume (bool): If true, resume a previously failed/partial job.
        job_id (uuid): The specific IngestionJob to resume.
                       Required when resume=true.
    """
    project = get_object_or_404(Project, pk=project_id)
    from common.acl import assert_project_access
    assert_project_access(project_id, str(request.user.id))

    resume = request.data.get('resume', False)
    job_id = request.data.get('job_id', None)

    if resume and job_id:
        # Resume an existing job from its last checkpoint
        job = get_object_or_404(IngestionJob, pk=job_id, project_id=project_id)
        if job.status not in ('failed', 'partial_success'):
            return Response(
                {'error': f'Job cannot be resumed (status: {job.status}). '
                          'Only failed or partial_success jobs can be resumed.'},
                status=status.HTTP_409_CONFLICT,
            )
    elif resume and not job_id:
        return Response(
            {'error': 'job_id is required when resume=true.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    else:
        # Fresh run — check no ingestion is already running
        if project.status == 'ingesting':
            return Response(
                {'error': 'Ingestion is already in progress'},
                status=status.HTTP_409_CONFLICT,
            )
        job = IngestionJob.objects.create(project=project)

    try:
        thread = threading.Thread(
            target=run_ingestion,
            args=(project, job, resume)
        )
        thread.daemon = True
        thread.start()
        
        serializer = IngestionJobSerializer(job)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'Ingestion failed to start: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
def list_jobs(request, project_id):
    """List ingestion jobs for a project."""
    project = get_object_or_404(Project, pk=project_id)
    from common.acl import assert_project_access
    assert_project_access(project_id, str(request.user.id))
    jobs = IngestionJob.objects.filter(project=project)
    serializer = IngestionJobSerializer(jobs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_job(request, project_id, job_id):
    """Get a specific ingestion job."""
    from common.acl import assert_project_access
    assert_project_access(project_id, str(request.user.id))
    job = get_object_or_404(IngestionJob, pk=job_id, project_id=project_id)
    serializer = IngestionJobSerializer(job)
    return Response(serializer.data)


@api_view(['GET'])
def list_documents(request, project_id):
    """List all indexed documents for a project."""
    project = get_object_or_404(Project, pk=project_id)
    from common.acl import assert_project_access
    assert_project_access(project_id, str(request.user.id))
    documents = SourceDocument.objects.filter(project=project)
    serializer = SourceDocumentSerializer(documents, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def list_document_chunks(request, project_id, doc_id):
    """List chunks for a specific document."""
    from common.acl import assert_project_access
    assert_project_access(project_id, str(request.user.id))
    doc = get_object_or_404(SourceDocument, pk=doc_id, project_id=project_id)
    chunks = DocumentChunk.objects.filter(document=doc)
    serializer = DocumentChunkSerializer(chunks, many=True)
    return Response(serializer.data)
