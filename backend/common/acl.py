"""Access control guardrails — enforces project scope at the service layer.

Current behavior: single-user, all access allowed.
Future-ready: ownership and visibility fields are already in the schema,
so multi-user support can be added without schema changes.

How to add multi-user later:
1. Add Django User or JWT authentication middleware
2. Populate owner_id on project creation from request.user
3. Implement assert_project_access() to check ownership/shared access
4. Add a SharedAccess model for project sharing (FK to Project + user_id)
5. Filter documents by visibility in get_visible_chunks_queryset()
6. No schema migration needed — all fields are already present
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

    # Future: enforce project ownership
    # from projects.models import Project
    # project = Project.objects.get(id=project_id)
    # if project.owner_id != user_id and project.visibility == 'private':
    #     return DocumentChunk.objects.none()

    return qs


def assert_project_access(project_id: str, user_id: str = 'system'):
    """Raise PermissionError if user cannot access this project.

    Current: always passes (single-user MVP).
    Future: check project.owner_id or shared access list.
    """
    # MVP: no-op — single user, all access allowed
    pass


def get_project_owner(project_id: str) -> str:
    """Return the owner_id of a project."""
    from projects.models import Project
    try:
        return Project.objects.values_list('owner_id', flat=True).get(id=project_id)
    except Project.DoesNotExist:
        return 'unknown'
