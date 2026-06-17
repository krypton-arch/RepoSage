"""Ingestion URL routes."""

from django.urls import path
from . import views

urlpatterns = [
    path('projects/<uuid:project_id>/upload/', views.upload_files, name='upload-files'),
    path('projects/<uuid:project_id>/upload-zip/', views.upload_zip, name='upload-zip'),
    path('projects/<uuid:project_id>/ingest/', views.trigger_ingestion, name='trigger-ingestion'),
    path('projects/<uuid:project_id>/jobs/', views.list_jobs, name='list-jobs'),
    path('projects/<uuid:project_id>/jobs/<uuid:job_id>/', views.get_job, name='get-job'),
    path('projects/<uuid:project_id>/documents/', views.list_documents, name='list-documents'),
    path('projects/<uuid:project_id>/documents/<uuid:doc_id>/chunks/', views.list_document_chunks, name='list-chunks'),
]
