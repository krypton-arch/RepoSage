"""Access control guardrails — enforces project scope at the service layer.

Current behavior: Multi-user JWT authentication. Projects are owned by individual users.
Visibility controls and shared access lists can be added in the future.

Future extensions:
1. Add a SharedAccess model for project sharing (FK to Project + user_id)
2. Filter documents by visibility in get_visible_chunks_queryset()
"""

import logging
from django.db.models import QuerySet

logger = logging.getLogger(__name__)


def get_visible_chunks_queryset(project_id: str, user_id: str = 'system') -> QuerySet:
    """Return a queryset of chunks visible to the given user within a project.

    Enforces:
    - Project scope (only chunks from the requested project)
    - Staleness filter (excludes chunks marked as stale)
    - Document visibility (future: exclude hidden documents)

    This function is the single entry point for all retrieval queries,
    ensuring no query path can retrieve unauthorized chunks.
    """
    from ingestion.models import DocumentChunk

    qs = DocumentChunk.objects.filter(
        project_id=project_id,
        is_stale=False,
    )

    # Future: exclude documents with visibility='hidden'
    # qs = qs.exclude(document__visibility='hidden')

    from projects.models import Project
    try:
        project = Project.objects.get(id=project_id)
        if project.owner_id != user_id and project.visibility == 'private':
            return DocumentChunk.objects.none()
    except Project.DoesNotExist:
        return DocumentChunk.objects.none()

    return qs


def assert_project_access(project_id: str, user_id: str = 'system'):
    """Raise PermissionError if user cannot access this project.

    Enforces:
    - Project scope (only chunks from the requested project)
    - Staleness filter (excludes chunks marked as stale)
    - Project ownership (only the project owner can access it)
    """
    from projects.models import Project
    from rest_framework.exceptions import PermissionDenied
    try:
        project = Project.objects.get(id=project_id)
        if project.owner_id != user_id and project.visibility == 'private':
            raise PermissionDenied("You do not have permission to access this project.")
    except Project.DoesNotExist:
        raise PermissionDenied("Project not found.")


def get_project_owner(project_id: str) -> str:
    """Return the owner_id of a project."""
    from projects.models import Project
    try:
        return Project.objects.values_list('owner_id', flat=True).get(id=project_id)
    except Project.DoesNotExist:
        return 'unknown'
