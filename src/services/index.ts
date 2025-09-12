/**
 * Services Index - Central export point for all service modules
 * Provides clean imports for service classes throughout the application
 */

export { EmailService, emailService } from './email-service';
export { AIService, aiService } from './ai-service';

// Re-export commonly used types for convenience
export type {
  EmailContext,
  EmailDraft,
  EmailClassification,
  InterruptResponse,
  StreamMessageData,
  EmailProcessResult,
  ChatApprovalOptions
} from '../models/types';
