/**
 * EmailContextManager - Manages current email context and Office.js interactions
 * 
 * Responsibilities:
 * - Loading email context from Outlook
 * - Email context state management
 * - Office.js email operations
 * - Context change notifications
 */

import { EmailContext } from '../../models/types';
import { getCurrentEmailContext } from '../../utils/office-helpers';
import { localizationManager } from '../../localization/localization-manager';
import { EventEmitter } from '../../utils/event-emitter';

export class EmailContextManager extends EventEmitter {
  private currentContext: EmailContext | null = null;
  private isLoading: boolean = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    console.log('[EmailContextManager] Initializing...');
    
    try {
      await this.refreshContext();
      console.log('[EmailContextManager] Initialized successfully');
    } catch (error) {
      console.error('[EmailContextManager] Initialization failed:', error);
      // Don't throw - email context may not always be available
    }
  }

  async refreshContext(): Promise<EmailContext | null> {
    if (this.isLoading) {
      console.log('[EmailContextManager] Context refresh already in progress');
      return this.currentContext;
    }

    this.isLoading = true;
    
    try {
      console.log('[EmailContextManager] Refreshing email context...');
      
      const context = await getCurrentEmailContext();
      
      if (context) {
        this.setCurrentContext(context);
        console.log('[EmailContextManager] Email context loaded:', {
          subject: context.subject,
          sender: context.sender
        });
      } else {
        console.log('[EmailContextManager] No email context available');
        this.setCurrentContext(null);
      }
      
      return this.currentContext;
    } catch (error) {
      console.error('[EmailContextManager] Failed to load email context:', error);
      this.setCurrentContext(null);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  getCurrentContext(): EmailContext | null {
    return this.currentContext;
  }

  hasValidContext(): boolean {
    return this.currentContext !== null && 
           Boolean(this.currentContext.subject || this.currentContext.body);
  }

  getContextSummary(): string {
    if (!this.currentContext) {
      return localizationManager.getString('emailContext.noEmail');
    }

    const { subject, sender, body } = this.currentContext;
    return `Subject: ${subject || 'No subject'}, From: ${sender || 'Unknown'}, Body: ${body ? `${body.substring(0, 100)}...` : 'No content'}`;
  }

  onContextChange(callback: (context: EmailContext | null) => void): void {
    this.on('contextChange', callback);
  }

  onContextLoading(callback: (isLoading: boolean) => void): void {
    this.on('loadingChange', callback);
  }

  dispose(): void {
    console.log('[EmailContextManager] Disposing...');
    this.removeAllListeners();
    this.currentContext = null;
  }

  private setCurrentContext(context: EmailContext | null): void {
    const previousContext = this.currentContext;
    this.currentContext = context;

    // Emit context change if it actually changed
    if (this.hasContextChanged(previousContext, context)) {
      console.log('[EmailContextManager] Email context changed');
      this.emit('contextChange', context);
    }
  }

  private hasContextChanged(previous: EmailContext | null, current: EmailContext | null): boolean {
    // Both null
    if (!previous && !current) return false;
    
    // One is null, other isn't
    if (!previous || !current) return true;
    
    // Compare key properties
    return previous.subject !== current.subject ||
           previous.sender !== current.sender ||
           previous.body !== current.body ||
           previous.recipient !== current.recipient;
  }
}
