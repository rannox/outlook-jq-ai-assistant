// Import and re-export all types from api-types.ts for full V1 API compatibility
import {
  EmailContext,
  InterruptPayload, 
  WorkflowStatus,
  InterruptResponse,
  EmailProcessingResult,
  EmailDraft,
  MeetingRequest,
  InterruptConfig,
  EmailClassification,
  EmailSentiment,
  AIMessage,
  APIRequest,
  APIResponse,
  WebSocketMessage,
  ConnectionConfig,
  UserPreferences
} from './api-types';

// Re-export the imported types
export {
  EmailContext,
  InterruptPayload, 
  WorkflowStatus,
  InterruptResponse,
  EmailProcessingResult,
  EmailDraft,
  MeetingRequest,
  InterruptConfig,
  EmailClassification,
  EmailSentiment,
  AIMessage,
  APIRequest,
  APIResponse,
  WebSocketMessage,
  ConnectionConfig,
  UserPreferences
};

// Plugin-specific extensions to API types
export interface PluginEmailContext extends EmailContext {
  outlookItemId?: string;
  internetMessageId?: string;
  isCompose?: boolean;
  threadId?: string;
}

export interface PluginWorkflowState {
  currentThreadId: string | null;
  isProcessing: boolean;
  lastInterrupt?: InterruptPayload;
  workflowStatus?: WorkflowStatus;
}

// Modern workflow types (no legacy needed)
export interface PluginInterruptResponse {
  type: 'accept' | 'edit' | 'reject' | 'deny' | 'open_in_outlook' | 'process' | 'respond';
  args?: EmailDraft | MeetingRequest | Record<string, unknown>;
  feedback?: string;
}

// Additional plugin-specific types that extend the API types
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface StreamMessage {
  type: 'status' | 'chunk' | 'stream' | 'interrupt' | 'complete' | 'completed' | 'error';
  data: StreamMessageData;
  thread_id: string;
}

export enum AgentAction {
  COMPOSE_REPLY = 'compose_reply',
  SUMMARIZE = 'summarize',
  ANALYZE_SENTIMENT = 'analyze_sentiment',
  EXTRACT_TASKS = 'extract_tasks',
  CHAT = 'chat'
}

export interface AgentStatus {
  status: 'thinking' | 'waiting_for_human' | 'completed' | 'cancelled' | 'error' | 'connecting' | 'disconnected' | 'ready';
  message?: string;
  data?: StatusData;
  thread_id?: string;
}

// EmailDraft and MeetingRequest are imported from api-types.ts

// Legacy compatibility types (for existing code that hasn't been updated)
export interface InterruptData extends Record<string, unknown> {
  type: 'approval_required' | 'clarification_needed' | 'user_input_required';
  action: string;
  description: string;
  args?: EmailDraft | MeetingRequest | Record<string, unknown>;
  options?: string[];
  config?: InterruptConfig;
  // New backend interrupt types
  interrupt_type?: 'ignore_approval_needed' | 'auto_reply_approval_needed' | 'information_needed_questions';
  available_decisions?: string[];
  // Legacy properties for compatibility with existing code
  proposed_auto_reply?: string;
  auto_response?: string;
  clarifying_questions?: string[];
  classification?: string;
  reasoning?: string;
  confidence?: number;
}

// Legacy email processing types for compatibility  
export interface ProcessEmailRequest {
  email_context: EmailContext;
  action?: AgentAction;
  thread_id?: string;
  additional_context?: string;
  user_input?: string;
  preferences?: Record<string, unknown>;
}

export interface ProcessEmailResponse {
  thread_id: string;
  status: string;
  result?: EmailProcessResult;
  requires_human_input: boolean;
  interrupt_data?: InterruptData;
}

// Add a bridge type for DecisionDialogConfig
export interface DecisionDialogConfig {
  title: string;
  message: string;
  classification: string;
  confidence: number;
  email: {
    subject: string;
    sender: string;
    body: string;
    message_id?: string;
  };
  autoResponse?: string;
  questions?: string[];
  options: Array<{
    value: string;
    label: string;
    description: string;
    isPrimary?: boolean;
    requiresInput?: boolean;
    icon?: string;
  }>;
  onDecision: (decision: string) => void;
}

// Legacy EmailProcessResult for backward compatibility
export interface EmailProcessResult {
  classification?: EmailClassification;
  auto_response?: string;
  reply_content?: string;
  tasks?: string[];
  summary?: string;
  sentiment?: EmailSentiment;
  messages?: AIMessage[];
  // Additional properties for compatibility
  text?: string;
  content?: string;
  message?: string;
}

// Plugin-specific result types extending API types
export interface PluginEmailProcessResult extends EmailProcessResult {
  // Additional plugin-specific fields if needed
  outlookItemId?: string;
  internetMessageId?: string;
}

// InterruptConfig is imported from api-types.ts

/**
 * Stream message data payload
 */
export interface StreamMessageData extends Record<string, unknown> {
  status?: string;
  message?: string;
  content?: string;
  chunk?: string;
  error?: string;
  progress?: number;
  metadata?: Record<string, unknown>;
  // Additional properties used in the codebase
  type?: 'status' | 'chunk' | 'stream' | 'interrupt' | 'complete' | 'completed' | 'error' | 'final';
  text?: string;
}

/**
 * Agent status data payload
 */
export interface StatusData extends Record<string, unknown> {
  progress?: number;
  step?: string;
  error?: ErrorDetails;
  metadata?: Record<string, unknown>;
  // Additional properties used in the codebase
  text?: string;
  content?: string;
  message?: string;
}

/**
 * Error details structure
 */
export interface ErrorDetails {
  code: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

// EmailClassification, EmailSentiment, and AIMessage are imported from api-types.ts

/**
 * Office.js API error handling interface
 */
export interface OfficeError {
  name: string;
  message: string;
  code?: number;
  stack?: string;
}

/**
 * Chat message approval options
 */
export interface ChatApprovalOptions {
  showOpenInOutlook?: boolean;
  allowEdit?: boolean;
  allowReject?: boolean;
  title?: string;
  message?: string;
  // Additional properties used in the codebase
  showPreview?: boolean;
  emailContent?: string;
}