"""
Django settings for RepoSage project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent.parent / '.env')

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-secret-key-change-in-production')

DEBUG = os.getenv('DJANGO_DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'corsheaders',
    'pgvector.django',
    # Local apps
    'projects',
    'ingestion',
    'embeddings',
    'retrieval',
    'generation',
    'query',
    'evaluation',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'reposage.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'reposage.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'reposage'),
        'USER': os.getenv('DB_USER', 'reposage'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'reposage_dev'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'


# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS
cors_origins_env = os.getenv('CORS_ALLOWED_ORIGINS')
if cors_origins_env:
    CORS_ALLOWED_ORIGINS = cors_origins_env.split(',')
else:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'common.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'EXCEPTION_HANDLER': 'common.exceptions.custom_exception_handler',
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# File upload
MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_URL = '/media/'
FILE_UPLOAD_MAX_MEMORY_SIZE = 100 * 1024 * 1024  # 100MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 100 * 1024 * 1024

# Embedding config
EMBEDDING_PROVIDER = os.getenv('EMBEDDING_PROVIDER', 'sentence_transformers')
EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
EMBEDDING_DIMENSION = int(os.getenv('EMBEDDING_DIMENSION', '384'))

# Generation config
GENERATION_PROVIDER = os.getenv('GENERATION_PROVIDER', 'ollama')
GENERATION_MODEL = os.getenv('GENERATION_MODEL', 'mistral')
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')

# Retrieval config
RETRIEVAL_TOP_K = int(os.getenv('RETRIEVAL_TOP_K', '10'))
RETRIEVAL_SIMILARITY_THRESHOLD = float(os.getenv('RETRIEVAL_SIMILARITY_THRESHOLD', '0.3'))
RETRIEVAL_MODE = os.getenv('RETRIEVAL_MODE', 'vector')  # vector, hybrid, lexical

# Chunking config
CHUNK_MAX_TOKENS = int(os.getenv('CHUNK_MAX_TOKENS', '500'))
CHUNK_OVERLAP_TOKENS = int(os.getenv('CHUNK_OVERLAP_TOKENS', '50'))

# Reranker config
RERANKER_PROVIDER = os.getenv('RERANKER_PROVIDER', 'none')  # none, cross_encoder
RERANKER_MODEL = os.getenv('RERANKER_MODEL', 'cross-encoder/ms-marco-MiniLM-L-6-v2')

# Resource limits (prevent exhaustion on large repos)
MAX_FILES_PER_PROJECT = int(os.getenv('MAX_FILES_PER_PROJECT', '2000'))
MAX_FILE_SIZE_BYTES = int(os.getenv('MAX_FILE_SIZE_BYTES', str(1_048_576)))  # 1MB
MAX_CHUNK_TOKENS = int(os.getenv('MAX_CHUNK_TOKENS', '1000'))
MAX_TOP_K = int(os.getenv('MAX_TOP_K', '50'))
MAX_CONTEXT_TOKENS = int(os.getenv('MAX_CONTEXT_TOKENS', '4000'))
MAX_QUESTION_LENGTH = int(os.getenv('MAX_QUESTION_LENGTH', '2000'))

