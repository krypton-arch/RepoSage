"""Management command to ingest a project."""

from django.core.management.base import BaseCommand, CommandError
from projects.models import Project
from ingestion.services.pipeline import run_ingestion


class Command(BaseCommand):
    help = 'Run the ingestion pipeline for a project.'

    def add_arguments(self, parser):
        parser.add_argument('project_id', type=str, help='UUID of the project to ingest')

    def handle(self, *args, **options):
        project_id = options['project_id']

        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            raise CommandError(f'Project {project_id} does not exist.')

        self.stdout.write(f'Starting ingestion for project: {project.name}')
        job = run_ingestion(project)

        self.stdout.write(self.style.SUCCESS(
            f'Ingestion complete! '
            f'Files: {job.processed_files}/{job.total_files}, '
            f'Chunks: {job.total_chunks_created}, '
            f'Failures: {job.failed_files}, '
            f'Duration: {job.duration_seconds:.1f}s'
        ))
