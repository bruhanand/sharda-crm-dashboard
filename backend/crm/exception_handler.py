"""
Custom exception handler for DRF to provide better error responses
"""
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that logs errors and returns user-friendly messages
    """
    # Call DRF's default exception handler first
    response = drf_exception_handler(exc, context)
    
    # Log the exception
    logger.error(
        f"API Exception: {exc.__class__.__name__}",
        exc_info=exc,
        extra={'context': context}
    )
    
    if response is not None:
        # Customize the response format
        custom_response_data = {
            'error': True,
            'message': str(exc),
            'details': response.data if isinstance(response.data, dict) else {'detail': response.data}
        }
        response.data = custom_response_data
    else:
        # Handle unexpected exceptions
        custom_response_data = {
            'error': True,
            'message': 'An unexpected error occurred. Please try again later.',
            'details': {}
        }
        response = Response(custom_response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return response
