/**
 * Core API types for the JQuad Outlook AI Assistant
 * These types define the structure for communication with the AI backend service
 */

/**
 * Email context information extracted from Outlook
 * Matches backend EmailContent structure exactly
 */
export interface EmailContext {
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
  // Optional Outlook-specific properties for frontend use
  message_id?: string;
  conversation_id?: string;
  is_reply?: boolean;
  thread_id?: string;
  in_reply_to?: string;
  outlook_item_id?: string;
  internet_message_id?: string;
  internetMessageId?: string;
  is_compose?: boolean;
}

/**
 * Interrupt payload for user interactions
 */
export interface InterruptPayload {
  type: 'approval_required' | 'clarification_needed' | 'user_input_required';
  action: string;
  description: string;
  args?: EmailDraft | MeetingRequest | Record<string, unknown>;
  options?: string[];
  config?: InterruptConfig;
  // Backend interrupt types
  interrupt_type?: 'ignore_approval_needed' | 'auto_reply_approval_needed' | 'information_needed_questions';
  available_decisions?: string[];
  // Content fields
  proposed_auto_reply?: string;
  auto_response?: string;
  clarifying_questions?: string[];
  classification?: string;
  reasoning?: string;
  confidence?: number;
}

/**
 * Workflow status enumeration
 */
export type WorkflowStatus = 
  | 'pending'
  | 'processing' 
  | 'waiting_for_human'
  | 'completed'
  | 'cancelled'
  | 'error';

/**
 * Interrupt response from user
 */
export interface InterruptResponse {
  type: 'accept' | 'edit' | 'reject' | 'deny' | 'open_in_outlook' | 'process' | 'respond' | 'custom_reply';
  args?: EmailDraft | MeetingRequest | Record<string, unknown>;
  feedback?: string;
}

/**
 * Email processing result from the AI service
 */
export interface EmailProcessingResult {
  classification?: EmailClassification;
  auto_response?: string;
  reply_content?: string;
  tasks?: string[];
  summary?: string;
  sentiment?: EmailSentiment;
  messages?: AIMessage[];
  // Additional properties
  text?: string;
  content?: string;
  message?: string;
  thread_id?: string;
  requires_human_input?: boolean;
  interrupt_data?: InterruptPayload;
}

/**
 * Email draft structure
 */
export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  type?: string;
  cc?: string;
  bcc?: string;
  attachments?: Array<{
    name: string;
    content?: string;
    url?: string;
  }>;
}

/**
 * Meeting request structure
 */
export interface MeetingRequest {
  title: string;
  attendees: string[];
  start_time: string;
  duration_minutes: number;
  description: string;
  type: string;
  location?: string;
  is_online_meeting?: boolean;
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly';
    interval: number;
    end_date?: string;
  };
}

/**
 * Interrupt configuration
 */
export interface InterruptConfig {
  allow_accept?: boolean;
  allow_edit?: boolean;
  allow_reject?: boolean;
  allow_respond?: boolean;
  timeout_seconds?: number;
}

/**
 * Email classification result
 */
export interface EmailClassification {
  classification: 'ignore' | 'auto-reply' | 'information-needed';
  reasoning: string;
  confidence: number;
  auto_response?: string;
  clarifying_questions?: string[];
  reply_sent?: boolean;
  action_completed?: boolean;
  context_enriched?: boolean;
  interrupted?: boolean;
  thread_id?: string;
  interrupt_data?: InterruptPayload;
  processing_time_ms?: number;
  message?: string;
}

/**
 * Email sentiment analysis result
 */
export interface EmailSentiment {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  tone?: string;
  urgency?: 'low' | 'medium' | 'high';
}

/**
 * AI message structure
 */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

/**
 * API request wrapper
 */
export interface APIRequest<T = unknown> {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: T;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * API response wrapper
 */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  status: number;
  headers?: Record<string, string>;
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  type: 'status' | 'chunk' | 'stream' | 'interrupt' | 'complete' | 'completed' | 'error';
  data: Record<string, unknown>;
  thread_id: string;
  timestamp?: string;
}

/**
 * Connection configuration
 */
export interface ConnectionConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  websocketUrl?: string;
  enableWebSocket?: boolean;
}

/**
 * User preferences
 */
export interface UserPreferences {
  auto_reply_enabled?: boolean;
  classification_threshold?: number;
  response_tone?: 'professional' | 'casual' | 'friendly';
  language?: string;
  timezone?: string;
  signature?: string;
  default_actions?: {
    ignore_threshold?: number;
    auto_reply_threshold?: number;
  };
}

/**
 * New LangGraph Backend API Types - Complete Replacement
 */

// Enhanced Chat API
export interface ChatMessageRequest {
  message: string;
  user_id: string;
  context?: EmailContext | null;
}

export interface ChatMessageResponse {
  response: string;
  data?: {
    query_type?: string;
    search_results?: any[];
    search_limit?: number;
    similarity_threshold?: number;
    vector_context_used?: boolean;
    context_emails_count?: number;
    enhanced?: boolean;
  };
}

// Human-in-the-Loop Workflow API
export interface HITLWorkflowRequest {
  email: EmailContext;
  user_id: string;
}

export interface HITLWorkflowResponse {
  success?: boolean; // Optional to match backend response
  workflow_id: string;
  status: 'processing' | 'waiting_for_human' | 'completed' | 'error' | 'awaiting_decision' | 'already_completed';
  classification?: {
    type?: 'ignore' | 'auto-reply' | 'information-needed';
    classification?: 'ignore' | 'auto-reply' | 'information-needed'; // Backend field name
    confidence: number;
    reasoning: string;
    auto_response?: string;
    proposed_reply?: string; // Backend field name
    questions?: string[];
    clarifying_questions?: string[]; // Backend field name
    detected_language?: string;
  };
  interrupt_data?: {
    type?: 'ignore_approval_needed' | 'auto_reply_approval_needed' | 'information_needed_questions';
    available_decisions?: string[];
    message?: string;
    // Fields for already_completed status
    completion_date?: string;
    final_classification?: string;
    final_reply?: string;
  };
  error?: string;
}

export interface HITLWorkflowStatus {
  workflow_id: string;
  status: 'processing' | 'waiting_for_human' | 'completed' | 'error' | 'awaiting_decision';
  result?: {
    final_action: string;
    auto_response?: string;
    questions_answered?: string[];
  };
  final_result?: {
    final_action: string;
    auto_response?: string;
    questions_answered?: string[];
    classification?: string;
    proposed_reply?: string;
    reasoning?: string;
  };
  interrupt_data?: HITLWorkflowResponse['interrupt_data'];
  error?: string;
}

export interface HITLDecisionRequest {
  decision: string; // e.g., 'approve_send', 'edit_reply', 'send_edited:text', 'cancel_edit', 'convert_to_ignore'
}

// Backend Decision Options (new two-step flow)
export type HITLDecisionOption = 
  // For ignore emails
  | 'approve_ignore'
  | 'process_instead'
  // For auto-reply emails (two-step flow)
  | 'approve_send'
  | 'edit_reply'              // Enter edit mode
  | `send_edited:${string}`   // Send edited reply
  | 'cancel_edit'             // Cancel edit and return
  | 'convert_to_ignore'
  // For information-needed emails
  | `provide_answers:${string}`
  | `custom_reply:${string}`
  | 'convert_to_ignore';