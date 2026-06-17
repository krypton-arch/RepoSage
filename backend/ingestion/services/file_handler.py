"""File handler — manages file intake, zip extraction, and file registration."""

import hashlib
import os
import shutil
import zipfile
import tempfile
from pathlib import Path
from django.conf import settings
from ingestion.models import SourceDocument


# File type to language mapping
EXTENSION_LANGUAGE_MAP = {
    '.py': 'python',
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'javascript',
    '.tsx': 'typescript',
    '.java': 'java',
    '.kt': 'kotlin',
    '.rs': 'rust',
    '.go': 'go',
    '.rb': 'ruby',
    '.cpp': 'cpp',
    '.c': 'c',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.swift': 'swift',
    '.php': 'php',
    '.r': 'r',
    '.scala': 'scala',
    '.sh': 'shell',
    '.bash': 'shell',
    '.md': 'markdown',
    '.rst': 'restructuredtext',
    '.txt': 'text',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.xml': 'xml',
    '.html': 'html',
    '.css': 'css',
    '.sql': 'sql',
    '.dockerfile': 'dockerfile',
    '.proto': 'protobuf',
    '.graphql': 'graphql',
    '.vue': 'vue',
    '.svelte': 'svelte',
}

# Files to skip during ingestion
SKIP_PATTERNS = {
    '__pycache__', '.git', 'node_modules', '.venv', 'venv', '.env',
    '.idea', '.vscode', '.DS_Store', 'dist', 'build', '.next',
    'target', '.gradle', '.mypy_cache', '.pytest_cache', '__MACOSX',
    '.tox', 'egg-info', '.eggs',
}

# Binary extensions to skip
BINARY_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
    '.mp3', '.mp4', '.wav', '.avi', '.mov',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib', '.o', '.class', '.jar',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.pyc', '.pyo', '.db', '.sqlite', '.sqlite3',
    '.lock', '.min.js', '.min.css', '.map',
}

MAX_FILE_SIZE = 1 * 1024 * 1024  # 1MB per file


def compute_file_hash(content: bytes) -> str:
    """Compute SHA-256 hash of file content."""
    return hashlib.sha256(content).hexdigest()


def get_file_type(file_path: str) -> str:
    """Determine file type from extension."""
    ext = Path(file_path).suffix.lower()
    if ext in ('.md', '.mdx'):
        return 'markdown'
    elif ext in EXTENSION_LANGUAGE_MAP and EXTENSION_LANGUAGE_MAP[ext] not in ('markdown', 'text', 'json', 'yaml', 'toml', 'xml'):
        return 'code'
    elif ext in ('.json', '.yaml', '.yml', '.toml', '.xml', '.ini', '.cfg', '.conf', '.env'):
        return 'config'
    elif ext in ('.txt', '.rst', '.log'):
        return 'text'
    else:
        return 'text'


def get_language(file_path: str) -> str:
    """Get language from file extension."""
    ext = Path(file_path).suffix.lower()
    return EXTENSION_LANGUAGE_MAP.get(ext, '')


def should_skip_path(path: str) -> bool:
    """Check if a file path should be skipped during ingestion."""
    parts = Path(path).parts
    for part in parts:
        if part in SKIP_PATTERNS:
            return True
    ext = Path(path).suffix.lower()
    if ext in BINARY_EXTENSIONS:
        return True
    return False


def get_project_upload_dir(project_id: str) -> Path:
    """Get the upload directory for a project."""
    upload_dir = Path(settings.MEDIA_ROOT) / 'projects' / str(project_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def save_uploaded_file(project_id: str, uploaded_file) -> Path:
    """Save an uploaded file to the project directory."""
    upload_dir = get_project_upload_dir(project_id)
    file_path = upload_dir / uploaded_file.name
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, 'wb+') as dest:
        for chunk in uploaded_file.chunks():
            dest.write(chunk)
    return file_path


def extract_zip(project_id: str, zip_file) -> Path:
    """Extract a zip archive to the project directory."""
    upload_dir = get_project_upload_dir(project_id)
    # Save zip temporarily
    temp_zip = upload_dir / '_temp_upload.zip'
    with open(temp_zip, 'wb+') as dest:
        for chunk in zip_file.chunks():
            dest.write(chunk)
    # Extract
    with zipfile.ZipFile(temp_zip, 'r') as zf:
        zf.extractall(upload_dir)
    # Cleanup temp zip
    temp_zip.unlink()
    return upload_dir


def discover_files(base_dir: Path) -> list[dict]:
    """Walk a directory and discover all indexable files."""
    files = []
    for root, dirs, filenames in os.walk(base_dir):
        # Filter out skip directories in-place
        dirs[:] = [d for d in dirs if d not in SKIP_PATTERNS]
        for filename in filenames:
            full_path = Path(root) / filename
            rel_path = full_path.relative_to(base_dir)
            rel_str = str(rel_path).replace('\\', '/')

            if should_skip_path(rel_str):
                continue

            file_size = full_path.stat().st_size
            if file_size > MAX_FILE_SIZE:
                continue
            if file_size == 0:
                continue

            files.append({
                'full_path': str(full_path),
                'rel_path': rel_str,
                'file_name': filename,
                'file_type': get_file_type(rel_str),
                'language': get_language(rel_str),
                'file_size_bytes': file_size,
            })
    return files


def register_documents(project, file_infos: list[dict]) -> list[SourceDocument]:
    """Register discovered files as SourceDocument records."""
    documents = []
    for info in file_infos:
        # Read content and hash
        with open(info['full_path'], 'rb') as f:
            content = f.read()
        content_hash = compute_file_hash(content)

        # Check if document already exists with same hash (deduplication)
        existing = SourceDocument.objects.filter(
            project=project,
            file_path=info['rel_path'],
        ).first()

        if existing and existing.content_hash == content_hash:
            # Skip unchanged files
            continue
        elif existing:
            # Delete old chunks for changed files
            existing.chunks.all().delete()
            existing.content_hash = content_hash
            existing.file_size_bytes = info['file_size_bytes']
            existing.status = SourceDocument.Status.PENDING
            existing.save()
            documents.append(existing)
        else:
            doc = SourceDocument.objects.create(
                project=project,
                file_path=info['rel_path'],
                file_name=info['file_name'],
                file_type=info['file_type'],
                language=info['language'],
                file_size_bytes=info['file_size_bytes'],
                content_hash=content_hash,
                status=SourceDocument.Status.PENDING,
            )
            documents.append(doc)

    return documents
