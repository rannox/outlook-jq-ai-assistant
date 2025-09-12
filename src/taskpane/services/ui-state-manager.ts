/**
 * UIStateManager - Manages UI state and coordinates between UI components
 * 
 * Responsibilities:
 * - UI state management
 * - Component coordination
 * - Status updates
 * - Error handling display
 */

import { EmailContext } from '../../models/types';
import { ChatStatus, ChatMessage } from './chat-manager';
import { ConnectionStatus } from './connection-manager';
import { localizationManager } from '../../localization/localization-manager';
import { EventEmitter } from '../../utils/event-emitter';

export interface UIState {
  isInitialized: boolean;
  connectionStatus: ConnectionStatus | null;
  emailContext: EmailContext | null;
  chatStatus: ChatStatus | null;
  currentError: string | null;
  currentSuccess: string | null;
}

export class UIStateManager extends EventEmitter {
  private state: UIState = {
    isInitialized: false,
    connectionStatus: null,
    emailContext: null,
    chatStatus: null,
    currentError: null,
    currentSuccess: null
  };

  private chatContainer: HTMLElement | null = null;
  private chatInput: HTMLTextAreaElement | null = null;
  private sendButton: HTMLElement | null = null;

  constructor() {
    super();
  }

  initialize(): void {
    console.log('[UIStateManager] Initializing...');
    
    this.initializeUIElements();
    this.setupEventHandlers();
    this.updateState({ isInitialized: true });
    
    console.log('[UIStateManager] Initialized successfully');
  }

  updateConnectionStatus(isConnected: boolean, error?: string): void {
    console.log(`[UIStateManager] updateConnectionStatus called: isConnected=${isConnected}, error=${error}`);
    
    const connectionStatus: ConnectionStatus = {
      isConnected,
      lastChecked: new Date(),
      error
    };

    this.updateState({ connectionStatus });
    this.updateConnectionStatusUI(connectionStatus);
  }

  updateEmailContext(context: EmailContext | null): void {
    this.updateState({ emailContext: context });
    this.updateEmailContextUI(context);
  }

  updateChatStatus(status: ChatStatus): void {
    console.log('[UIStateManager] updateChatStatus called:', status);
    this.updateState({ chatStatus: status });
    this.updateChatStatusUI(status);
    this.updateWorkflowStatus(status);
  }



  showError(message: string): void {
    this.updateState({ currentError: message, currentSuccess: null });
    this.displayError(message);
  }

  showSuccess(message: string): void {
    this.updateState({ currentSuccess: message, currentError: null });
    this.displaySuccess(message);
  }

  hideError(): void {
    this.updateState({ currentError: null });
    this.hideErrorDisplay();
  }

  addChatMessage(message: ChatMessage): void {
    console.log(`[UIStateManager] addChatMessage called - Type: ${message.type}, Content: "${message.content}"`);
    
    if (!this.chatContainer) {
      console.error('[UIStateManager] Chat container not found!');
      return;
    }

    const messageElement = this.createChatMessageElement(message);
    // Add enhanced indicator if message is enhanced
    if (message.enhanced) {
      messageElement.classList.add('enhanced');
    }
    this.chatContainer.appendChild(messageElement);
    this.scrollChatToBottom();
    
    console.log('[UIStateManager] Message added to chat container');
  }

  clearChatMessages(): void {
    if (this.chatContainer) {
      this.chatContainer.innerHTML = '';
    }
  }

  clearChatInput(): void {
    if (this.chatInput) {
      this.chatInput.value = '';
      this.chatInput.style.height = 'auto';
    }
  }

  enableChatInput(enabled: boolean): void {
    if (this.chatInput) {
      this.chatInput.disabled = !enabled;
    }
    if (this.sendButton) {
      (this.sendButton as HTMLButtonElement).disabled = !enabled;
    }
  }

  getState(): UIState {
    return { ...this.state };
  }

  onStateChange(callback: (state: UIState) => void): void {
    this.on('stateChange', callback);
  }

  dispose(): void {
    console.log('[UIStateManager] Disposing...');
    this.removeAllListeners();
  }

  private initializeUIElements(): void {
    this.chatContainer = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
    this.sendButton = document.getElementById('chat-send-btn');

    if (!this.chatContainer || !this.chatInput || !this.sendButton) {
      console.warn('[UIStateManager] Some UI elements not found during initialization');
    }
  }

  private setupEventHandlers(): void {
    // Chat input handlers
    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.emit('sendChatMessage');
        }
      });

      // Auto-resize chat input
      this.chatInput.addEventListener('input', () => {
        if (this.chatInput) {
          this.chatInput.style.height = 'auto';
          this.chatInput.style.height = `${Math.min(this.chatInput.scrollHeight, 120)}px`;
        }
      });
    }

    if (this.sendButton) {
      this.sendButton.addEventListener('click', () => {
        this.emit('sendChatMessage');
      });
    }

    // Suggestion button handlers
    const suggestionButtons = document.querySelectorAll('.suggestion-btn');
    suggestionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const buttonElement = target.closest('.suggestion-btn') as HTMLElement;
        
        if (buttonElement) {
          // Check for both data-suggestion-key and data-suggestion attributes
          const suggestionKey = buttonElement.getAttribute('data-suggestion-key');
          const suggestion = buttonElement.getAttribute('data-suggestion');
          const finalSuggestion = suggestionKey || suggestion;
          
          if (finalSuggestion) {
            console.log(`[UIStateManager] Processing suggestion: ${finalSuggestion}`);
            
            // Handle classify email with dedicated event (pub/sub pattern)
            if (finalSuggestion === 'classify-email') {
              console.log(`[UIStateManager] Emitting classifyEmailRequested event`);
              this.emit('classifyEmailRequested');
            } else {
              console.log(`[UIStateManager] Emitting suggestionClicked event: ${finalSuggestion}`);
              this.emit('suggestionClicked', finalSuggestion);
            }
          }
        }
      });
    });
  }

  private updateConnectionStatusUI(status: ConnectionStatus): void {
    const statusIcon = document.getElementById('connection-status');
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('status-text');

    if (statusIcon) {
      statusIcon.textContent = status.isConnected ? '🟢' : '🔴';
      statusIcon.title = status.isConnected 
        ? localizationManager.getString('connectionStatus.connected')
        : localizationManager.getString('connectionStatus.disconnected');
    }

    if (statusElement && statusText) {
      if (status.isConnected) {
        statusElement.className = 'status status-ready';
        statusText.textContent = localizationManager.getString('status.ready');
      } else {
        statusElement.className = 'status status-disconnected';
        statusText.textContent = status.error || localizationManager.getString('status.disconnected');
      }
    }
  }

  private updateEmailContextUI(context: EmailContext | null): void {
    const contextSection = document.getElementById('email-context');
    const subjectElement = document.getElementById('email-subject');
    const fromElement = document.getElementById('email-from');
    const toElement = document.getElementById('email-to');

    if (context && contextSection) {
      contextSection.style.display = 'block';
      
      if (subjectElement) {
        subjectElement.textContent = context.subject || 
          localizationManager.getString('emailContext.noSubject');
      }
      if (fromElement) {
        fromElement.textContent = context.sender || 
          localizationManager.getString('emailContext.unknownSender');
      }
      if (toElement) {
        toElement.textContent = context.recipient || 
          localizationManager.getString('emailContext.unknownRecipient');
      }
    } else if (contextSection) {
      contextSection.style.display = 'none';
    }
  }

  private updateChatStatusUI(status: ChatStatus): void {
    console.log('[UIStateManager] updateChatStatusUI called:', { isProcessing: status.isProcessing });
    this.enableChatInput(!status.isProcessing);
    
    // Update UI based on processing status
    if (status.isProcessing) {
      console.log('[UIStateManager] Showing typing indicator');
      this.showTypingIndicator();
    } else {
      console.log('[UIStateManager] Hiding typing indicator');
      this.hideTypingIndicator();
    }
  }

  private createChatMessageElement(message: ChatMessage): HTMLElement {
    const messageDiv = document.createElement('div');
    // Map 'assistant' to 'ai' for CSS compatibility
    const cssType = message.type === 'assistant' ? 'ai' : message.type;
    messageDiv.className = `chat-message ${cssType}-message`;
    messageDiv.id = message.id;

    const icon = this.getMessageIcon(message.type);
    const formattedContent = this.formatMessageContent(message.content);

    messageDiv.innerHTML = `
      <span class="message-icon">${icon}</span>
      <span class="message-text">${formattedContent}</span>
    `;

    return messageDiv;
  }

  private getMessageIcon(type: string): string {
    switch (type) {
      case 'user': return '👤';
      case 'assistant': return '🤖';
      case 'system': return '⚙️';
      default: return '💬';
    }
  }

  private formatMessageContent(content: string): string {
    // Clean up content first - remove leading/trailing whitespace and newlines
    const cleaned = content.trim().replace(/^[\r\n]+|[\r\n]+$/g, '');
    
    // Basic markdown-style formatting
    return cleaned
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private showTypingIndicator(): void {
    console.log('[UIStateManager] showTypingIndicator called, chatContainer:', !!this.chatContainer);
    if (!this.chatContainer) return;

    // Remove existing typing indicator
    this.hideTypingIndicator();

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message ai-message typing-indicator';
    typingDiv.id = 'typing-indicator';
    
    typingDiv.innerHTML = `
      <span class="message-icon">🤖</span>
      <span class="message-text">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </span>
    `;
    
    this.chatContainer.appendChild(typingDiv);
    this.scrollChatToBottom();
  }

  /**
   * Update workflow status display
   */
  private updateWorkflowStatus(status: ChatStatus): void {
    let statusContainer = document.querySelector('.workflow-status-container');
    
    // Create status container if it doesn't exist
    if (!statusContainer && status.currentWorkflowId) {
      statusContainer = document.createElement('div');
      statusContainer.className = 'workflow-status-container';
      
      const chatHeader = document.querySelector('.chat-header');
      if (chatHeader) {
        chatHeader.appendChild(statusContainer);
      }
    }

    if (statusContainer && status.currentWorkflowId) {
      statusContainer.innerHTML = `
        <div class="workflow-status ${status.workflowStatus || 'processing'}">
          <span class="status-icon">${this.getWorkflowStatusIcon(status.workflowStatus)}</span>
          <span class="status-text">Workflow: ${status.workflowStatus || 'processing'}</span>
        </div>
      `;
    } else if (statusContainer && !status.currentWorkflowId) {
      statusContainer.remove();
    }
  }

  private getWorkflowStatusIcon(status?: string): string {
    switch (status) {
      case 'processing': return '⏳';
      case 'waiting_for_human': return '⏸️';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '🔄';
    }
  }

  private formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private hideTypingIndicator(): void {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  private scrollChatToBottom(): void {
    if (this.chatContainer) {
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
  }

  private displayError(message: string): void {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      
      // Auto-hide after 8 seconds
      setTimeout(() => {
        this.hideErrorDisplay();
      }, 8000);
    }
  }

  private displaySuccess(message: string): void {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
      successDiv.textContent = message;
      successDiv.style.display = 'block';
      
      // Auto-hide after 4 seconds
      setTimeout(() => {
        successDiv.style.display = 'none';
      }, 4000);
    }
  }

  private hideErrorDisplay(): void {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  private updateState(updates: Partial<UIState>): void {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Only emit if state actually changed
    if (JSON.stringify(previousState) !== JSON.stringify(this.state)) {
      this.emit('stateChange', this.state);
    }
  }
}
