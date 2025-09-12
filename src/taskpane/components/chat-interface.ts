/**
 * ChatInterface - Manages chat UI interactions and message display
 * 
 * Responsibilities:
 * - Chat message rendering
 * - Message formatting
 * - Input handling
 * - Suggestion buttons
 * - Approval workflows
 */

import { InterruptResponse, ChatApprovalOptions, EmailDraft } from '../../models/types';
import { EventEmitter } from '../../utils/event-emitter';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  icon?: string;
}

export class ChatInterface extends EventEmitter {
  private chatContainer: HTMLElement | null = null;
  private chatInput: HTMLTextAreaElement | null = null;
  private sendButton: HTMLElement | null = null;
  private suggestionButtons: NodeListOf<Element> | null = null;

  constructor() {
    super();
  }

  initialize(): void {
    console.log('[ChatInterface] Initializing...');
    
    this.initializeElements();
    this.setupEventHandlers();
    this.showWelcomeMessage();
    
    console.log('[ChatInterface] Initialized successfully');
  }

  addMessage(message: ChatMessage): void {
    if (!this.chatContainer) return;

    const messageElement = this.createMessageElement(message);
    this.chatContainer.appendChild(messageElement);
    this.scrollToBottom();
  }

  addUserMessage(content: string): void {
    this.addMessage({
      id: this.generateMessageId(),
      type: 'user',
      content,
      timestamp: new Date(),
      icon: '👤'
    });
  }

  addAssistantMessage(content: string, icon: string = '🤖'): void {
    this.addMessage({
      id: this.generateMessageId(),
      type: 'assistant',
      content,
      timestamp: new Date(),
      icon
    });
  }

  addSystemMessage(content: string, icon: string = '⚙️'): void {
    this.addMessage({
      id: this.generateMessageId(),
      type: 'system',
      content,
      timestamp: new Date(),
      icon
    });
  }

  showTypingIndicator(): void {
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
    
    if (this.chatContainer) {
      this.chatContainer.appendChild(typingDiv);
      this.scrollToBottom();
    }
  }

  hideTypingIndicator(): void {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  clearInput(): void {
    if (this.chatInput) {
      this.chatInput.value = '';
      this.chatInput.style.height = 'auto';
    }
  }

  getInputValue(): string {
    return this.chatInput?.value.trim() || '';
  }

  setInputEnabled(enabled: boolean): void {
    if (this.chatInput) {
      this.chatInput.disabled = !enabled;
    }
    if (this.sendButton) {
      (this.sendButton as HTMLButtonElement).disabled = !enabled;
    }
  }

  clearMessages(): void {
    if (this.chatContainer) {
      this.chatContainer.innerHTML = '';
      this.showWelcomeMessage();
    }
  }

  showReplyApproval(content: string): Promise<InterruptResponse> {
    return new Promise((resolve) => {
      const approvalDiv = this.createApprovalElement('reply', content, resolve);
      if (this.chatContainer) {
        this.chatContainer.appendChild(approvalDiv);
        this.scrollToBottom();
      }
    });
  }

  showChatApproval(options: ChatApprovalOptions): Promise<InterruptResponse> {
    return new Promise((resolve) => {
      const approvalDiv = this.createChatApprovalElement(options, resolve);
      if (this.chatContainer) {
        this.chatContainer.appendChild(approvalDiv);
        this.scrollToBottom();
      }
    });
  }

  showEmailEditor(draft: EmailDraft): Promise<{ draft: EmailDraft; feedback: string }> {
    return new Promise((resolve, reject) => {
      const editorDiv = this.createEmailEditorElement(draft, resolve, reject);
      if (this.chatContainer) {
        this.chatContainer.appendChild(editorDiv);
        this.scrollToBottom();
      }
    });
  }

  showInlineInput(title: string, placeholder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const inputDiv = this.createInlineInputElement(title, placeholder, resolve, reject);
      if (this.chatContainer) {
        this.chatContainer.appendChild(inputDiv);
        this.scrollToBottom();
      }
    });
  }

  streamMessage(icon: string, initialText: string = ''): HTMLElement | null {
    this.hideTypingIndicator();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message ai-message streaming';
    
    messageDiv.innerHTML = `
      <span class="message-icon">${icon}</span>
      <span class="message-text">${this.formatContent(initialText)}</span>
    `;
    
    if (this.chatContainer) {
      this.chatContainer.appendChild(messageDiv);
      this.scrollToBottom();
    }
    
    return messageDiv.querySelector('.message-text') as HTMLElement;
  }

  dispose(): void {
    console.log('[ChatInterface] Disposing...');
    this.removeAllListeners();
  }

  private initializeElements(): void {
    this.chatContainer = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
    this.sendButton = document.getElementById('chat-send-btn');
    this.suggestionButtons = document.querySelectorAll('.suggestion-btn');

    if (!this.chatContainer || !this.chatInput || !this.sendButton) {
      console.error('[ChatInterface] Required elements not found');
    }
  }

  private setupEventHandlers(): void {
    // Send button click
    if (this.sendButton) {
      this.sendButton.addEventListener('click', () => {
        this.handleSendMessage();
      });
    }

    // Input keydown handling
    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });

      // Auto-resize input
      this.chatInput.addEventListener('input', () => {
        this.autoResizeInput();
      });
    }

    // Suggestion buttons
    if (this.suggestionButtons) {
      this.suggestionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const suggestion = (e.target as HTMLElement)
            .closest('.suggestion-btn')?.getAttribute('data-suggestion');
          if (suggestion) {
            this.emit('suggestionClicked', suggestion);
          }
        });
      });
    }
  }

  private handleSendMessage(): void {
    const message = this.getInputValue();
    if (message) {
      this.emit('sendMessage', message);
      this.clearInput();
    }
  }

  private autoResizeInput(): void {
    if (this.chatInput) {
      this.chatInput.style.height = 'auto';
      this.chatInput.style.height = `${Math.min(this.chatInput.scrollHeight, 120)}px`;
    }
  }

  private createMessageElement(message: ChatMessage): HTMLElement {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.type}-message`;
    messageDiv.id = message.id;

    const icon = message.icon || this.getDefaultIcon(message.type);
    const formattedContent = this.formatContent(message.content);

    messageDiv.innerHTML = `
      <span class="message-icon">${icon}</span>
      <span class="message-text">${formattedContent}</span>
    `;

    return messageDiv;
  }

  private createApprovalElement(type: string, content: string, resolve: (response: InterruptResponse) => void): HTMLElement {
    const approvalDiv = document.createElement('div');
    approvalDiv.className = 'chat-message ai-message approval-message';
    
    approvalDiv.innerHTML = `
      <span class="message-icon">💬</span>
      <div class="message-text">
        <div class="inline-approval-buttons">
          <button class="approval-btn accept-btn primary-btn" data-action="accept">
            <span class="btn-icon">✅</span>
            <span class="btn-text">Accept</span>
          </button>
          <button class="approval-btn edit-btn" data-action="edit">
            <span class="btn-icon">✏️</span>
            <span class="btn-text">Edit</span>
          </button>
          <button class="approval-btn reject-btn" data-action="deny">
            <span class="btn-icon">❌</span>
            <span class="btn-text">Deny</span>
          </button>
        </div>
      </div>
    `;

    this.setupApprovalHandlers(approvalDiv, resolve);
    return approvalDiv;
  }

  private createChatApprovalElement(options: ChatApprovalOptions, resolve: (response: InterruptResponse) => void): HTMLElement {
    const approvalDiv = document.createElement('div');
    approvalDiv.className = 'chat-message ai-message approval-message';
    
    let buttonsHtml = `
      <span class="message-icon">🤔</span>
      <div class="message-text">
        <div class="inline-approval-buttons">
    `;

    if (options.showOpenInOutlook) {
      buttonsHtml += `
        <button class="approval-btn outlook-btn primary-btn" data-action="open_in_outlook">
          <span class="btn-icon">📧</span>
          <span class="btn-text">Open in Outlook</span>
        </button>
        <button class="approval-btn revise-btn" data-action="revise">
          <span class="btn-icon">✏️</span>
          <span class="btn-text">Revise</span>
        </button>
      `;
    } else {
      buttonsHtml += `
        <button class="approval-btn accept-btn primary-btn" data-action="accept">
          <span class="btn-icon">✅</span>
          <span class="btn-text">Accept</span>
        </button>
        <button class="approval-btn edit-btn" data-action="edit">
          <span class="btn-icon">✏️</span>
          <span class="btn-text">Improve</span>
        </button>
      `;
    }

    buttonsHtml += `
        <button class="approval-btn reject-btn" data-action="reject">
          <span class="btn-icon">❌</span>
          <span class="btn-text">Reject</span>
        </button>
      </div>
    </div>
    `;

    approvalDiv.innerHTML = buttonsHtml;
    this.setupApprovalHandlers(approvalDiv, resolve);
    return approvalDiv;
  }

  private createEmailEditorElement(
    draft: EmailDraft, 
    resolve: (result: { draft: EmailDraft; feedback: string }) => void,
    reject: () => void
  ): HTMLElement {
    const editorDiv = document.createElement('div');
    editorDiv.className = 'chat-message ai-message email-editor';
    
    editorDiv.innerHTML = `
      <span class="message-icon">✏️</span>
      <div class="message-text">
        <div class="email-editor-content">
          <p><strong>Edit Draft Email</strong></p>
          <div class="editor-field">
            <label>To:</label>
            <input type="text" class="edit-to-field" value="${draft.to || ''}" />
          </div>
          <div class="editor-field">
            <label>Subject:</label>
            <input type="text" class="edit-subject-field" value="${draft.subject || ''}" />
          </div>
          <div class="editor-field">
            <label>Body:</label>
            <textarea class="edit-body-field" rows="6">${draft.body || ''}</textarea>
          </div>
          <div class="editor-field">
            <label>Notes (optional):</label>
            <textarea class="edit-notes-field" rows="2" placeholder="Explain changes..."></textarea>
          </div>
          <div class="editor-buttons">
            <button class="email-save-btn btn btn-success">💾 Save Changes</button>
            <button class="email-cancel-btn btn btn-secondary">❌ Cancel</button>
          </div>
        </div>
      </div>
    `;

    this.setupEmailEditorHandlers(editorDiv, draft, resolve, reject);
    return editorDiv;
  }

  private createInlineInputElement(
    title: string, 
    placeholder: string, 
    resolve: (value: string) => void,
    reject: () => void
  ): HTMLElement {
    const inputDiv = document.createElement('div');
    inputDiv.className = 'chat-message ai-message input-form';
    
    inputDiv.innerHTML = `
      <span class="message-icon">✏️</span>
      <div class="message-text">
        <div class="input-form-content">
          <p><strong>${title}</strong></p>
          <textarea class="inline-input-field" placeholder="${placeholder}" rows="3"></textarea>
          <div class="input-buttons">
            <button class="inline-submit-btn btn btn-success">✅ Submit</button>
            <button class="inline-cancel-btn btn btn-secondary">❌ Cancel</button>
          </div>
        </div>
      </div>
    `;

    this.setupInlineInputHandlers(inputDiv, resolve, reject);
    return inputDiv;
  }

  private setupApprovalHandlers(element: HTMLElement, resolve: (response: InterruptResponse) => void): void {
    element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.approval-btn') as HTMLButtonElement;
      
      if (!button) return;
      
      const action = button.getAttribute('data-action');
      element.remove();

      switch (action) {
        case 'accept':
          resolve({ type: 'accept' });
          break;
        case 'edit':
        case 'revise':
          resolve({ type: 'edit' });
          break;
        case 'open_in_outlook':
          resolve({ type: 'open_in_outlook' });
          break;
        case 'reject':
        case 'deny':
          resolve({ type: 'reject' });
          break;
      }
    });
  }

  private setupEmailEditorHandlers(
    element: HTMLElement, 
    originalDraft: EmailDraft,
    resolve: (result: { draft: EmailDraft; feedback: string }) => void,
    reject: () => void
  ): void {
    const toField = element.querySelector('.edit-to-field') as HTMLInputElement;
    const subjectField = element.querySelector('.edit-subject-field') as HTMLInputElement;
    const bodyField = element.querySelector('.edit-body-field') as HTMLTextAreaElement;
    const notesField = element.querySelector('.edit-notes-field') as HTMLTextAreaElement;
    const saveBtn = element.querySelector('.email-save-btn') as HTMLButtonElement;
    const cancelBtn = element.querySelector('.email-cancel-btn') as HTMLButtonElement;

    toField?.focus();

    const onSave = () => {
      const editedDraft: EmailDraft = {
        to: toField?.value?.trim() || originalDraft.to,
        subject: subjectField?.value?.trim() || originalDraft.subject,
        body: bodyField?.value?.trim() || originalDraft.body,
        type: originalDraft.type || 'email'
      };
      const feedback = notesField?.value?.trim() || '';
      
      element.remove();
      resolve({ draft: editedDraft, feedback });
    };

    const onCancel = () => {
      element.remove();
      reject();
    };

    saveBtn?.addEventListener('click', onSave);
    cancelBtn?.addEventListener('click', onCancel);
  }

  private setupInlineInputHandlers(
    element: HTMLElement,
    resolve: (value: string) => void,
    reject: () => void
  ): void {
    const inputField = element.querySelector('.inline-input-field') as HTMLTextAreaElement;
    const submitBtn = element.querySelector('.inline-submit-btn') as HTMLButtonElement;
    const cancelBtn = element.querySelector('.inline-cancel-btn') as HTMLButtonElement;

    inputField?.focus();

    const onSubmit = () => {
      const value = inputField?.value?.trim() || '';
      element.remove();
      resolve(value);
    };

    const onCancel = () => {
      element.remove();
      reject();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        onSubmit();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };

    submitBtn?.addEventListener('click', onSubmit);
    cancelBtn?.addEventListener('click', onCancel);
    inputField?.addEventListener('keydown', onKeyDown);
  }

  private formatContent(content: string): string {
    // Clean up content first - remove leading/trailing whitespace and newlines
    const cleaned = content.trim().replace(/^[\r\n]+|[\r\n]+$/g, '');
    
    return cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\r\n/g, '<br>')
      .replace(/\n/g, '<br>')
      .replace(/\r/g, '<br>');
  }

  private getDefaultIcon(type: string): string {
    switch (type) {
      case 'user': return '👤';
      case 'assistant': return '🤖';
      case 'system': return '⚙️';
      default: return '💬';
    }
  }

  private scrollToBottom(): void {
    if (this.chatContainer) {
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
  }

  private showWelcomeMessage(): void {
    this.addAssistantMessage(`Hi! I can help you with this email. Try asking me:
• "Extract the key tasks from this email"
• "Write a professional reply"
• "Summarize this email"
• "What's the sentiment here?"
Or just ask me anything about the email!`);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
