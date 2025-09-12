/**
 * UIComponents - Facade for modular UI components
 * 
 * This provides a simplified interface that maintains backward compatibility
 * while delegating to specialized component classes behind the scenes.
 * 
 * Migration Strategy: Gradually replace direct usage with specific components
 */

import { ChatInterface } from './components/chat-interface';
import { StatusDisplay } from './components/status-display';
import { EmailContextDisplay } from './components/email-context-display';
import { 
  AgentStatus, 
  InterruptResponse, 
  InterruptData,
  EmailClassification,
  ChatApprovalOptions,
  EmailDraft
} from '../models/types';

// Singleton instances
let chatInterface: ChatInterface | null = null;
let statusDisplay: StatusDisplay | null = null;
let emailContextDisplay: EmailContextDisplay | null = null;

/**
 * Initialize all UI components
 */
function initializeComponents(): void {
  if (!chatInterface) {
    chatInterface = new ChatInterface();
    chatInterface.initialize();
  }
  
  if (!statusDisplay) {
    statusDisplay = new StatusDisplay();
    statusDisplay.initialize();
  }
  
  if (!emailContextDisplay) {
    emailContextDisplay = new EmailContextDisplay();
    emailContextDisplay.initialize();
  }
}

/**
 * Legacy UIComponents interface for backward compatibility
 * 
 * @deprecated Use specific component classes directly for new code
 */
export class UIComponents {
  
  // Status Methods
  static showStatus(status: AgentStatus): void {
    initializeComponents();
    statusDisplay?.showStatus(status);
  }

  static showLoading(show: boolean, message: string = ''): void {
    initializeComponents();
    statusDisplay?.showLoading(show, message);
  }

  static showError(message: string): void {
    initializeComponents();
    statusDisplay?.showError(message);
  }

  static hideError(): void {
    initializeComponents();
    statusDisplay?.hideError();
  }

  static showSuccess(message: string): void {
    initializeComponents();
    statusDisplay?.showSuccess(message);
  }

  static setConnectionStatus(connected: boolean): void {
    initializeComponents();
    statusDisplay?.setConnectionStatus(connected);
  }

  // Email Context Methods
  static updateEmailContext(subject: string, from: string, to: string): void {
    initializeComponents();
    emailContextDisplay?.updateContext({
      subject,
      sender: from,
      recipient: to,
      body: '',
      timestamp: new Date().toISOString(),
      message_id: `context-${Date.now()}`
    });
  }

  static hideEmailContext(): void {
    initializeComponents();
    emailContextDisplay?.hide();
  }

  // Chat Methods
  static addChatMessage(icon: string, text: string, isThinking: boolean = false): void {
    initializeComponents();
    chatInterface?.addAssistantMessage(text, icon);
  }

  static addUserMessage(text: string): void {
    initializeComponents();
    chatInterface?.addUserMessage(text);
  }

  static addChatMessageWithHTML(icon: string, htmlContent: string, isThinking: boolean = false): void {
    initializeComponents();
    // Note: HTML content should be sanitized before calling this
    chatInterface?.addAssistantMessage(htmlContent, icon);
  }

  static showTypingIndicator(): void {
    initializeComponents();
    chatInterface?.showTypingIndicator();
  }

  static hideTypingIndicator(): void {
    initializeComponents();
    chatInterface?.hideTypingIndicator();
  }

  static clearChatMessages(): void {
    initializeComponents();
    chatInterface?.clearMessages();
  }

  static streamChatMessage(icon: string, initialText: string = ''): HTMLElement | null {
    initializeComponents();
    return chatInterface?.streamMessage(icon, initialText) || null;
  }

  // Approval and Dialog Methods
  static showReplyApproval(replyContent: string): Promise<InterruptResponse> {
    initializeComponents();
    return chatInterface?.showReplyApproval(replyContent) || Promise.resolve({ type: 'reject' });
  }

  static showChatApproval(options: ChatApprovalOptions): Promise<InterruptResponse> {
    initializeComponents();
    return chatInterface?.showChatApproval(options) || Promise.resolve({ type: 'reject' });
  }

  static showEmailEditor(
    originalArgs: EmailDraft, 
    onSubmit: (editedArgs: EmailDraft, feedback: string) => void, 
    onCancel: () => void
  ): void {
    initializeComponents();
    if (chatInterface) {
      chatInterface.showEmailEditor(originalArgs)
        .then(result => onSubmit(result.draft, result.feedback))
        .catch(() => onCancel());
    }
  }

  static showInlineInput(
    title: string, 
    placeholder: string, 
    onSubmit: (value: string) => void, 
    onCancel: () => void
  ): void {
    initializeComponents();
    if (chatInterface) {
      chatInterface.showInlineInput(title, placeholder)
        .then(value => onSubmit(value))
        .catch(() => onCancel());
    }
  }

  // Legacy methods that are no longer used but kept for compatibility
  static showInterruptDialog(interruptData: InterruptData): Promise<InterruptResponse> {
    console.warn('showInterruptDialog is deprecated, use chat-based approval instead');
    return Promise.resolve({ type: 'reject' });
  }

  static hideInterruptSection(): void {
    console.warn('hideInterruptSection is deprecated');
  }

  static updateInterruptStatus(message: string): void {
    console.warn('updateInterruptStatus is deprecated, use showStatus instead');
    this.showStatus({ status: 'thinking', message });
  }

  static showStreamingContent(content: string): void {
    console.warn('showStreamingContent is deprecated, use chat streaming instead');
  }

  static hideStreamingContent(): void {
    console.warn('hideStreamingContent is deprecated');
  }

  static showSystemStatus(status: Record<string, unknown> | null): void {
    console.warn('showSystemStatus is deprecated, logged to console only');
    if (status) {
      console.log('System Status:', status);
    }
  }

  static showClassificationResults(classification: EmailClassification): void {
    console.warn('showClassificationResults is deprecated, use chat messages instead');
  }

  // Utility methods
  static enableButtons(enabled: boolean): void {
    const buttons = document.querySelectorAll('.action-btn');
    buttons.forEach(button => {
      (button as HTMLButtonElement).disabled = !enabled;
    });
  }

  static highlightButton(buttonId: string, highlight: boolean): void {
    const button = document.getElementById(buttonId);
    if (button) {
      if (highlight) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    }
  }

  // Cleanup method
  static dispose(): void {
    chatInterface?.dispose();
    statusDisplay?.dispose();
    emailContextDisplay?.dispose();
    
    chatInterface = null;
    statusDisplay = null;
    emailContextDisplay = null;
  }
}

// Export individual components for direct use
export { ChatInterface, StatusDisplay, EmailContextDisplay };
