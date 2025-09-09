export interface EmailContext {
  subject: string;
  sender: string;
  to: string;
  body: string;
  isCompose?: boolean;
  threadId?: string;
  internetMessageId?: string; // Outlook unique message ID for fast lookups
}

export interface ProcessEmailRequest {
  email_context: EmailContext;
  action?: AgentAction;
  thread_id?: string;
  additional_context?: string;
}

export interface ProcessEmailResponse {
  thread_id: string;
  status: string;
  result?: any;
  requires_human_input: boolean;
  interrupt_data?: any;
}

export interface InterruptResponse {
  type: 'accept' | 'edit' | 'reject';
  args?: any;
  feedback?: string;
}

export interface StreamMessage {
  type: string;
  data: any;
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
  status: 'thinking' | 'waiting_for_human' | 'completed' | 'cancelled' | 'error';
  message?: string;
  data?: any;
  thread_id?: string;
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  type: string;
}

export interface MeetingRequest {
  title: string;
  attendees: string[];
  start_time: string;
  duration_minutes: number;
  description: string;
  type: string;
}