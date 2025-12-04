/**
 * Standardized error response utilities
 * Provides consistent error handling across the application
 */

/**
 * Standard error response format
 * @typedef {Object} ErrorResponse
 * @property {string} message - User-friendly error message
 * @property {string} code - Error code for programmatic handling
 * @property {Object|null} details - Additional error details
 * @property {number} timestamp - Error timestamp
 */

/**
 * Error codes for categorizing errors
 */
export const ErrorCodes = {
    // Authentication errors (401)
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',

    // Authorization errors (403)
    FORBIDDEN: 'FORBIDDEN',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

    // Validation errors (400)
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

    // Not found errors (404)
    NOT_FOUND: 'NOT_FOUND',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

    // Rate limiting (429)
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

    // Server errors (500)
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',

    // Network errors
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',

    // Application errors
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
}

/**
 * Create standardized error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object|null} details - Additional details
 * @returns {ErrorResponse}
 */
export const createErrorResponse = (message, code = ErrorCodes.UNKNOWN_ERROR, details = null) => {
    return {
        message,
        code,
        details,
        timestamp: Date.now(),
    }
}

/**
 * Parse API error response into standardized format
 * @param {Error|Response} error - Error object or response
 * @returns {ErrorResponse}
 */
export const parseApiError = async (error) => {
    // Network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
        return createErrorResponse(
            'Network error. Please check your connection.',
            ErrorCodes.NETWORK_ERROR
        )
    }

    // Timeout error
    if (error.name === 'AbortError') {
        return createErrorResponse(
            'Request timed out. Please try again.',
            ErrorCodes.TIMEOUT
        )
    }

    // API response error
    if (error.status) {
        let message = 'An error occurred'
        let code = ErrorCodes.UNKNOWN_ERROR
        let details = null

        try {
            const text = await error.text()
            try {
                details = JSON.parse(text)
                message = details.detail || details.message || message
            } catch {
                message = text || message
            }
        } catch {
            // Ignore parsing errors
        }

        // Map HTTP status to error code
        switch (error.status) {
            case 400:
                code = ErrorCodes.VALIDATION_ERROR
                message = message || 'Invalid request'
                break
            case 401:
                code = ErrorCodes.UNAUTHORIZED
                message = message || 'Please log in to continue'
                break
            case 403:
                code = ErrorCodes.FORBIDDEN
                message = message || 'You do not have permission to perform this action'
                break
            case 404:
                code = ErrorCodes.NOT_FOUND
                message = message || 'Resource not found'
                break
            case 429:
                code = ErrorCodes.RATE_LIMIT_EXCEEDED
                message = message || 'Too many requests. Please try again later.'
                break
            case 500:
            case 502:
            case 503:
                code = ErrorCodes.INTERNAL_SERVER_ERROR
                message = 'Server error. Please try again later.'
                break
            default:
                code = ErrorCodes.UNKNOWN_ERROR
        }

        return createErrorResponse(message, code, details)
    }

    // Generic error
    return createErrorResponse(
        error.message || 'An unexpected error occurred',
        ErrorCodes.UNKNOWN_ERROR,
        { originalError: error }
    )
}

/**
 * Get user-friendly error message
 * @param {ErrorResponse|Error} error - Error object
 * @returns {string}
 */
export const getErrorMessage = (error) => {
    if (typeof error === 'string') {
        return error
    }

    if (error?.message) {
        return error.message
    }

    return 'An unexpected error occurred'
}

/**
 * Check if error is specific type
 * @param {ErrorResponse} error - Error object
 * @param {string} code - Error code to check
 * @returns {boolean}
 */
export const isErrorType = (error, code) => {
    return error?.code === code
}

/**
 * Format validation errors
 * @param {Object} errors - Validation errors object
 * @returns {string}
 */
export const formatValidationErrors = (errors) => {
    if (!errors || typeof errors !== 'object') {
        return 'Validation failed'
    }

    const messages = Object.entries(errors)
        .map(([field, messages]) => {
            const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')
            const errorMsg = Array.isArray(messages) ? messages[0] : messages
            return `${fieldName}: ${errorMsg}`
        })
        .join('; ')

    return messages || 'Validation failed'
}
