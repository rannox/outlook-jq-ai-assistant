/* global Office */

import { apiClient } from './api-client';
import { wsClient } from './websocket-client';
import { UIComponents } from './ui-components';
import { 
  getCurrentEmailContext, 
  createReply, 
  insertIntoEmail, 
  isOfficeReady 
} from '../utils/office-helpers';
import { 
  EmailContext, 
  AgentAction, 
  ProcessEmailRequest, 
  EmailDraft, 
  MeetingRequest 
} from '../models/types';

class EmailAssistant {
  private currentEmailContext: EmailContext | null = null;
  private currentThreadId: string | null = null;
  private instanceId: string;
  private lastApprovedDraft: any = null; // Store the last approved draft for successful execution
  private chatInitialized: boolean = false; // Prevent multiple chat interface initializations

  constructor() {
    this.instanceId = Math.random().toString(36).substr(2, 9);
    console.log(`[DEBUG] EmailAssistant instance created: ${this.instanceId}`);
  }

  async initialize(): Promise<void> {
    console.log('Initializing Email Assistant...');
    
    try {
      // Check if Office is ready
      if (!isOfficeReady()) {
        UIComponents.showError('Office.js is not ready. Please refresh the page.');
        return;
      }

      // Test agent service connectivity
      await this.testAgentConnection();
      
      // Load current email context
      await this.loadEmailContext();
      
      // Initialize UI
      this.initializeUI();
      
      UIComponents.showStatus({ status: 'completed', message: 'Ready' });
      console.log('Email Assistant initialized successfully');
      
    } catch (error) {
      console.error('Error initializing Email Assistant:', error);
      UIComponents.showError('Failed to initialize. Please check agent service connection.');
    }
  }

  private async testAgentConnection(): Promise<void> {
    try {
      const isHealthy = await apiClient.healthCheck();
      UIComponents.setConnectionStatus(isHealthy);
      
      if (!isHealthy) {
        throw new Error('Agent service is not responding');
      }
    } catch (error) {
      console.error('Agent service connection failed:', error);
      UIComponents.setConnectionStatus(false);
      throw new Error('Cannot connect to agent service. Please ensure it is running on localhost:8000');
    }
  }

  private async loadEmailContext(): Promise<void> {
    try {
      UIComponents.hideError();
      
      this.currentEmailContext = await getCurrentEmailContext();
      
      if (this.currentEmailContext) {
        this.updateEmailContextUI();
        console.log('Email context loaded:', this.currentEmailContext);
        UIComponents.showSuccess('Email context loaded successfully');
      } else {
        UIComponents.showError('No email context available. Please select an email.');
        UIComponents.hideEmailContext();
      }
    } catch (error) {
      console.error('Error loading email context:', error);
      UIComponents.showError('Failed to load email context');
      UIComponents.hideEmailContext();
    }
  }

  private updateEmailContextUI(): void {
    if (!this.currentEmailContext) return;

    UIComponents.updateEmailContext(
      this.currentEmailContext.subject,
      this.currentEmailContext.sender,
      this.currentEmailContext.to
    );
  }

  private initializeUI(): void {
    // Chat interface (primary and only interface)
    this.initializeChatInterface();

    // Utility buttons
    this.addEventListenerSafe('btn-refresh', 'click', 
      () => this.loadEmailContext());
    this.addEventListenerSafe('btn-test-connection', 'click', 
      () => this.testAgentConnection());

    console.log('UI event listeners initialized');
  }

  private initializeChatInterface(): void {
    console.log('[DEBUG] initializeChatInterface called');
    
    // Prevent multiple initializations
    if (this.chatInitialized) {
      console.log('[DEBUG] Chat already initialized, skipping');
      return;
    }
    
    // Chat input and send button
    const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
    const chatSendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;

    if (chatInput && chatSendBtn) {
      // Send button click
      this.addEventListenerSafe('chat-send-btn', 'click', () => this.sendChatMessage());

      // Enter key handling for chat input
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage();
        }
      });

      // Auto-resize textarea
      chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
      });
    }

    // Suggestion buttons - remove any existing listeners first
    const suggestionButtons = document.querySelectorAll('.suggestion-btn');
    console.log(`[DEBUG] Found ${suggestionButtons.length} suggestion buttons`);
    
    // Clear any existing listeners by cloning and replacing elements
    suggestionButtons.forEach((btn, index) => {
      const newBtn = btn.cloneNode(true) as HTMLButtonElement;
      btn.parentNode?.replaceChild(newBtn, btn);
      
      console.log(`[DEBUG] Adding listener to suggestion button ${index}: ${newBtn.getAttribute('data-suggestion')}`);
      newBtn.addEventListener('click', () => {
        console.log(`[DEBUG] Suggestion button clicked: ${newBtn.getAttribute('data-suggestion')}`);
        const suggestion = newBtn.getAttribute('data-suggestion');
        if (suggestion && chatInput) {
          chatInput.value = suggestion;
          this.sendChatMessage();
        }
      });
    });

    // Mark as initialized
    this.chatInitialized = true;
    console.log('Chat interface initialized');
  }

  private isEmailReplyRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return (lowerMessage.includes('write') && (lowerMessage.includes('reply') || lowerMessage.includes('response'))) ||
           (lowerMessage.includes('compose') && lowerMessage.includes('email')) ||
           lowerMessage.includes('draft');
  }

  private async handleEmailReplyResponse(emailContent: string, originalMessage: string): Promise<void> {
    try {
      console.log('Creating Outlook reply with content:', emailContent);
      
      // Add a chat message to show what's happening
      UIComponents.addChatMessage('📧', 'Opening email reply window in Outlook...');
      
      // Use the existing createReply function to open Outlook's reply window
      await createReply(emailContent);
      
      // Add success message
      UIComponents.addChatMessage('✅', 'Email reply window opened! You can edit and send the email from there.');
      
    } catch (error) {
      console.error('Error creating email reply:', error);
      UIComponents.addChatMessage('❌', 'Sorry, I couldn\'t open the email reply window. Here\'s the content instead:');
      UIComponents.addChatMessage('📧', emailContent);
    }
  }

  private formatProposalForChat(data: any): string {
    if (data.description) {
      return `💡 **Proposal**: ${data.description}`;
    } else if (data.args && data.args.body) {
      return `💡 **I'd like to propose this email reply**:\n\n${data.args.body}`;
    } else {
      return `💡 **I have a proposal for you to review**`;
    }
  }

  private isEmailContent(args: any): boolean {
    return args && (args.body || args.subject || args.to);
  }

  private async handleEmailProposalWorkflow(data: any): Promise<void> {
    // Add email-specific approval message
    UIComponents.addChatMessage('📧', 'Would you like me to open this in Outlook for you to review and send?');
    
    // Show chat approval buttons with email-specific options
    const response = await UIComponents.showChatApproval({
      showPreview: true,
      showOpenInOutlook: true,
      emailContent: data.args?.body || ''
    });
    
    await this.handleApprovalResponse(response, data);
  }

  private async handleStandardProposalWorkflow(data: any): Promise<void> {
    // Show standard chat approval buttons
    const response = await UIComponents.showChatApproval({
      showPreview: false,
      showOpenInOutlook: false
    });
    
    await this.handleApprovalResponse(response, data);
  }

  private shouldShowApprovalButtons(originalMessage: string, resultText: string): boolean {
    const lowerMessage = originalMessage.toLowerCase();
    const lowerResult = resultText.toLowerCase();
    
    // ALWAYS show approval for write reply requests
    if (this.isEmailReplyRequest(originalMessage)) {
      return true;
    }
    
    // Show approval for proposal-like requests
    if (lowerMessage.includes('proposal') || lowerMessage.includes('propose') || lowerMessage.includes('draft')) {
      return true;
    }
    
    // Show approval if the result looks like a proposal/draft
    if (lowerResult.includes('subject:') && lowerResult.includes('dear ') && lowerResult.length > 100) {
      return true;
    }
    
    // Show approval for long, structured email content
    if (lowerResult.includes('regards') && lowerResult.includes('dear ') && lowerResult.length > 150) {
      return true;
    }
    
    return false;
  }

  private async handleProposalApprovalFlow(resultText: string, originalMessage: string): Promise<void> {
    // Add the proposal to chat
    UIComponents.addChatMessage('🤖', resultText);
    
    // Check if this is a write reply request
    if (this.isEmailReplyRequest(originalMessage)) {
      // Email reply workflow - use custom reply approval buttons
      const response = await UIComponents.showReplyApproval(resultText);
      await this.handleReplyApprovalResponse(response, resultText, originalMessage);
    } else {
      // Determine if this is general email content
      const isEmailContent = resultText.toLowerCase().includes('subject:') || 
                            (resultText.toLowerCase().includes('dear ') && resultText.toLowerCase().includes('regards'));
      
      if (isEmailContent) {
        // Email proposal workflow
        UIComponents.addChatMessage('📧', 'Would you like me to open this email in Outlook for you to review and send?');
        
        const response = await UIComponents.showChatApproval({
          showPreview: true,
          showOpenInOutlook: true,
          emailContent: resultText
        });
        
        await this.handleDirectApprovalResponse(response, resultText, originalMessage);
      } else {
        // General proposal workflow
        UIComponents.addChatMessage('💡', 'How would you like to proceed with this proposal?');
        
        const response = await UIComponents.showChatApproval({
          showPreview: false,
          showOpenInOutlook: false
        });
        
        await this.handleDirectApprovalResponse(response, resultText, originalMessage);
      }
    }
  }

  private async handleReplyApprovalResponse(response: any, content: string, originalMessage: string): Promise<void> {
    try {
      if (response.type === 'accept') {
        // Accept - open the reply in Outlook
        UIComponents.addChatMessage('✅', 'Opening email reply in Outlook...');
        await this.handleEmailReplyResponse(content, originalMessage);
      } else if (response.type === 'edit') {
        // Edit - allow inline editing of the reply content
        UIComponents.addChatMessage('✏️', 'Edit the reply below and press "Update Reply" when done:');
        await this.showInlineReplyEditor(content, originalMessage);
      } else if (response.type === 'deny') {
        // Deny - remove the reply from chat
        UIComponents.addChatMessage('❌', 'Reply cancelled.');
        // The reply message is already in chat, we just acknowledge the denial
      }
    } catch (error) {
      console.error('Error handling reply approval response:', error);
      UIComponents.addChatMessage('❌', 'Sorry, there was an error processing your response.');
    }
  }

  private async handleDirectApprovalResponse(response: any, content: string, originalMessage: string): Promise<void> {
    try {
      if (response.type === 'open_in_outlook') {
        // Open in Outlook (primary email action)
        await this.handleEmailReplyResponse(content, originalMessage);
      } else if (response.type === 'accept') {
        // Copy proposal to clipboard and provide next steps
        await this.handleAcceptProposal(content, originalMessage);
      } else if (response.type === 'edit') {
        UIComponents.addChatMessage('✏️', `I'll revise this based on your feedback: "${response.feedback}"`);
        // Here we could re-send the request to the agent with the feedback
        await this.handleRevisionRequest(originalMessage, response.feedback);
      } else if (response.type === 'reject') {
        UIComponents.addChatMessage('❌', 'Got it. I won\'t proceed with this proposal.');
      }
    } catch (error) {
      console.error('Error handling approval response:', error);
      UIComponents.addChatMessage('❌', 'Sorry, there was an error processing your response.');
    }
  }

  private async handleAcceptProposal(content: string, originalMessage: string): Promise<void> {
    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(content);
      
      UIComponents.addChatMessage('✅', 'Perfect! I\'ve copied the proposal to your clipboard.');
      UIComponents.addChatMessage('💡', 'You can now paste it into any document, email, or application where you need it.');
      
    } catch (clipboardError) {
      console.log('Clipboard access failed, falling back to text selection');
      
      // Fallback: Create a temporary textarea for copying
      try {
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = content;
        tempTextArea.style.position = 'fixed';
        tempTextArea.style.opacity = '0';
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);
        
        UIComponents.addChatMessage('✅', 'Great! I\'ve copied the proposal to your clipboard.');
        UIComponents.addChatMessage('💡', 'You can now paste it wherever you need it.');
        
      } catch (fallbackError) {
        console.error('Both clipboard methods failed:', fallbackError);
        UIComponents.addChatMessage('✅', 'Proposal accepted! Here\'s what you can do next:');
        UIComponents.addChatMessage('📋', 'Copy the text above and paste it where you need it.');
      }
    }
  }

  private async showInlineReplyEditor(content: string, originalMessage: string): Promise<void> {
    // Show an inline editor for the reply content
    UIComponents.showInlineReplyEditor(content, async (editedContent: string) => {
      // User finished editing - show the updated reply and approval buttons again
      UIComponents.addChatMessage('🤖', editedContent);
      const response = await UIComponents.showReplyApproval(editedContent);
      await this.handleReplyApprovalResponse(response, editedContent, originalMessage);
    }, () => {
      // User cancelled editing
      UIComponents.addChatMessage('❌', 'Edit cancelled.');
    });
  }

  private async handleRevisionRequest(originalMessage: string, feedback: string): Promise<void> {
    // Add user feedback to chat
    UIComponents.addUserMessage(`Please revise: ${feedback}`);
    
    // Show typing indicator and re-send request with revision instructions
    UIComponents.showTypingIndicator();
    
    const revisedMessage = `${originalMessage}\n\nUser feedback for revision: ${feedback}`;
    await this.handleChatConversation(revisedMessage);
  }

  private async handleApprovalResponse(response: any, originalData: any): Promise<void> {
    if (!this.currentThreadId) {
      console.error('No thread ID available for approval response');
      return;
    }

    try {
      if (response.type === 'open_in_outlook' && originalData.args?.body) {
        // Open in Outlook and auto-accept
        await this.handleEmailReplyResponse(originalData.args.body, 'email proposal');
        await apiClient.resumeInterrupt(this.currentThreadId, { type: 'accept' });
      } else {
        // Standard flow
        await apiClient.resumeInterrupt(this.currentThreadId, response);
      }
    } catch (error) {
      console.error('Error handling approval response:', error);
      UIComponents.addChatMessage('❌', 'Sorry, there was an error processing your response.');
    }
  }

  private generateContextForMessage(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Detect if this is a request for email composition/reply
    if (lowerMessage.includes('write') && (lowerMessage.includes('reply') || lowerMessage.includes('response'))) {
      return `User requested: "${message}". 

IMPORTANT: This is a request to compose/write an email reply. Please provide a COMPLETE, PROFESSIONAL EMAIL that includes:
- Proper greeting (based on the original email's formality)
- Clear and appropriate response to the original email's content
- Professional closing
- Proper email structure and formatting
- Use the same language as the original email
- Make it ready to send (complete email draft, not just conversational text)

The response should be a properly formatted email that can be directly copied into an email client.`;
    }
    
    // Detect if this is asking for email composition 
    if (lowerMessage.includes('compose') || lowerMessage.includes('draft') || (lowerMessage.includes('write') && lowerMessage.includes('email'))) {
      return `User requested: "${message}". 

IMPORTANT: This is a request to compose/draft an email. Please provide a COMPLETE, PROFESSIONAL EMAIL with proper structure, greeting, content, and closing. Make it ready to send.`;
    }
    
    // Default context for other requests
    return `User asked: "${message}". This is a conversational request about the email. Please provide a helpful response based on the email content.`;
  }

  private async sendChatMessage(): Promise<void> {
    console.log('[DEBUG] sendChatMessage called');
    const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
    const chatSendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;

    if (!chatInput || !chatSendBtn) return;

    const message = chatInput.value.trim();
    if (!message) return;

    // Disable input while processing
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    try {
      // Add user message to chat
      UIComponents.addUserMessage(message);
      
      // Clear input
      chatInput.value = '';
      chatInput.style.height = 'auto';

      // Show typing indicator
      UIComponents.showTypingIndicator();

      // Send message directly to chat system - agent service will handle intent detection
      await this.handleChatConversation(message);

    } catch (error) {
      console.error('Error sending chat message:', error);
      UIComponents.hideTypingIndicator();
      UIComponents.addChatMessage('❌', 'Sorry, I encountered an error. Please try again.');
    } finally {
      // Re-enable input
      chatInput.disabled = false;
      chatSendBtn.disabled = false;
      chatInput.focus();
    }
  }



  private async handleChatConversation(message: string): Promise<void> {
    console.log(`[DEBUG] [${this.instanceId}] handleChatConversation called with: "${message}"`);
    
    // Create a chat request using the new CHAT action from agent service
    const request: ProcessEmailRequest = {
      email_context: this.currentEmailContext!,
      action: AgentAction.CHAT, // Use the new chat action that agent service now supports
      thread_id: this.currentThreadId || undefined,
      additional_context: this.generateContextForMessage(message)
    };

    try {
      const response = await this.sendChatRequestToAgent(request, message);
    } catch (error) {
      console.error('Error in chat conversation:', error);
      UIComponents.hideTypingIndicator();
      UIComponents.addChatMessage('❌', 'Sorry, I encountered an error. Please try again.');
    }
  }



  private async sendChatRequestToAgent(request: ProcessEmailRequest, originalMessage: string): Promise<void> {
    try {
      console.log('Sending chat request to agent:', request);
      const response = await apiClient.processEmail(request);
      
      this.currentThreadId = response.thread_id;

      if (response.requires_human_input) {
        // Connect to WebSocket for streaming response
        await this.connectWebSocketForChat(response.thread_id);
      } else {
        // Direct response
        UIComponents.hideTypingIndicator();
        
        // Convert response.result to proper string
        let resultText: string;
        console.log('Processing response.result:', response.result);
        
        if (typeof response.result === 'string') {
          resultText = response.result;
        } else if (typeof response.result === 'object' && response.result !== null) {
          // Handle the new chat response format (agent service returns text, content, message)
          if (response.result.text) {
            resultText = response.result.text;
          } else if (response.result.content) {
            resultText = response.result.content;
          } else if (response.result.message) {
            resultText = response.result.message;
          } else {
            console.warn('Unexpected response.result format:', response.result);
            resultText = JSON.stringify(response.result, null, 2);
          }
        } else {
          resultText = response.result ? String(response.result) : 'Here\'s what I found!';
        }
        
        console.log('Final resultText:', resultText);
        
        // Check if this should trigger approval workflow
        if (this.shouldShowApprovalButtons(originalMessage, resultText)) {
          await this.handleProposalApprovalFlow(resultText, originalMessage);
        } else {
          // Regular chat response
          UIComponents.addChatMessage('🤖', resultText);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  private async connectWebSocketForChat(threadId: string): Promise<void> {
    try {
      await wsClient.connect(threadId);
      
      // Set up handlers for chat streaming
      wsClient.onStatus((status) => {
        console.log('Chat WebSocket status update:', status);
      });

      wsClient.onStream((data) => {
        console.log('Chat WebSocket stream data:', data);
        this.handleChatStreamData(data);
      });

    } catch (error) {
      console.error('WebSocket connection error for chat:', error);
      UIComponents.hideTypingIndicator();
      UIComponents.addChatMessage('❌', 'Connection error. Please try again.');
    }
  }

  private handleChatStreamData(data: any): void {
    UIComponents.hideTypingIndicator();

    if (data.type === 'stream' && data.content) {
      // Stream the response content
      this.streamChatResponse(data.content);
    } else if (data.type === 'interrupt') {
      // Handle human-in-the-loop for chat
      this.handleChatInterrupt(data);
    } else if (data.type === 'final') {
      // Chat completed
      console.log('Chat response completed');
    }
  }

  private streamChatResponse(content: string): void {
    // For now, add complete message - later we can implement true word-by-word streaming
    UIComponents.addChatMessage('🤖', content);
  }

  private async handleChatInterrupt(data: any): Promise<void> {
    // Handle interrupts in chat context with enhanced workflow
    console.log('Handling chat interrupt:', data);
    
    // Add the AI's proposal to chat
    const proposalText = this.formatProposalForChat(data);
    UIComponents.addChatMessage('🤖', proposalText);
    
    // For email replies, show preview in chat and offer to open in Outlook
    if (data.args && this.isEmailContent(data.args)) {
      await this.handleEmailProposalWorkflow(data);
    } else {
      // Standard approval workflow
      await this.handleStandardProposalWorkflow(data);
    }
  }

  private addEventListenerSafe(elementId: string, event: string, handler: () => void): void {
    const element = document.getElementById(elementId);
    if (element) {
      // Remove any existing listeners before adding new one
      const existingProperty = `_${elementId}_${event}_attached`;
      if ((element as any)[existingProperty]) {
        console.log(`Event listener already exists for ${elementId}, skipping...`);
        return;
      }
      
      element.addEventListener(event, handler);
      (element as any)[existingProperty] = true;
      console.log(`Event listener added for ${elementId}`);
    } else {
      console.warn(`Element with id '${elementId}' not found`);
    }
  }



  private async connectWebSocket(threadId: string): Promise<void> {
    try {
      await wsClient.connect(threadId);
      console.log('WebSocket connected for thread:', threadId);
      
      wsClient.onStatus((status) => {
        console.log('=== WEBSOCKET STATUS UPDATE ===');
        console.log('Status details:', {
          status: status.status,
          hasData: !!status.data,
          timestamp: new Date().toISOString()
        });
        console.log('WebSocket status update:', status);
        UIComponents.showStatus(status);
        
        if (status.status === 'waiting_for_human' && status.data && this.currentThreadId && status.thread_id === this.currentThreadId) {
          console.log('WebSocket triggering human-in-the-loop for current thread');
          this.handleHumanInTheLoop(status.data);
        } else if (status.status === 'completed' && status.data && this.currentThreadId && status.thread_id === this.currentThreadId) {
          console.log('WebSocket handling completion for current thread');
          // For chat system, just add result to chat
          let resultText: string;
          if (typeof status.data === 'string') {
            resultText = status.data;
          } else if (typeof status.data === 'object' && status.data !== null) {
            if (status.data.text) {
              resultText = status.data.text;
            } else if (status.data.content) {
              resultText = status.data.content;
            } else if (status.data.message) {
              resultText = status.data.message;
            } else {
              resultText = JSON.stringify(status.data, null, 2);
            }
          } else {
            resultText = 'Task completed successfully!';
          }
          UIComponents.addChatMessage('🤖', resultText);
        } else if (status.status === 'error') {
          UIComponents.addStatusItem('❌', status.message || 'Processing error', false, true);
          UIComponents.addChatMessage('❌', `Error: ${status.message || 'An error occurred during processing'}`);
          UIComponents.showError(status.message || 'An error occurred during processing');
        }
      });

      wsClient.onStream((data) => {
        console.log('WebSocket stream data:', data);
        // Show streaming content if available
        if (data.content) {
          UIComponents.showStreamingContent(data.content);
        }
      });

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      UIComponents.showError('Failed to establish real-time connection');
    }
  }

  private async handleHumanInTheLoop(interruptData: any): Promise<void> {
    try {
      // Defensive check for null interruptData
      if (!interruptData) {
        console.error('handleHumanInTheLoop called with null interruptData');
        UIComponents.showError('Invalid approval request. Please try the action again.');
        return;
      }

      UIComponents.showStatus({ 
        status: 'waiting_for_human', 
        message: 'Review and approve the proposed action' 
      });

      console.log('Handling human-in-the-loop:', interruptData);

      // Show interrupt dialog
      const userResponse = await UIComponents.showInterruptDialog(interruptData);
      
      console.log('User response:', userResponse);

      // Handle user response
      if (userResponse.type === 'reject') {
        // User rejected the action - don't process further
        console.log('User rejected the action');
        UIComponents.showStatus({ status: 'cancelled', message: 'Action cancelled by user' });
        UIComponents.addChatMessage('❌', 'Action cancelled by user');
        
        // Disconnect WebSocket and clean up
        wsClient.disconnect();
        
        // Reset thread state for next action
        this.currentThreadId = null;
        
        console.log('State reset after rejection - ready for next action');
        return;
      } else if (userResponse.type === 'accept') {
        // Store the approved draft for successful execution
        this.lastApprovedDraft = interruptData.args;
        console.log('Stored approved draft:', this.lastApprovedDraft);
      }

      // Send response back to agent
      if (this.currentThreadId) {
        UIComponents.showLoading(true, 'Processing your response...');
        
        console.log('=== SENDING USER RESPONSE TO AGENT ===');
        console.log('User response type:', userResponse.type);
        console.log('User response details:', userResponse);
        console.log('Thread ID:', this.currentThreadId);
        
        const response = await apiClient.resumeInterrupt(this.currentThreadId, userResponse);
        
        console.log('=== AGENT RESPONSE TO USER EDIT ===');
        console.log('Response details:', {
          requiresHumanInput: response.requires_human_input,
          hasResult: !!response.result,
          hasInterruptData: !!response.interrupt_data
        });
        console.log('Full response:', response);
        
        if (response.requires_human_input) {
          // Another round of human input needed
          UIComponents.showLoading(false); // Hide loading for next human input
          if (response.interrupt_data) {
            await this.handleHumanInTheLoop(response.interrupt_data);
          } else {
            console.error('Resume response has requires_human_input=true but null interrupt_data');
            UIComponents.showError('Invalid approval request from server. Please try again.');
          }
        } else {
          // Task completed - add result to chat
          let resultText: string;
          if (typeof response.result === 'string') {
            resultText = response.result;
          } else if (typeof response.result === 'object' && response.result !== null) {
            if (response.result.text) {
              resultText = response.result.text;
            } else if (response.result.content) {
              resultText = response.result.content;
            } else if (response.result.message) {
              resultText = response.result.message;
            } else {
              resultText = JSON.stringify(response.result, null, 2);
            }
          } else {
            resultText = 'Task completed successfully!';
          }
          UIComponents.addChatMessage('🤖', resultText);
        }
      }

    } catch (error) {
      console.error('Error handling human-in-the-loop:', error);
      UIComponents.showError('Failed to process your response');
    } finally {
      UIComponents.showLoading(false);
      console.log(`[${this.instanceId}] Human-in-the-loop handling completed`);
    }
  }





  private async handleSuccessfulDraftExecution(): Promise<void> {
    console.log('=== HANDLING SUCCESSFUL DRAFT EXECUTION ===');
    if (this.lastApprovedDraft && this.lastApprovedDraft.body) {
      console.log('Using last approved draft content:', this.lastApprovedDraft.body);
      await this.processMessageContent(this.lastApprovedDraft.body);
    } else {
      console.log('No approved draft content available');
      UIComponents.showError('Email was executed successfully but content is not available. Please check your Outlook.');
    }
  }

  private async applyResult(result: any): Promise<void> {
    if (!result) {
      console.log('No result to apply');
      return;
    }

    try {
      console.log('=== APPLYING RESULT ===');
      console.log('Result type:', typeof result);
      console.log('Result structure:', result);
      
      // Handle different result types
      if (result.messages && Array.isArray(result.messages)) {
        console.log('Processing messages array, length:', result.messages.length);
        console.log('All messages:', result.messages);
        
        // Find all assistant/AI messages with content
        const assistantMessages = result.messages.filter((msg: any) => 
          msg && msg.content && (
            msg.role === 'assistant' || 
            msg.type === 'ai' || 
            !msg.role ||  // Messages without role are likely assistant responses
            (typeof msg.content === 'string' && msg.content.trim().length > 0)
          )
        );
        
        console.log('Found assistant messages:', assistantMessages.length);
        
        if (assistantMessages.length > 0) {
          // Combine all assistant message content
          const combinedContent = assistantMessages
            .map((msg: any) => msg.content)
            .filter((content: any) => content && content.trim().length > 0)
            .join('\n\n');
          
          console.log('Combined assistant content:', combinedContent);
          
          if (combinedContent.trim().length > 0) {
            await this.processMessageContent(combinedContent);
          } else {
            console.log('No meaningful content found in assistant messages');
          }
        } else {
          console.log('No assistant messages found, falling back to last message');
          const lastMessage = result.messages[result.messages.length - 1];
          if (lastMessage && lastMessage.content) {
            console.log('Processing last message content:', lastMessage.content);
            await this.processMessageContent(lastMessage.content);
          }
        }
      } else if (typeof result === 'string') {
        console.log('Processing string result:', result);
        await this.processMessageContent(result);
      } else if (result.message && result.message.includes('Successfully executed draft_email')) {
        console.log('Agent completed draft_email successfully - need to get email content from approved draft');
        // For successful draft_email execution, we need to use the last approved draft content
        // This happens when user clicks Accept - the agent executes the draft but doesn't return content
        await this.handleSuccessfulDraftExecution();
      } else {
        console.log('Unknown result format, cannot auto-apply');
      }
    } catch (error) {
      console.error('Error applying result:', error);
      UIComponents.showError('Result generated but could not be applied automatically. Please copy from the result area.');
    }
  }

  private async processMessageContent(content: string): Promise<void> {
    try {
      console.log('=== PROCESSING MESSAGE CONTENT ===');
      console.log('Content:', content);
      console.log('Is compose mode:', this.currentEmailContext?.isCompose);
      
      // Try to parse as JSON for structured content
      if (content.includes('"type":')) {
        console.log('Attempting to parse as JSON...');
        const parsed = JSON.parse(content);
        console.log('Parsed JSON:', parsed);
        
        if (parsed.type === 'email_draft') {
          console.log('Handling email draft');
          await this.handleEmailDraft(parsed as EmailDraft);
        } else if (parsed.type === 'meeting_request') {
          console.log('Handling meeting request');
          await this.handleMeetingRequest(parsed as MeetingRequest);
        } else {
          console.log('Generic structured content, inserting as JSON');
          await insertIntoEmail(JSON.stringify(parsed, null, 2));
        }
      } else {
        console.log('Plain text content');
        // Plain text content
        if (this.currentEmailContext?.isCompose) {
          console.log('Inserting into compose email');
          await insertIntoEmail(content);
        } else {
          console.log('Creating reply with content');
          await createReply(content);
        }
      }
    } catch (parseError) {
      console.log('JSON parse failed, treating as plain text:', parseError);
      // If not JSON, treat as plain text
      if (this.currentEmailContext?.isCompose) {
        console.log('Inserting plain text into compose email');
        await insertIntoEmail(content);
      } else {
        console.log('Creating reply with plain text');
        await createReply(content);
      }
    }
  }

  private async handleEmailDraft(draft: EmailDraft): Promise<void> {
    console.log('Handling email draft:', draft);
    
    if (this.currentEmailContext?.isCompose) {
      // Insert into current compose window
      await insertIntoEmail(draft.body);
    } else {
      // Create new reply with the draft
      await createReply(draft.body);
    }
  }

  private async handleMeetingRequest(meeting: MeetingRequest): Promise<void> {
    console.log('Handling meeting request:', meeting);
    
    // For now, insert meeting details as text
    // In a full implementation, this would integrate with Calendar API
    const meetingText = `
Meeting Request:
Title: ${meeting.title}
Attendees: ${meeting.attendees.join(', ')}
Start Time: ${meeting.start_time}
Duration: ${meeting.duration_minutes} minutes
Description: ${meeting.description}
    `.trim();
    
    if (this.currentEmailContext?.isCompose) {
      await insertIntoEmail(meetingText);
    } else {
      await createReply(meetingText);
    }
  }
}

// Global singleton instance
let globalAssistant: EmailAssistant | null = null;

// Initialize when Office is ready
Office.onReady((info) => {
  console.log('Office is ready. Host:', info.host);
  
  // Prevent multiple initializations
  if (globalAssistant) {
    console.log('Email Assistant already exists, skipping initialization');
    return;
  }
  
  if (info.host === Office.HostType.Outlook) {
    globalAssistant = new EmailAssistant();
    globalAssistant.initialize().catch(error => {
      console.error('Failed to initialize Email Assistant:', error);
      globalAssistant = null; // Reset on error to allow retry
    });
  } else {
    console.error('This add-in only works in Outlook');
  }
});

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  UIComponents.showError('An unexpected error occurred. Please refresh the page.');
});

// Export for testing
(window as any).EmailAssistant = EmailAssistant;