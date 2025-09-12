import { 
  InterruptResponse,
  EmailClassification,
  HITLWorkflowRequest,
  HITLWorkflowResponse,
  HITLWorkflowStatus,
  ChatMessageRequest,
  ChatMessageResponse,
  HITLDecisionRequest,
  EmailContext
} from '../models/api-types';
import { 
  ProcessEmailRequest, 
  ProcessEmailResponse, 
  ErrorDetails
} from '../models/types';
import { ErrorHandler, EmailAgentError } from './error-handler';
import { getCurrentUserEmail, getCurrentEmailContext } from '../utils/office-helpers';

export interface ChatRequest {
  subject: string;
  sender: string;
  body: string;
  message: string;
}

export interface ChatResponse {
  response: string;
  success: boolean;
  error?: string;
}

export interface EmailClassificationRequest {
  subject: string;
  sender: string;
  body: string;
  to?: string;
  message_id?: string;
  timestamp?: string;
}

// Use the centralized EmailClassification type from models/types.ts
export type EmailClassificationResponse = EmailClassification;


export interface SystemStatus {
  status: string;
  message: string;
  checks: {
    exchange: boolean;
    database: boolean;
    llm: boolean;
  };
}

export class AgentApiClient {
  private baseUrl: string;
  private headers: Headers;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.headers = new Headers({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  // Legacy email processing (keeping for compatibility)
  async processEmail(request: ProcessEmailRequest): Promise<ProcessEmailResponse> {
    const response = await fetch(`${this.baseUrl}/api/process-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        subject: request.email_context.subject,
        sender: request.email_context.sender,
        body: request.email_context.body
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    // Transform response to match expected format
    return {
      thread_id: result.id || Math.random().toString(36),
      status: result.classification?.action || 'completed',
      result: result.response || result,
      requires_human_input: false,
      interrupt_data: undefined
    };
  }

  /**
   * Enhanced chat with automatic vector search context
   * Main endpoint for all chat interactions
   */
  async sendChatMessage(message: string): Promise<ChatMessageResponse> {
    try {
      const userEmail = getCurrentUserEmail();
      console.log(`💬 Enhanced chat from user ${userEmail}: "${message}"`);
      
      // Try to get current email context to enhance chat with email context
      let emailContext = null;
      try {
        emailContext = await getCurrentEmailContext();
        if (emailContext) {
          console.log('📧 Including current email context in chat request:', {
            subject: emailContext.subject,
            sender: emailContext.sender,
            recipient: emailContext.recipient
          });
        }
      } catch (error) {
        console.log('📧 No email context available for chat enhancement');
      }
      
      // Create proper request payload with required user_id
      const requestPayload = {
        message,
        user_id: userEmail, // Use current Outlook user's email
        context: emailContext // Include email context if available
      };
      
      const response = await fetch(`${this.baseUrl}/api/chat/message`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw new Error(`API Error ${response.status}: ${errorData.detail || 'Chat failed'}`);
      }

      const result: ChatMessageResponse = await response.json();
      console.log('✨ Enhanced chat response:', result);
      
      return result;
    } catch (error) {
      console.error('Enhanced chat failed:', error);
      // Return error as a ChatMessageResponse with error in the response
      return {
        response: `Error: ${error instanceof Error ? error.message : 'Network error'}`,
        data: { query_type: 'error' }
      };
    }
  }

  // Legacy chat functionality using correct v1 API endpoint
  async chatAboutEmail(emailId: string, message: string): Promise<ChatResponse> {
    try {
      console.log(`🗣️ Chatting about email ${emailId} with message: "${message}"`);
      
      const response = await fetch(`${this.baseUrl}/api/v1/emails/${emailId}/chat`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ message: message }),
      });

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        return {
          success: false,
          response: '',
          error: `API Error ${response.status}: ${errorData.error?.message || errorData.detail || 'Chat request failed'}`
        };
      }

      const result = await response.json();
      console.log('💬 Chat response received:', result);
      
      // Handle v1 API response format
      if (result.success && result.data) {
        return {
          success: true,
          response: result.data.response || result.data.message || result.data,
          error: undefined
        };
      } else if (result.response || result.message) {
        // Direct response format
        return {
          success: true,
          response: result.response || result.message,
          error: undefined
        };
      } else {
        return {
          success: false,
          response: '',
          error: 'No response received from agent'
        };
      }
    } catch (error) {
      console.error('Chat request failed:', error);
      return {
        success: false,
        response: '',
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  // Create or get email in backend system
  async createOrGetEmail(emailData: {
    subject: string;
    sender: string;
    body: string;
    to?: string;
    message_id?: string;
    timestamp?: string;
  }): Promise<string> {
    try {
      console.log('📧 Creating/getting email in backend:', emailData.message_id || 'new email');
      
      const response = await fetch(`${this.baseUrl}/api/v1/emails/`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          subject: emailData.subject,
          sender: emailData.sender,
          body: emailData.body,
          to: emailData.to,
          message_id: emailData.message_id,
          timestamp: emailData.timestamp
        }),
      });

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw new EmailAgentError(
          ErrorHandler.handleApiError(errorData, 'createOrGetEmail'),
          errorData.error?.code,
          response.status,
          errorData
        );
      }

      const result = await response.json();
      console.log('📧 Email created/retrieved:', result);
      
      // Extract email ID from response
      if (result.success && result.data?.id) {
        return result.data.id;
      } else if (result.id) {
        return result.id;
      } else {
        throw new EmailAgentError('No email ID received from backend');
      }
    } catch (error) {
      const errorMessage = ErrorHandler.logAndHandle(error, 'createOrGetEmail');
      throw error instanceof EmailAgentError ? error : new EmailAgentError(errorMessage);
    }
  }

  // Modern v1 API: Create workflow for email processing
  async createEmailWorkflow(emailId: string, forceReprocess: boolean = false): Promise<EmailClassificationResponse> {
    try {
      console.log('🆕 Creating workflow for email:', emailId);
      
      const response = await fetch(`${this.baseUrl}/api/v1/emails/${emailId}/workflows`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ force_reprocess: forceReprocess }),
      });

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw new EmailAgentError(
          ErrorHandler.handleApiError(errorData, 'createEmailWorkflow'),
          errorData.error?.code,
          response.status,
          errorData
        );
      }

      const result = await response.json();
      
      // Check for API-level errors in successful responses
      if (result.success === false) {
        throw new EmailAgentError(
          ErrorHandler.handleApiError(result, 'createEmailWorkflow'),
          result.error?.code
        );
      }
      
      console.log('📋 Workflow creation result:', result);
      return result.data || result;
    } catch (error) {
      const errorMessage = ErrorHandler.logAndHandle(error, 'createEmailWorkflow');
      throw error instanceof EmailAgentError ? error : new EmailAgentError(errorMessage);
    }
  }

  // Email classification using v1 API workflow endpoint
  async classifyEmail(request: EmailClassificationRequest): Promise<EmailClassificationResponse> {
    try {
      console.log('🆕 Processing email with v1 workflow API:', request.message_id);
      
      // First create/get the email in the backend
      const emailId = await this.createOrGetEmail({
        subject: request.subject,
        sender: request.sender,
        body: request.body,
        to: request.to,
        message_id: request.message_id,
        timestamp: request.timestamp
      });

      console.log('📧 Starting workflow for email ID:', emailId);

      // Start the workflow using the v1 API
      const response = await this.createEmailWorkflow(emailId, false);
      
      console.log('📋 Classification workflow result:', response);
      
      // Store thread_id for future reference if email has message_id
      if (response.thread_id && request.message_id) {
        localStorage.setItem(`email_thread_${request.message_id}`, response.thread_id);
        console.log(`💾 Stored thread_id ${response.thread_id} for email ${request.message_id}`);
      }
      
      return response;
    } catch (error) {
      console.error('Email classification failed:', error);
      throw error;
    }
  }

  // Resume workflow after human decision (v1 API format)
  async resumeWorkflow(threadId: string, decision: string, reasoning?: string): Promise<EmailClassificationResponse> {
    try {
      console.log('🔄 Resuming workflow for thread:', threadId, 'with decision:', decision);
      
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${threadId}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({
          decision: decision,
          reasoning: reasoning || 'Decision made via Outlook plugin'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Workflow resumed successfully:', result);
      
      return result;
    } catch (error) {
      console.error('Error resuming workflow:', error);
      throw error;
    }
  }

  // Get workflow status without triggering re-execution (v1 API)
  async getWorkflowStatus(threadId: string): Promise<EmailClassificationResponse> {
    try {
      console.log('🔍 Getting workflow status for thread:', threadId);
      
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${threadId}`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('📊 Workflow status:', result);
      
      return result;
    } catch (error) {
      console.error('Error getting workflow status:', error);
      throw error;
    }
  }

  /**
   * Start HITL workflow for email classification
   */
  async startHITLWorkflow(emailData: EmailContext): Promise<HITLWorkflowResponse> {
    try {
      const userEmail = getCurrentUserEmail();
      console.log(`🔄 Starting HITL workflow for user ${userEmail}:`, emailData.subject);
      
      const requestPayload = {
        email: emailData,
        user_id: userEmail // Use current Outlook user's email
      };
      
      const response = await fetch(`${this.baseUrl}/api/hitl/workflow`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        return {
          success: false,
          workflow_id: '',
          status: 'error',
          error: `API Error ${response.status}: ${errorData.error?.message || 'Workflow failed'}`
        };
      }

      const result = await response.json();
      console.log('🚀 HITL workflow started:', result);
      
      // Add success field that frontend expects
      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error('HITL workflow failed:', error);
      return {
        success: false,
        workflow_id: '',
        status: 'error',
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get workflow status and results
   */
  async getHITLWorkflowStatus(workflowId: string): Promise<HITLWorkflowStatus> {
    try {
      console.log('📊 Getting workflow status:', workflowId);
      
      const response = await fetch(`${this.baseUrl}/api/hitl/workflow/${workflowId}`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting workflow status:', error);
      throw error;
    }
  }

  /**
   * Submit human decision to resume workflow
   */
  async submitHITLDecision(workflowId: string, decision: string | { decision: string; proposed_reply?: string }): Promise<HITLWorkflowStatus> {
    try {
      // Handle both string and object formats
      const payload = typeof decision === 'string' ? { decision } : decision;
      console.log('✅ Submitting decision:', { workflowId, payload });
      
      const response = await fetch(`${this.baseUrl}/api/hitl/workflow/${workflowId}/decision`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 400) {
          // Handle already completed workflow
          const errorData = await this.parseErrorResponse(response);
          throw new EmailAgentError(
            errorData.detail || 'Workflow already completed',
            'WORKFLOW_ALREADY_COMPLETED',
            400,
            errorData
          );
        }
        
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting decision:', error);
      throw error;
    }
  }

  // Get guidance for information-needed emails
  async getEmailGuidance(emailId: string): Promise<ChatResponse> {
    const message = "What specific information or actions are needed for this email?";
    return this.chatAboutEmail(emailId, message);
  }

  // System status (v1 API)
  async getSystemStatus(): Promise<SystemStatus> {
    const response = await fetch(`${this.baseUrl}/api/v1/system/health`, {
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // Legacy compatibility methods
  async resumeInterrupt(threadId: string, interruptResponse: InterruptResponse): Promise<ProcessEmailResponse> {
    // This endpoint might not exist in the new LangChain agent
    // Keeping for backward compatibility but should be updated based on actual API
    const response = await fetch(`${this.baseUrl}/api/interrupt/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        thread_id: threadId,
        response: interruptResponse,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async getThreadStatus(threadId: string): Promise<EmailClassificationResponse> {
    // This endpoint might not exist in the new LangChain agent
    // Keeping for backward compatibility
    const response = await fetch(`${this.baseUrl}/api/thread/${threadId}/status`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Health check for the new backend
   */
  async healthCheck(): Promise<boolean> {
    try {
      console.log('[ApiClient] Performing health check to:', `${this.baseUrl}/api/health`);
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: this.headers,
      });
      console.log('[ApiClient] Health check response:', response.status, response.ok);
      return response.ok;
    } catch (error) {
      console.error('[ApiClient] Health check failed:', error);
      return false;
    }
  }

  /**
   * Parse error response from API calls
   */
  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        return { error: { message: text, code: 'HTTP_ERROR' } };
      }
    } catch (error) {
      return { 
        error: { 
          message: `HTTP ${response.status}: ${response.statusText}`, 
          code: 'PARSE_ERROR' 
        } 
      };
    }
  }
}

// Create singleton instance
export const apiClient = new AgentApiClient();