import { ProcessEmailRequest, ProcessEmailResponse, InterruptResponse } from '../models/types';

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
}

export interface EmailClassificationResponse {
  classification: 'ignore' | 'auto-reply' | 'information-needed';
  reasoning: string;
  confidence: number;
  auto_response: string | null;
  reply_sent: boolean;
  action_completed: boolean;
  context_enriched: boolean;
  // Human-in-the-loop fields (based on your backend logs)
  interrupted?: boolean;
  thread_id?: string;
  interrupt_data?: {
    type?: string;
    options?: string[];
    classification?: string;
    reasoning?: string;
    confidence?: number;
    [key: string]: any;
  };
  processing_time_ms?: number;
  message?: string;
}


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

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
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
      interrupt_data: null
    };
  }

  // New chat functionality
  async chatAboutEmail(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          response: '',
          error: `API Error ${response.status}: ${errorText}`
        };
      }

      const result = await response.json();
      
      // Transform the backend response to match our expected format
      // Backend returns: {"response": "..."}
      // UI expects: {"success": true, "response": "..."}
      if (result.response || result.message) {
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

  // Email classification functionality - LangGraph compliant (only for NEW emails)
  async classifyEmail(request: EmailClassificationRequest): Promise<EmailClassificationResponse> {
    try {
      console.log('🆕 Processing NEW email with LangGraph workflow:', request.message_id);
      
      const response = await fetch(`${this.baseUrl}/api/process-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('📋 New email classification result:', result);
      
      // Store thread_id for future reference if email has message_id
      if (result.thread_id && request.message_id) {
        localStorage.setItem(`email_thread_${request.message_id}`, result.thread_id);
        console.log(`💾 Stored thread_id ${result.thread_id} for email ${request.message_id}`);
      }
      
      return result;
    } catch (error) {
      console.error('Email classification failed:', error);
      throw error;
    }
  }

  // Resume workflow after human decision (based on your backend format)
  async resumeWorkflow(threadId: string, humanDecision: string): Promise<any> {
    try {
      console.log('🔄 Resuming workflow for thread:', threadId, 'with decision:', humanDecision);
      
      const response = await fetch(`${this.baseUrl}/api/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          thread_id: threadId,
          human_decision: humanDecision
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

  // Get workflow status without triggering re-execution (LangGraph best practices)
  async getWorkflowStatus(messageIdOrThreadId: string): Promise<EmailClassificationResponse> {
    try {
      // Try to get thread_id from storage if this looks like a message_id
      let threadId = messageIdOrThreadId;
      
      if (messageIdOrThreadId.includes('@') || messageIdOrThreadId.includes('<')) {
        // This looks like a message_id, try to get the stored thread_id
        const storedThreadId = localStorage.getItem(`email_thread_${messageIdOrThreadId}`);
        if (storedThreadId) {
          threadId = storedThreadId;
          console.log(`🔍 Using stored thread_id ${threadId} for message ${messageIdOrThreadId}`);
        } else {
          console.log(`⚠️ No stored thread_id found for message ${messageIdOrThreadId}, using as thread_id`);
        }
      }
      
      console.log('🔍 Getting workflow status for thread:', threadId);
      
      const response = await fetch(`${this.baseUrl}/api/workflow/${threadId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
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

  // Get guidance for information-needed emails
  async getEmailGuidance(request: ChatRequest): Promise<ChatResponse> {
    const guidanceRequest = {
      ...request,
      message: "What specific information or actions are needed for this email?"
    };
    
    return this.chatAboutEmail(guidanceRequest);
  }

  // System status
  async getSystemStatus(): Promise<SystemStatus> {
    const response = await fetch(`${this.baseUrl}/system/status`, {
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

  async getThreadStatus(threadId: string): Promise<any> {
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

  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple health check first - this should exist in most FastAPI apps
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        return true;
      }
      
      // Fallback to system status if /health doesn't exist
      const systemStatus = await this.getSystemStatus();
      return systemStatus && (systemStatus.status === 'healthy' || systemStatus.status === 'ok');
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const apiClient = new AgentApiClient();