/**
 * Email Service - Handles all email-related operations using Office.js APIs
 * Provides a clean interface for email functionality with proper error handling
 * Follows Microsoft Office.js best practices for async operations
 */

import { 
  EmailContext, 
  EmailDraft, 
  OfficeError 
} from '../models/types';
import { 
  getCurrentEmailContext, 
  createReply, 
  insertIntoEmail, 
  isOfficeReady 
} from '../utils/office-helpers';

/**
 * Service class for email operations
 * Encapsulates Office.js email functionality with enhanced error handling
 */
export class EmailService {
  /**
   * Validates that Office.js is ready for email operations
   * @throws Error if Office.js is not ready
   */
  private validateOfficeReady(): void {
    if (!isOfficeReady()) {
      throw new Error('Office.js is not ready. Please ensure an email is selected.');
    }
  }

  /**
   * Retrieves the current email context
   * @returns Promise resolving to current email context or null
   */
  async getCurrentEmail(): Promise<EmailContext | null> {
    try {
      this.validateOfficeReady();
      return await getCurrentEmailContext();
    } catch (error) {
      console.error('EmailService: Failed to get current email context:', error);
      throw error;
    }
  }

  /**
   * Creates a reply to the current email with enhanced error handling
   * @param content - The reply content as plain text
   * @returns Promise that resolves when reply is created
   */
  async createEmailReply(content: string): Promise<void> {
    try {
      this.validateOfficeReady();
      
      if (!content || content.trim().length === 0) {
        throw new Error('Reply content cannot be empty');
      }

      await createReply(content);
      console.log('EmailService: Reply created successfully');
    } catch (error) {
      console.error('EmailService: Failed to create reply:', error);
      throw new Error(`Failed to create email reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Inserts content into the current email being composed
   * @param content - Content to insert as plain text
   * @returns Promise that resolves when content is inserted
   */
  async insertContent(content: string): Promise<void> {
    try {
      this.validateOfficeReady();
      
      if (!content || content.trim().length === 0) {
        throw new Error('Content to insert cannot be empty');
      }

      await insertIntoEmail(content);
      console.log('EmailService: Content inserted successfully');
    } catch (error) {
      console.error('EmailService: Failed to insert content:', error);
      throw new Error(`Failed to insert content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates email draft data
   * @param draft - Email draft to validate
   * @returns true if valid, throws error if invalid
   */
  validateEmailDraft(draft: EmailDraft): boolean {
    if (!draft) {
      throw new Error('Email draft is required');
    }

    if (!draft.to || draft.to.trim().length === 0) {
      throw new Error('Email recipient (To field) is required');
    }

    if (!draft.subject || draft.subject.trim().length === 0) {
      throw new Error('Email subject is required');
    }

    if (!draft.body || draft.body.trim().length === 0) {
      throw new Error('Email body is required');
    }

    // Basic email validation for To field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = draft.to.split(',').map(email => email.trim());
    
    for (const recipient of recipients) {
      if (!emailRegex.test(recipient)) {
        throw new Error(`Invalid email address: ${recipient}`);
      }
    }

    return true;
  }

  /**
   * Checks if the current context is suitable for email operations
   * @returns Promise resolving to boolean indicating readiness
   */
  async isEmailContextReady(): Promise<boolean> {
    try {
      if (!isOfficeReady()) {
        return false;
      }

      const context = await getCurrentEmailContext();
      return context !== null;
    } catch (error) {
      console.error('EmailService: Error checking email context readiness:', error);
      return false;
    }
  }

  /**
   * Gets user's email address from Office context
   * @returns User's email address or empty string if unavailable
   */
  getUserEmailAddress(): string {
    try {
      this.validateOfficeReady();
      return Office.context.mailbox.userProfile.emailAddress || '';
    } catch (error) {
      console.error('EmailService: Failed to get user email address:', error);
      return '';
    }
  }

  /**
   * Gets the display name of the current user
   * @returns User's display name or empty string if unavailable
   */
  getUserDisplayName(): string {
    try {
      this.validateOfficeReady();
      return Office.context.mailbox.userProfile.displayName || '';
    } catch (error) {
      console.error('EmailService: Failed to get user display name:', error);
      return '';
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
