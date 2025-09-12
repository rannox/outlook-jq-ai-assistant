/**
 * AI Service - Handles all AI agent interactions and chat functionality
 * Provides a clean interface for AI operations with proper error handling
 * Encapsulates API client usage and response processing
 */

import { 
  EmailContext,
  EmailClassification,
  InterruptResponse,
  StreamMessageData,
  EmailProcessResult
} from '../models/types';
import { 
  apiClient, 
  ChatRequest, 
  ChatResponse, 
  EmailClassificationRequest,
  EmailClassificationResponse
} from '../taskpane/api-client';

/**
 * Service class for AI agent operations
 * Encapsulates API communication with enhanced error handling
 */
export class AIService {
  private readonly apiClient = apiClient;

  /**
   * Sends a chat message to the AI agent about the current email
   * @param emailContext - Current email context
   * @param message - User's message/question
   * @returns Promise resolving to AI response
   */
  async chatAboutEmail(emailContext: EmailContext, message: string): Promise<ChatResponse> {
    try {
      if (!emailContext) {
        throw new Error('Email context is required for chat');
      }

      if (!message || message.trim().length === 0) {
        throw new Error('Chat message cannot be empty');
      }

      const chatRequest: ChatRequest = {
        subject: emailContext.subject,
        sender: emailContext.sender,
        body: emailContext.body,
        message: message.trim()
      };

      console.log('AIService: Sending chat request:', { message: message.trim() });
      
      // First create/get the email in the backend
      const emailId = await this.apiClient.createOrGetEmail({
        subject: emailContext.subject,
        sender: emailContext.sender,
        body: emailContext.body,
        message_id: emailContext.internetMessageId,
        timestamp: emailContext.timestamp
      });

      const response = await this.apiClient.chatAboutEmail(emailId, message.trim());
      
      if (!response.success) {
        throw new Error(response.error || 'AI chat request failed');
      }

      return response;
    } catch (error) {
      console.error('AIService: Chat request failed:', error);
      throw new Error(`AI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Classifies an email using the AI agent
   * @param emailContext - Email context to classify
   * @returns Promise resolving to classification result
   */
  async classifyEmail(emailContext: EmailContext): Promise<EmailClassificationResponse> {
    try {
      if (!emailContext) {
        throw new Error('Email context is required for classification');
      }

      const classificationRequest: EmailClassificationRequest = {
        subject: emailContext.subject,
        sender: emailContext.sender,
        body: emailContext.body,
        to: emailContext.recipient,
        message_id: emailContext.internetMessageId,
        timestamp: emailContext.timestamp
      };

      console.log('AIService: Classifying email:', { 
        subject: emailContext.subject,
        sender: emailContext.sender 
      });

      const response = await this.apiClient.classifyEmail(classificationRequest);
      console.log('AIService: Email classification completed:', response.classification);
      
      return response;
    } catch (error) {
      console.error('AIService: Email classification failed:', error);
      throw new Error(`Email classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resumes a workflow after human decision
   * @param threadId - Thread ID of the workflow
   * @param decision - Human decision/response
   * @returns Promise resolving to workflow result
   */
  async resumeWorkflow(threadId: string, decision: string): Promise<EmailClassificationResponse> {
    try {
      if (!threadId || threadId.trim().length === 0) {
        throw new Error('Thread ID is required to resume workflow');
      }

      if (!decision || decision.trim().length === 0) {
        throw new Error('Human decision is required to resume workflow');
      }

      console.log('AIService: Resuming workflow:', { threadId, decision });
      const response = await this.apiClient.resumeWorkflow(threadId, decision);
      
      return response;
    } catch (error) {
      console.error('AIService: Failed to resume workflow:', error);
      throw new Error(`Workflow resume failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the status of a workflow
   * @param threadId - Thread ID to check
   * @returns Promise resolving to workflow status
   */
  async getWorkflowStatus(threadId: string): Promise<EmailClassificationResponse> {
    try {
      if (!threadId || threadId.trim().length === 0) {
        throw new Error('Thread ID is required to check workflow status');
      }

      console.log('AIService: Getting workflow status:', threadId);
      const response = await this.apiClient.getWorkflowStatus(threadId);
      
      return response;
    } catch (error) {
      console.error('AIService: Failed to get workflow status:', error);
      throw new Error(`Workflow status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets guidance for handling an information-needed email
   * @param emailContext - Email context needing guidance
   * @returns Promise resolving to guidance response
   */
  async getEmailGuidance(emailContext: EmailContext): Promise<ChatResponse> {
    try {
      if (!emailContext) {
        throw new Error('Email context is required for guidance');
      }

      console.log('AIService: Requesting email guidance');
      
      // First create/get the email in the backend
      const emailId = await this.apiClient.createOrGetEmail({
        subject: emailContext.subject,
        sender: emailContext.sender,
        body: emailContext.body,
        message_id: emailContext.internetMessageId,
        timestamp: emailContext.timestamp
      });

      const response = await this.apiClient.getEmailGuidance(emailId);
      
      if (!response.success) {
        throw new Error(response.error || 'Guidance request failed');
      }

      return response;
    } catch (error) {
      console.error('AIService: Failed to get email guidance:', error);
      throw new Error(`Email guidance failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if the AI service is available and healthy
   * @returns Promise resolving to boolean indicating availability
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      console.log('AIService: Checking service availability');
      const isHealthy = await this.apiClient.healthCheck();
      console.log('AIService: Service availability check result:', isHealthy);
      return isHealthy;
    } catch (error) {
      console.error('AIService: Service availability check failed:', error);
      return false;
    }
  }

  /**
   * Generates common AI prompts for email operations
   * @param emailContext - Current email context
   * @returns Object containing common prompts
   */
  generateCommonPrompts(emailContext: EmailContext) {
    if (!emailContext) {
      throw new Error('Email context is required to generate prompts');
    }

    return {
      extractTasks: "Extract the key tasks from this email",
      writeReply: "Write a professional email reply to this email", 
      summarize: "Summarize this email",
      analyzeSentiment: "What's the sentiment of this email?",
      identifyUrgency: "How urgent is this email and what are the priority actions?",
      suggestNextSteps: "What are the recommended next steps for handling this email?",
      extractContactInfo: "Extract any contact information or important details from this email",
      identifyDeadlines: "Are there any deadlines or time-sensitive items mentioned in this email?"
    };
  }

  /**
   * Validates email context for AI operations
   * @param emailContext - Email context to validate
   * @returns true if valid, throws error if invalid
   */
  validateEmailContext(emailContext: EmailContext): boolean {
    if (!emailContext) {
      throw new Error('Email context is required');
    }

    if (!emailContext.subject && !emailContext.body) {
      throw new Error('Email must have either a subject or body content');
    }

    if (!emailContext.sender || emailContext.sender.trim().length === 0) {
      throw new Error('Email sender is required');
    }

    return true;
  }
}

// Export singleton instance
export const aiService = new AIService();
