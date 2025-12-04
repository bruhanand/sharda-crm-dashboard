"""
Standardized error response utilities for Django REST Framework
Provides consistent error format across all API endpoints
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError
from django.http import Http404
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for consistent error responses
    
    Returns error responses in format:
    {
        "error": {
            "message": "User-friendly error message",
            "code": "ERROR_CODE",
            "details": {...}  # Optional additional details
        }
    }
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Standardize the error response
        error_data = {
            "error": {
                "message": get_error_message(exc, response),
                "code": get_error_code(exc, response.status_code),
                "details": response.data if response.data else None
            }
        }
        response.data = error_data
        
        # Log the error
        log_error(exc, context, response.status_code)
        
        return response

    # Handle Django exceptions not caught by DRF
    if isinstance(exc, Http404):
        return Response(
            {
                "error": {
                    "message": "Resource not found",
                    "code": "NOT_FOUND",
                    "details": None
                }
            },
            status=status.HTTP_404_NOT_FOUND
        )
    
    if isinstance(exc, ValidationError):
        return Response(
            {
                "error": {
                    "message": "Validation error",
                    "code": "VALIDATION_ERROR",
                    "details": {"validation_errors": exc.messages}
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Unhandled exception - log and return generic error
    logger.error(
        f"Unhandled exception: {exc}",
        exc_info=True,
        extra={"context": context}
    )
    
    return Response(
        {
            "error": {
                "message": "An internal server error occurred",
                "code": "INTERNAL_SERVER_ERROR",
                "details": None
            }
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


def get_error_message(exc, response):
    """Extract user-friendly error message"""
    # Check for detail in response data
    if hasattr(response, 'data') and isinstance(response.data, dict):
        if 'detail' in response.data:
            return str(response.data['detail'])
        if 'message' in response.data:
            return str(response.data['message'])
    
    # Check exception message
    if hasattr(exc, 'detail'):
        return str(exc.detail)
    
    # Default messages by exception type
    exc_type = type(exc).__name__
    default_messages = {
        'NotAuthenticated': 'Authentication required',
        'AuthenticationFailed': 'Invalid credentials',
        'PermissionDenied': 'You do not have permission to perform this action',
        'NotFound': 'Resource not found',
        'ValidationError': 'Invalid input provided',
        'Throttled': 'Too many requests. Please try again later.',
    }
    
    return default_messages.get(exc_type, str(exc))


def get_error_code(exc, status_code):
    """Get standardized error code"""
    exc_type = type(exc).__name__
    
    # Map exception types to codes
    code_map = {
        'NotAuthenticated': 'UNAUTHORIZED',
        'AuthenticationFailed': 'INVALID_CREDENTIALS',
        'PermissionDenied': 'FORBIDDEN',
        'NotFound': 'NOT_FOUND',
        'ValidationError': 'VALIDATION_ERROR',
        'Throttled': 'RATE_LIMIT_EXCEEDED',
    }
    
    if exc_type in code_map:
        return code_map[exc_type]
    
    # Map by status code
    status_code_map = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        405: 'METHOD_NOT_ALLOWED',
        429: 'RATE_LIMIT_EXCEEDED',
        500: 'INTERNAL_SERVER_ERROR',
        502: 'BAD_GATEWAY',
        503: 'SERVICE_UNAVAILABLE',
    }
    
    return status_code_map.get(status_code, 'UNKNOWN_ERROR')


def log_error(exc, context, status_code):
    """Log error with appropriate level"""
    request = context.get('request')
    view = context.get('view')
    
    extra = {
        'status_code': status_code,
        'exception_type': type(exc).__name__,
        'view': view.__class__.__name__ if view else None,
        'path': request.path if request else None,
        'method': request.method if request else None,
        'user': str(request.user) if request and hasattr(request, 'user') else None,
    }
    
    # Log 5xx as errors, 4xx as warnings
    if status_code >= 500:
        logger.error(
            f"Server error: {exc}",
            exc_info=True,
            extra=extra
        )
    elif status_code >= 400:
        logger.warning(
            f"Client error: {exc}",
            extra=extra
        )
