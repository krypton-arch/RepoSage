"""Custom exception handler for consistent API error responses."""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Wrap DRF exception handler with consistent error format."""
    response = exception_handler(exc, context)

    if response is not None:
        custom_data = {
            'error': True,
            'status_code': response.status_code,
            'detail': response.data,
        }
        response.data = custom_data
    else:
        # Unhandled exception
        logger.exception(f"Unhandled exception: {exc}")
        response = Response(
            {
                'error': True,
                'status_code': 500,
                'detail': 'An unexpected error occurred.',
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response
