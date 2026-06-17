"""Project admin configuration."""

from django.contrib import admin
from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'source_type', 'total_files', 'total_chunks', 'last_indexed_at', 'created_at']
    list_filter = ['status', 'source_type']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
