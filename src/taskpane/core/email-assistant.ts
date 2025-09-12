/**
 * EmailAssistant - Core application controller
 * 
 * Responsibilities:
 * - Application lifecycle management
 * - Coordination between components
 * - High-level error handling
 * - Office.js integration
 */

import { EmailContext, AgentAction, InterruptData, InterruptResponse } from '../../models/types';
import { isOfficeReady } from '../../utils/office-helpers';
import { localizationManager } from '../../localization/localization-manager';
import { ConnectionManager } from '../services/connection-manager';
import { EmailContextManager } from '../services/email-context-manager';
import { ChatManager } from '../services/chat-manager';
import { UIStateManager } from '../services/ui-state-manager';

export class EmailAssistant {
  private readonly instanceId: string;
  private readonly connectionManager: ConnectionManager;
  private readonly emailContextManager: EmailContextManager;
  private readonly chatManager: ChatManager;
  private readonly uiStateManager: UIStateManager;

  private isInitialized: boolean = false;

  constructor() {
    this.instanceId = Math.random().toString(36).substr(2, 9);
    console.log(`[EmailAssistant] Instance created: ${this.instanceId}`);

    // Initialize dependency injection pattern
    this.connectionManager = new ConnectionManager();
    this.emailContextManager = new EmailContextManager();
    this.chatManager = new ChatManager(this.emailContextManager);
    this.uiStateManager = new UIStateManager();

    this.setupEventHandlers();
  }

  /**
   * Initialize the Email Assistant application
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[EmailAssistant] Already initialized');
      return;
    }

    console.log('[EmailAssistant] Starting initialization...');
    
    try {
      // Step 1: Validate Office.js environment
      this.validateOfficeEnvironment();

      // Step 2: Initialize localization
      this.initializeLocalization();

      // Step 3: Initialize core services
      await this.initializeServices();

      // Step 4: Setup UI state management
      this.initializeUI();

      this.isInitialized = true;
      console.log('[EmailAssistant] Initialization completed successfully');
      
    } catch (error) {
      console.error('[EmailAssistant] Initialization failed:', error);
      this.handleInitializationError(error);
      throw error;
    }
  }

  /**
   * Get current email context
   */
  getCurrentEmailContext(): EmailContext | null {
    return this.emailContextManager.getCurrentContext();
  }

  /**
   * Refresh email context from Outlook
   */
  async refreshEmailContext(): Promise<void> {
    await this.emailContextManager.refreshContext();
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    console.log('[EmailAssistant] Disposing resources...');
    
    this.chatManager.dispose();
    this.connectionManager.dispose();
    this.uiStateManager.dispose();
    
    this.isInitialized = false;
  }

  private validateOfficeEnvironment(): void {
    if (!isOfficeReady()) {
      throw new Error(localizationManager.getString('errors.officeNotReady'));
    }
  }

  private initializeLocalization(): void {
    console.log('[EmailAssistant] Initializing localization...');
    localizationManager.initializeSync();
    console.log('[EmailAssistant] Localization initialized with locale:', 
      localizationManager.getCurrentLocale());
  }

  private async initializeServices(): Promise<void> {
    // Initialize services in dependency order
    await this.connectionManager.initialize();
    await this.emailContextManager.initialize();
  }

  private initializeUI(): void {
    this.uiStateManager.initialize();
    this.updateUIWithLocalizedStrings();
  }

  private setupEventHandlers(): void {
    // Connection status events
    this.connectionManager.onStatusChange((isConnected, error) => {
      console.log(`[EmailAssistant] Connection status change received: isConnected=${isConnected}, error=${error}`);
      this.uiStateManager.updateConnectionStatus(isConnected, error);
    });

    // Email context change events
    this.emailContextManager.onContextChange((context) => {
      this.uiStateManager.updateEmailContext(context);
    });

    // Chat events
    this.chatManager.onStatusChange((status) => {
      console.log('[EmailAssistant] Chat status change received:', status);
      this.uiStateManager.updateChatStatus(status);
    });

    // Connect chat messages to UI display
    this.chatManager.onMessageAdded((message) => {
      this.uiStateManager.addChatMessage(message);
    });

    // Handle message clearing
    this.chatManager.on('messagesCleared', () => {
      this.uiStateManager.clearChatMessages();
    });

    // UI events from state manager
    this.uiStateManager.on('sendChatMessage', () => {
      this.handleSendChatMessage();
    });

    this.uiStateManager.on('suggestionClicked', (suggestion: string) => {
      this.handleSuggestionClick(suggestion);
    });

    // Classification workflow event
    this.uiStateManager.on('classifyEmailRequested', () => {
      console.log('[EmailAssistant] classifyEmailRequested event received');
      this.chatManager.startClassificationWorkflow();
    });
  }

  private updateUIWithLocalizedStrings(): void {
    const elements = {
      'app-title': localizationManager.getString('app.title'),
      'email-context-title': localizationManager.getString('emailContext.title'),
      'chat-title': localizationManager.getString('chat.title'),
      'email-subject-label': localizationManager.getString('emailContext.subject'),
      'email-from-label': localizationManager.getString('emailContext.from'),
      'email-to-label': localizationManager.getString('emailContext.to')
    };

    Object.entries(elements).forEach(([id, text]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = text;
      }
    });
  }

  private handleInitializationError(error: any): void {
    const errorMessage = error instanceof Error ? error.message : 
      localizationManager.getString('errors.connectionFailed');
    
    this.uiStateManager.showError(errorMessage);
    this.uiStateManager.updateConnectionStatus(false);
  }

  private async handleSendChatMessage(): Promise<void> {
    const uiState = this.uiStateManager.getState();
    // Get the input value from the UI state manager's chat input
    const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
    const message = chatInput?.value?.trim();
    
    if (message) {
      this.uiStateManager.clearChatInput();
      await this.chatManager.sendMessage(message);
    }
  }

  private async handleSuggestionClick(suggestion: string): Promise<void> {
    console.log(`[EmailAssistant] handleSuggestionClick called with: ${suggestion}`);
    
    // Handle special workflow commands
    if (suggestion === 'classify' || suggestion === 'workflow') {
      await this.chatManager.startClassificationWorkflow();
      return;
    }
    
    let message = '';
    
    switch (suggestion) {
      case 'extractTasks':
      case 'extract-tasks':
        message = localizationManager.getString('chat.prompts.extractTasks');
        break;
      case 'writeReply':
      case 'write-reply':
        message = localizationManager.getString('chat.prompts.writeReply');
        break;
      case 'summarize':
        message = localizationManager.getString('chat.prompts.summarize');
        break;
      case 'sentiment':
        message = localizationManager.getString('chat.prompts.sentiment');
        break;
      case 'classify':
        await this.chatManager.startClassificationWorkflow();
        return;
      default:
        console.warn(`[EmailAssistant] Unknown suggestion: ${suggestion}`);
        return;
    }
    
    console.log(`[EmailAssistant] Sending message: ${message}`);
    if (message) {
      await this.chatManager.sendMessage(message);
    }
  }

  private async handleHumanApprovalRequest(interruptData: any): Promise<void> {
    console.log('[EmailAssistant] Handling human approval request:', interruptData);
    
    try {
      // Show the approval UI and wait for user decision
      const decision = await this.showApprovalDialog(interruptData);
      
      // The decision is already handled by the HITL dialog
      console.log('Human decision processed:', decision);
      
    } catch (error) {
      console.error('[EmailAssistant] Error handling approval request:', error);
    }
  }

  private async showApprovalDialog(interruptData: any): Promise<any> {
    return new Promise((resolve) => {
      // Check if this is an information-needed interrupt with clarifying questions
      if (interruptData.interrupt_type === 'information_needed_questions' && 
          interruptData.clarifying_questions && 
          interruptData.clarifying_questions.length > 0) {
        
        // Use a more interactive approach for questions
        this.showClarifyingQuestionsDialog(interruptData, resolve);
        return;
      }
      
      // For other interrupt types, use the existing inline button approach
      const messageContent = `🤔 ${interruptData.description}`;
      const approvalButtons = this.createInlineApprovalButtons(interruptData, resolve);
      
      // Add message with inline buttons
      this.uiStateManager.addChatMessage({
        id: `interrupt_${Date.now()}`,
        type: 'assistant',
        content: messageContent + approvalButtons,
        timestamp: new Date()
      });
      
      // Set up event listeners for the inline buttons
      setTimeout(() => {
        this.setupInlineButtonListeners(interruptData, resolve);
      }, 100);
    });
  }

  private showClarifyingQuestionsDialog(interruptData: any, resolve: (decision: any) => void): void {
    console.log('[EmailAssistant] Showing clarifying questions dialog');
    
    // Create a custom dialog for clarifying questions
    let dialogHtml = `
      <div class="clarifying-questions-dialog" style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h4 style="color: #856404; margin: 0 0 12px 0;">📋 Clarifying Questions</h4>
        <p style="margin: 0 0 16px 0; color: #856404;">Please answer the following questions to help generate an appropriate response:</p>
        <div class="questions-list">
    `;
    
    // Add each question with a text area
    interruptData.clarifying_questions.forEach((question: string, index: number) => {
      dialogHtml += `
        <div class="question-item" style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 4px; color: #856404; font-weight: bold;">${index + 1}. ${question}</label>
          <textarea id="answer-${index}" rows="2" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit;" placeholder="Enter your answer here..."></textarea>
        </div>
      `;
    });
    
    // Add action buttons
    dialogHtml += `
        </div>
        <div class="dialog-actions" style="display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end;">
          <button id="submit-answers-btn" class="suggestion-btn" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">✅ Submit Answers</button>
          <button id="custom-reply-btn" class="suggestion-btn" style="background: #17a2b8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">✏️ Write Custom Reply</button>
          <button id="convert-ignore-btn" class="suggestion-btn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">🚫 Mark as No Response Needed</button>
        </div>
      </div>
    `;
    
    // Add the dialog to chat
    this.uiStateManager.addChatMessage({
      id: `clarifying_${Date.now()}`,
      type: 'assistant',
      content: dialogHtml,
      timestamp: new Date()
    });
    
    // Set up event handlers
    setTimeout(() => {
      this.setupClarifyingQuestionsHandlers(interruptData, resolve);
    }, 100);
  }

  private setupClarifyingQuestionsHandlers(interruptData: any, resolve: (decision: any) => void): void {
    const submitBtn = document.getElementById('submit-answers-btn');
    const customReplyBtn = document.getElementById('custom-reply-btn');
    const convertIgnoreBtn = document.getElementById('convert-ignore-btn');
    
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        // Collect all answers
        const answers: string[] = [];
        interruptData.clarifying_questions.forEach((_: string, index: number) => {
          const textarea = document.getElementById(`answer-${index}`) as HTMLTextAreaElement;
          answers.push(textarea?.value || '');
        });
        
        // Format answers for the backend
        const formattedAnswers = interruptData.clarifying_questions
          .map((question: string, index: number) => `Q: ${question}\nA: ${answers[index]}`)
          .join('\n\n');
        
        resolve({
          type: 'respond',
          feedback: formattedAnswers
        });
      });
    }
    
    if (customReplyBtn) {
      customReplyBtn.addEventListener('click', () => {
        this.showCustomReplyInput(resolve);
      });
    }
    
    if (convertIgnoreBtn) {
      convertIgnoreBtn.addEventListener('click', () => {
        resolve({
          type: 'reject'
        });
      });
    }
  }

  private showCustomReplyInput(resolve: (decision: any) => void): void {
    const customReplyHtml = `
      <div class="custom-reply-input" style="background: #e8f5e8; border: 1px solid #28a745; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h4 style="color: #155724; margin: 0 0 12px 0;">✏️ Write Custom Reply</h4>
        <textarea id="custom-reply-text" rows="4" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit;" placeholder="Write your custom response here..."></textarea>
        <div class="dialog-actions" style="display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end;">
          <button id="send-custom-reply-btn" class="suggestion-btn" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">📤 Send Custom Reply</button>
          <button id="cancel-custom-reply-btn" class="suggestion-btn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">❌ Cancel</button>
        </div>
      </div>
    `;
    
    this.uiStateManager.addChatMessage({
      id: `custom_reply_${Date.now()}`,
      type: 'assistant',
      content: customReplyHtml,
      timestamp: new Date()
    });
    
    setTimeout(() => {
      const sendBtn = document.getElementById('send-custom-reply-btn');
      const cancelBtn = document.getElementById('cancel-custom-reply-btn');
      
      if (sendBtn) {
        sendBtn.addEventListener('click', () => {
          const textarea = document.getElementById('custom-reply-text') as HTMLTextAreaElement;
          const customReply = textarea?.value || '';
          
          resolve({
            type: 'custom_reply',
            feedback: customReply
          });
        });
      }
      
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          resolve({
            type: 'reject'
          });
        });
      }
    }, 100);
  }

  private configureApprovalButtons(interruptData: any, resolve: (decision: any) => void): void {
    const acceptBtn = document.getElementById('chat-btn-accept');
    const editBtn = document.getElementById('chat-btn-edit');
    const respondBtn = document.getElementById('chat-btn-respond');
    const rejectBtn = document.getElementById('chat-btn-reject');

    // Clear previous event listeners
    const newAcceptBtn = acceptBtn?.cloneNode(true) as HTMLElement;
    const newEditBtn = editBtn?.cloneNode(true) as HTMLElement;
    const newRespondBtn = respondBtn?.cloneNode(true) as HTMLElement;
    const newRejectBtn = rejectBtn?.cloneNode(true) as HTMLElement;

    acceptBtn?.parentNode?.replaceChild(newAcceptBtn, acceptBtn);
    editBtn?.parentNode?.replaceChild(newEditBtn, editBtn);
    respondBtn?.parentNode?.replaceChild(newRespondBtn, respondBtn);
    rejectBtn?.parentNode?.replaceChild(newRejectBtn, rejectBtn);

    // Configure button visibility and handlers
    if (interruptData.config?.allow_accept && newAcceptBtn) {
      newAcceptBtn.style.display = 'inline-block';
      newAcceptBtn.addEventListener('click', () => {
        this.hideApprovalArea();
        resolve({ type: 'accept', args: interruptData.args });
      });
    } else if (newAcceptBtn) {
      newAcceptBtn.style.display = 'none';
    }

    if (interruptData.config?.allow_edit && newEditBtn) {
      newEditBtn.style.display = 'inline-block';
      newEditBtn.addEventListener('click', () => {
        this.hideApprovalArea();
        resolve({ type: 'edit', args: interruptData.args });
      });
    } else if (newEditBtn) {
      newEditBtn.style.display = 'none';
    }

    if (interruptData.config?.allow_respond && newRespondBtn) {
      newRespondBtn.style.display = 'inline-block';
      newRespondBtn.addEventListener('click', () => {
        this.hideApprovalArea();
        resolve({ type: 'open_in_outlook', args: interruptData.args });
      });
    } else if (newRespondBtn) {
      newRespondBtn.style.display = 'none';
    }

    if (interruptData.config?.allow_reject && newRejectBtn) {
      newRejectBtn.style.display = 'inline-block';
      newRejectBtn.addEventListener('click', () => {
        this.hideApprovalArea();
        resolve({ type: 'reject', args: interruptData.args });
      });
    } else if (newRejectBtn) {
      newRejectBtn.style.display = 'none';
    }
  }

  private hideApprovalArea(): void {
    const approvalArea = document.getElementById('chat-approval-area');
    if (approvalArea) {
      approvalArea.style.display = 'none';
    }
  }

  private createInlineApprovalButtons(interruptData: any, resolve: (decision: any) => void): string {
    let buttonsHtml = '<div class="chat-suggestions" style="margin-top: 12px;">';
    
    // Different button configurations based on classification type
    const classification = interruptData.classification;
    
    if (interruptData.config?.allow_accept) {
      const acceptText = this.getAcceptButtonText(classification);
      buttonsHtml += `<button class="suggestion-btn approve-btn" data-action="accept">✅ ${acceptText}</button>`;
    }
    
    if (interruptData.config?.allow_process) {
      buttonsHtml += `<button class="suggestion-btn approve-btn" data-action="process">🔄 ${localizationManager.getString('decision.processInstead')}</button>`;
    }
    
    if (interruptData.config?.allow_edit) {
      const editText = this.getEditButtonText(classification);
      buttonsHtml += `<button class="suggestion-btn approve-btn" data-action="edit">✏️ ${editText}</button>`;
    }
    
    if (interruptData.config?.allow_respond) {
      const respondText = this.getRespondButtonText(classification);
      buttonsHtml += `<button class="suggestion-btn approve-btn" data-action="respond">💬 ${respondText}</button>`;
    }
    
    if (interruptData.config?.allow_reject) {
      const rejectText = this.getRejectButtonText(classification);
      buttonsHtml += `<button class="suggestion-btn approve-btn" data-action="reject">❌ ${rejectText}</button>`;
    }
    
    buttonsHtml += '</div>';
    return buttonsHtml;
  }

  private getAcceptButtonText(classification: string): string {
    switch (classification) {
      case 'ignore': return localizationManager.getString('decision.approveIgnore');
      case 'auto-reply': return localizationManager.getString('decision.approveReply');
      default: return localizationManager.getString('buttons.accept');
    }
  }

  private getEditButtonText(classification: string): string {
    switch (classification) {
      case 'auto-reply': return localizationManager.getString('decision.editResponse');
      default: return localizationManager.getString('buttons.edit');
    }
  }

  private getRespondButtonText(classification: string): string {
    switch (classification) {
      case 'information-needed': return localizationManager.getString('decision.provideAnswers');
      default: return localizationManager.getString('buttons.respond');
    }
  }

  private getRejectButtonText(classification: string): string {
    switch (classification) {
      case 'auto-reply':
      case 'information-needed': return localizationManager.getString('decision.denyAction');
      default: return localizationManager.getString('buttons.reject');
    }
  }

  private setupInlineButtonListeners(interruptData: any, resolve: (decision: any) => void): void {
    // Use event delegation to handle dynamically created buttons
    const chatMessages = document.getElementById('chat-messages');
    
    if (chatMessages) {
      const handleButtonClick = (e: Event) => {
        const target = e.target as HTMLElement;
        const button = target.closest('.approve-btn') as HTMLButtonElement;
        
        if (!button) return;
        
        const action = button.getAttribute('data-action');
        console.log('[EmailAssistant] Approval button clicked:', action);
        
        // Remove event listener to prevent multiple calls
        chatMessages.removeEventListener('click', handleButtonClick);
        
        // Remove all approval buttons after click
        const allApprovalButtons = document.querySelectorAll('.approve-btn');
        allApprovalButtons.forEach(btn => btn.remove());
        
        // Handle special actions that need user input or custom processing
        if (action === 'respond') {
          this.handleRespondAction(interruptData, resolve);
        } else if (action === 'process') {
          this.handleProcessAction(interruptData, resolve);
        } else {
          // Standard decision
          resolve({ 
            type: action, 
            args: interruptData.args 
          });
        }
      };
      
      // Add event listener with delegation
      chatMessages.addEventListener('click', handleButtonClick);
    }
  }

  private handleRespondAction(interruptData: any, resolve: (decision: any) => void): void {
    console.log('[EmailAssistant] Handling respond action');
    
    // Show input prompt for user response
    this.showResponseInput(interruptData, resolve);
  }

  private handleProcessAction(interruptData: any, resolve: (decision: any) => void): void {
    console.log('[EmailAssistant] Handling process action - treating email as normal instead of ignore');
    
    // Add confirmation message
    this.uiStateManager.addChatMessage({
      id: `process_confirmation_${Date.now()}`,
      type: 'assistant',
      content: '🔄 Diese E-Mail wird als normale E-Mail behandelt und nicht ignoriert.',
      timestamp: new Date()
    });

    // Resolve with the process decision
    resolve({ 
      type: 'process', 
      args: interruptData.args 
    });
  }

  private showResponseInput(interruptData: any, resolve: (decision: any) => void): void {
    // Add a message asking for user input
    this.uiStateManager.addChatMessage({
      id: `respond_prompt_${Date.now()}`,
      type: 'assistant',
      content: '💬 Bitte geben Sie Ihre Antwort oder zusätzliche Informationen ein:',
      timestamp: new Date()
    });

    // Create inline input field
    const inputHtml = `
      <div class="response-input-container" style="margin-top: 12px;">
        <textarea 
          id="response-input" 
          class="chat-input" 
          placeholder="Geben Sie hier Ihre Antwort oder zusätzliche Informationen ein..." 
          rows="3"
          style="width: 100%; margin-bottom: 8px;"
        ></textarea>
        <div class="response-buttons">
          <button class="suggestion-btn" id="send-response-btn">✅ Antwort senden</button>
          <button class="suggestion-btn" id="cancel-response-btn">❌ Abbrechen</button>
        </div>
      </div>
    `;

    this.uiStateManager.addChatMessage({
      id: `respond_input_${Date.now()}`,
      type: 'assistant',
      content: inputHtml,
      timestamp: new Date()
    });

    // Set up input handlers
    setTimeout(() => {
      this.setupResponseInputHandlers(resolve);
    }, 100);
  }

  private setupResponseInputHandlers(resolve: (decision: any) => void): void {
    const sendBtn = document.getElementById('send-response-btn');
    const cancelBtn = document.getElementById('cancel-response-btn');
    const responseInput = document.getElementById('response-input') as HTMLTextAreaElement;

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const responseText = responseInput?.value?.trim() || '';
        
        // Remove input interface
        const inputContainer = document.querySelector('.response-input-container');
        inputContainer?.remove();
        
        if (responseText) {
          // Add user's response to chat
          this.uiStateManager.addChatMessage({
            id: `user_response_${Date.now()}`,
            type: 'user',
            content: responseText,
            timestamp: new Date()
          });
          
          // Resolve with response
          resolve({ 
            type: 'respond', 
            feedback: responseText 
          });
        } else {
          resolve({ type: 'reject' });
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        // Remove input interface
        const inputContainer = document.querySelector('.response-input-container');
        inputContainer?.remove();
        
        resolve({ type: 'reject' });
      });
    }

    // Focus on input
    if (responseInput) {
      responseInput.focus();
    }
  }
}
