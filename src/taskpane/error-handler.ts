/**
 * Enhanced Error Handler for v1 API Integration
 * 
 * Provides comprehensive error handling for modern backend agent responses
 * and user-friendly error messages
 */

export interface ApiError {
  success: boolean;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}

export class EmailAgentError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'EmailAgentError';
  }
}

export class ErrorHandler {
  /**
   * Handle API errors from v1 backend responses
   */
  static handleApiError(error: any, context: string): string {
    console.error(`Email Agent Error (${context}):`, error);
    
    // Handle fetch/network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'Unable to connect to Email Agent service. Please check your connection.';
    }
    
    // Handle HTTP response errors
    if (error.response) {
      const { status, data } = error.response;
      return this.handleHttpError(status, data);
    }
    
    // Handle structured API errors
    if (error.success === false && error.error) {
      return this.handleStructuredError(error.error);
    }
    
    // Handle validation errors
    if (error.errors && Array.isArray(error.errors)) {
      return this.handleValidationErrors(error.errors);
    }
    
    // Handle EmailAgentError instances
    if (error instanceof EmailAgentError) {
      return error.message;
    }
    
    // Handle standard Error instances
    if (error instanceof Error) {
      return error.message;
    }
    
    // Fallback for unknown error types
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Handle HTTP status codes with appropriate messages
   */
  private static handleHttpError(status: number, data?: any): string {
    switch (status) {
      case 400:
        return data?.error?.message || 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please check your credentials.';
      case 403:
        return 'Access denied. You don\'t have permission for this action.';
      case 404:
        return data?.error?.message || 'Email or workflow not found.';
      case 409:
        return data?.error?.message || 'Email already processed or conflict occurred.';
      case 422:
        return data?.error?.message || 'Workflow validation error occurred.';
      case 429:
        return 'Too many requests. Please wait a moment before trying again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return data?.error?.message || `Server error (${status}). Please try again.`;
    }
  }

  /**
   * Handle structured error objects from v1 API
   */
  private static handleStructuredError(error: { code: string; message: string; details?: any }): string {
    switch (error.code) {
      case 'WORKFLOW_NOT_FOUND':
        return 'Workflow not found. The email processing session may have expired.';
      case 'INVALID_DECISION':
        return 'Invalid decision provided. Please try again with a valid option.';
      case 'WORKFLOW_ALREADY_COMPLETED':
        return 'This workflow has already been completed.';
      case 'THREAD_NOT_FOUND':
        return 'Processing thread not found. Please start a new email analysis.';
      case 'EMAIL_NOT_FOUND':
        return 'Email not found in the system.';
      case 'CONTEXT7_UNAVAILABLE':
        return 'Contextual help service is currently unavailable.';
      case 'LLM_SERVICE_ERROR':
        return 'AI service is temporarily unavailable. Please try again later.';
      case 'EXCHANGE_CONNECTION_ERROR':
        return 'Email server connection error. Please check your connection.';
      default:
        return error.message || 'An error occurred during processing.';
    }
  }

  /**
   * Handle validation errors array
   */
  private static handleValidationErrors(errors: Array<{ code: string; message: string; field?: string }>): string {
    if (errors.length === 1) {
      const error = errors[0];
      return error.field ? `${error.field}: ${error.message}` : error.message;
    }
    
    const errorMessages = errors.map(error => 
      error.field ? `${error.field}: ${error.message}` : error.message
    );
    
    return `Multiple validation errors:\n• ${errorMessages.join('\n• ')}`;
  }

  /**
   * Create user-friendly error message for workflow interrupts
   */
  static handleInterruptError(error: any): string {
    if (error.code === 'INTERRUPT_TIMEOUT') {
      return 'Decision timeout. The workflow has been cancelled due to inactivity.';
    }
    
    if (error.code === 'INVALID_INTERRUPT_RESPONSE') {
      return 'Invalid response provided. Please select a valid option.';
    }
    
    return this.handleApiError(error, 'interrupt');
  }

  /**
   * Handle WebSocket connection errors
   */
  static handleWebSocketError(error: any): string {
    if (error.code === 'WS_CONNECTION_FAILED') {
      return 'Real-time connection failed. You may miss live updates.';
    }
    
    if (error.code === 'WS_AUTH_FAILED') {
      return 'WebSocket authentication failed. Please refresh the page.';
    }
    
    return 'Connection error occurred. Real-time updates may be delayed.';
  }

  /**
   * Handle Context7 integration errors
   */
  static handleContext7Error(error: any): string {
    if (error.code === 'CONTEXT7_NOT_AVAILABLE') {
      return 'Contextual help service is not available.';
    }
    
    if (error.code === 'CONTEXT7_LIBRARY_NOT_FOUND') {
      return 'No documentation found for this topic.';
    }
    
    if (error.code === 'CONTEXT7_QUOTA_EXCEEDED') {
      return 'Documentation service quota exceeded. Please try again later.';
    }
    
    return 'Unable to retrieve contextual help at this time.';
  }

  /**
   * Get retry suggestion based on error type
   */
  static getRetryAction(error: any): string | null {
    if (error.code === 'NETWORK_ERROR' || error.code === 'CONNECTION_TIMEOUT') {
      return 'Please check your internet connection and try again.';
    }
    
    if (error.code === 'SERVICE_UNAVAILABLE' || error.statusCode >= 500) {
      return 'The service is temporarily unavailable. Please try again in a few minutes.';
    }
    
    if (error.code === 'RATE_LIMITED') {
      return 'Please wait a moment before making another request.';
    }
    
    return null;
  }

  /**
   * Log error for debugging while returning user-friendly message
   */
  static logAndHandle(error: any, context: string): string {
    // Log detailed error for debugging
    console.error(`[ErrorHandler] ${context}:`, {
      error: error,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    });
    
    // Return user-friendly message
    return this.handleApiError(error, context);
  }
}
