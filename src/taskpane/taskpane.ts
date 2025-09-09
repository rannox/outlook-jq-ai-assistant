/* global Office */

import { apiClient, ChatRequest, SystemStatus, EmailClassificationRequest } from './api-client';
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

// Removed WorkflowStateManager - no more caching, always fetch fresh data

class EmailAssistant {
  private currentEmailContext: EmailContext | null = null;
  private currentThreadId: string | null = null;
  private instanceId: string;
  private lastApprovedDraft: any = null; // Store the last approved draft for successful execution
  private chatInitialized: boolean = false; // Prevent multiple chat interface initializations
  // Removed workflowManager - no more caching
  private lastClassificationData: any = null;

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
        throw new Error('Agent service health check failed');
      }
      
      // Try to get system status for additional info, but don't fail if it doesn't exist
      try {
        const systemStatus = await apiClient.getSystemStatus();
        if (systemStatus) {
          UIComponents.showSystemStatus(systemStatus);
        }
      } catch (statusError) {
        console.log('System status endpoint not available:', statusError);
        // Don't fail the connection test for this
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
    // Chat interface (primary interface)
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

    // Check if this is a classify email request
    if (message === 'classify-email') {
      // Handle classify email as a special action, not a chat message
      await this.handleClassifyEmailFromChat();
      return;
    }

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

  private async handleClassifyEmailFromChat(): Promise<void> {
    try {
      // Clear input
      const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
      if (chatInput) {
        chatInput.value = '';
        chatInput.style.height = 'auto';
      }

      // Add user action to chat
      UIComponents.addChatMessage('👤', '🤖 Classify Email');
      
      // Show typing indicator
      UIComponents.showTypingIndicator();

      // Call the existing classify email functionality
      await this.classifyCurrentEmail();

    } catch (error) {
      console.error('Error in handleClassifyEmailFromChat:', error);
      UIComponents.hideTypingIndicator();
      UIComponents.addChatMessage('❌', 'Sorry, I encountered an error while classifying the email. Please try again.');
    }
  }

  private async handleChatConversation(message: string): Promise<void> {
    console.log(`[DEBUG] [${this.instanceId}] handleChatConversation called with: "${message}"`);
    
    if (!this.currentEmailContext) {
      UIComponents.hideTypingIndicator();
      UIComponents.addChatMessage('❌', 'No email context available. Please select an email first.');
      return;
    }

    // Create a chat request using the new simplified API
    const chatRequest: ChatRequest = {
      subject: this.currentEmailContext.subject || 'No Subject',
      sender: this.currentEmailContext.sender || 'Unknown Sender',
      body: this.currentEmailContext.body || 'No Content',
      message: message
    };

    try {
      console.log('Sending chat request:', chatRequest);
      const response = await apiClient.chatAboutEmail(chatRequest);
      
      console.log('Chat response received:', response);
      UIComponents.hideTypingIndicator();
      
      if (response.success) {
        // Handle different types of responses
        if (this.isEmailReplyRequest(message)) {
          // For email reply requests, show approval workflow
          await this.handleProposalApprovalFlow(response.response, message);
        } else {
          // Regular chat response
          UIComponents.addChatMessage('🤖', response.response);
        }
      } else {
        console.error('Chat response error:', response.error);
        UIComponents.addChatMessage('❌', `Error: ${response.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('Error in chat conversation:', error);
      UIComponents.hideTypingIndicator();
      UIComponents.addChatMessage('❌', `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Email Classification functionality
  private async classifyCurrentEmail(): Promise<void> {
    if (!this.currentEmailContext) {
      UIComponents.showError('No email context available. Please select an email first.');
      return;
    }

    try {
      // Show loading state
      UIComponents.showClassificationLoading();

      // Always process emails fresh - no caching
      console.log('🔄 Processing email with fresh classification request');

      // Create classification request
      const request: EmailClassificationRequest = {
        subject: this.currentEmailContext.subject || 'No Subject',
        sender: this.currentEmailContext.sender || 'Unknown Sender',
        body: this.currentEmailContext.body || 'No Content',
        to: this.currentEmailContext.to,
        message_id: this.currentEmailContext.internetMessageId // Include Outlook message ID for fast lookups
      };

      console.log('Classifying NEW email:', request);

      // Get classification from API
      const classification = await apiClient.classifyEmail(request);
      
      console.log('Classification result:', classification);

      // Hide typing indicator if it's showing
      UIComponents.hideTypingIndicator();

      // Check if the backend sent interrupt data (based on your logs)
      if (classification.interrupted && classification.interrupt_data && classification.thread_id) {
        console.log('🛑 Human approval required - showing decision interface');
        this.displayHumanDecisionInterface(classification);
      } else {
        // Display normal classification results in chat
        this.displayClassificationInChat(classification);

        // For information-needed emails, get specific guidance and show it in chat
        if (classification.classification === 'information-needed') {
          await this.displayGuidanceInChat();
        }
      }

    } catch (error) {
      console.error('Error classifying email:', error);
      UIComponents.hideTypingIndicator();
      UIComponents.showError('Failed to classify email. Please check the agent service connection.');
    }
  }

  private displayHumanDecisionInterface(classification: any): void {
    // Store the thread ID and classification data for later use
    this.currentThreadId = classification.thread_id;
    this.lastClassificationData = classification;
    
    // Extract data from interrupt_data (based on your backend logs)
    const interruptData = classification.interrupt_data || {};
    const options = interruptData.options || [];
    
    console.log('📋 Interrupt data:', interruptData);
    console.log('🎯 Available options:', options);
    console.log('🔍 Classification data:', classification);
    
    // Get the best available data sources
    const finalClassification = interruptData.classification || classification.classification || 'UNKNOWN';
    const finalConfidence = interruptData.confidence || classification.confidence || 0;
    const finalReasoning = interruptData.reasoning || classification.reasoning || 'No reasoning provided';
    const proposedResponse = interruptData.proposed_auto_reply || interruptData.auto_response || classification.auto_response || null;
    const clarifyingQuestions = interruptData.clarifying_questions || null;
    const threadId = classification.thread_id || this.currentThreadId;
    
    // Don't show the card if no options are available
    if (!options || options.length === 0) {
      console.log('⚠️ No decision options available - skipping display');
      UIComponents.addChatMessage('ℹ️', 'No human decisions required at this time.');
      return;
    }
    
    // Create a simple human decision card based on your backend data
    const decisionCard = `
      <div style="
        background: linear-gradient(135deg, rgba(255,193,7,0.1) 0%, rgba(255,193,7,0.05) 100%);
        border: 1px solid rgba(255,193,7,0.3);
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
      ">
        <div style="
          color: #ffc107;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 16px;
        ">
          🛑 Human Approval Required
        </div>
        
        <div style="
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          border-left: 3px solid #ffc107;
        ">
          <div style="margin-bottom: 8px;">
            <strong>AI Recommendation:</strong> ${finalClassification.toUpperCase()}
            <span style="color: #adb5bd; margin-left: 8px;">(${Math.round(finalConfidence * 100)}% confidence)</span>
          </div>
          
          <div style="color: #e9ecef; font-style: italic;">
            "${finalReasoning}"
          </div>
        </div>
        
        ${proposedResponse ? `
          <div style="
            background: rgba(40, 167, 69, 0.1);
            border: 1px solid rgba(40, 167, 69, 0.3);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            border-left: 3px solid #28a745;
          ">
            <div style="margin-bottom: 8px;">
              <strong style="color: #28a745;">Proposed Response:</strong>
            </div>
            
            <div style="
              color: #e9ecef; 
              line-height: 1.6; 
              white-space: pre-line;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: rgba(0, 0, 0, 0.2);
              padding: 12px;
              border-radius: 6px;
              border: 1px solid rgba(255, 255, 255, 0.1);
            " data-proposed-response="true">${this.escapeHtml(proposedResponse)}</div>
          </div>
        ` : ''}
        
        ${clarifyingQuestions && clarifyingQuestions.length > 0 ? `
          <div style="
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            border-left: 3px solid #ffc107;
          ">
            <div style="margin-bottom: 8px;">
              <strong style="color: #ffc107;">🤔 Clarifying Questions:</strong>
            </div>
            
            <div style="color: #e9ecef; line-height: 1.5;">
              ${clarifyingQuestions.map((question: string, index: number) => 
                `<div style="margin-bottom: 8px;"><strong>${index + 1}.</strong> ${this.escapeHtml(question)}</div>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        
        <div style="color: #e9ecef; font-size: 13px; margin-bottom: 12px;">
          Choose your action:
        </div>
        
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${options.map((option: string) => {
            const buttonConfig = this.getHumanDecisionButtonConfig(option);
            return `
              <button 
                data-thread-id="${threadId}"
                onclick="emailAssistant.makeHumanDecision('${threadId}', '${option}')" 
                style="
                  background: ${buttonConfig.background};
                  color: ${buttonConfig.color};
                  border: ${buttonConfig.border};
                  padding: 8px 16px;
                  border-radius: 20px;
                  font-size: 12px;
                  font-weight: 600;
                  cursor: pointer;
                  margin-bottom: 4px;
                  transition: all 0.3s ease;
                "
              >${buttonConfig.label}</button>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    UIComponents.addChatMessage('', decisionCard);
  }

  private getHumanDecisionButtonConfig(option: string) {
    const configs: { [key: string]: any } = {
      // IGNORE classification decisions
      'approve_ignore': { label: '✅ Approve Ignore', background: '#28a745', color: 'white', border: 'none' },
      'process_instead': { label: '🔄 Process Instead', background: 'transparent', color: '#17a2b8', border: '1px solid #17a2b8' },
      
      // AUTO-REPLY classification decisions (including after provide_answers routing)
      'approve_send': { label: '✅ Approve & Send', background: '#28a745', color: 'white', border: 'none' },
      'edit_and_send': { label: '✏️ Edit & Save', background: 'transparent', color: '#ffc107', border: '1px solid #ffc107' },
      'approve_auto_reply': { label: '✅ Approve Auto-Reply', background: '#28a745', color: 'white', border: 'none' },
      
      // INFORMATION-NEEDED classification decisions (with clarifying questions)
      'provide_answers': { label: '💬 Provide Answers', background: '#28a745', color: 'white', border: 'none' },
      'convert_to_auto_reply': { label: '🤖 Convert to Auto-Reply', background: 'transparent', color: '#17a2b8', border: '1px solid #17a2b8' },
      'convert_to_ignore': { label: '🗑️ Convert to Ignore', background: 'transparent', color: '#6c757d', border: '1px solid #6c757d' }
    };
    
    return configs[option] || { 
      label: option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      background: 'transparent', 
      color: '#ffffff', 
      border: '1px solid #ffffff' 
    };
  }

  public async makeHumanDecision(threadId: string, decision: string): Promise<void> {
    try {
      // Handle decisions that require custom input
      let finalDecision = decision;
      
      if (decision === 'edit_and_send') {
        // Show inline editor to modify the auto-response
        await this.showEditAutoResponseInterface(threadId);
        return;
      } else if (decision === 'provide_answers') {
        // Show interface to answer clarifying questions
        await this.showAnswerQuestionsInterface(threadId);
        return;
      } else if (decision === 'custom_reply') {
        const customText = prompt('Enter your custom reply text:');
        if (customText) {
          finalDecision = `custom_reply:${customText}`;
        } else {
          // User cancelled, don't proceed
          return;
        }
      }
      
      // Handle special case for approve_send - open Outlook compose window
      if (decision === 'approve_send') {
        await this.openOutlookComposeWindow(threadId);
      }
      
      // Disable all decision buttons immediately
      this.disableDecisionButtons(threadId);
      
      UIComponents.showTypingIndicator();
      
      console.log('Making human decision:', finalDecision, 'for thread:', threadId);
      
      // Call the resume endpoint
      const result = await apiClient.resumeWorkflow(threadId, finalDecision);
      
      UIComponents.hideTypingIndicator();
      
      // Show success message
      UIComponents.addChatMessage('✅', `**Decision processed:** ${finalDecision.split(':')[0].replace(/_/g, ' ')}`);
      
    // Check final workflow status instead of re-calling process-email
    await this.checkWorkflowStatus(threadId);
      
    } catch (error) {
      console.error('Error making human decision:', error);
      UIComponents.hideTypingIndicator();
      UIComponents.addChatMessage('❌', 'Sorry, there was an error processing your decision. Please try again.');
      
      // Re-enable buttons on error
      this.enableDecisionButtons(threadId);
    }
  }

  private async openOutlookComposeWindow(threadId: string): Promise<void> {
    try {
      // Get the auto-reply text from the current decision interface
      const autoReplyText = this.extractAutoReplyFromCurrentView();
      
      console.log('🔍 Extracted auto-reply text:', autoReplyText);
      
      if (!this.currentEmailContext) {
        console.warn('❌ No current email context available for compose window');
        UIComponents.addChatMessage('❌', 'No email context available. Please select an email first.');
        return;
      }
      
      if (!this.currentEmailContext.sender) {
        console.warn('❌ No sender information in current email context');
        UIComponents.addChatMessage('❌', 'No sender information available for compose window.');
        return;
      }
      
      // Create a new compose window with pre-filled content
      // Note: Office.js displayNewMessageForm expects specific format
      let senderEmail = this.currentEmailContext.sender || '';
      
      // Try to get sender from Office.js directly as fallback
      if (!senderEmail) {
        try {
          const item = Office.context.mailbox.item;
          if (item && 'from' in item && item.from) {
            senderEmail = item.from.emailAddress || '';
            console.log('🔄 Got sender from Office.js directly:', senderEmail);
          }
        } catch (error) {
          console.error('Error getting sender from Office.js:', error);
        }
      }
      
      if (!senderEmail) {
        console.error('❌ Still no sender email available');
        UIComponents.addChatMessage('❌', 'Could not determine sender email address.');
        return;
      }
      
      const composeOptions = {
        toRecipients: [senderEmail],
        subject: `Re: ${this.currentEmailContext.subject || ''}`,
        htmlBody: `<p>${autoReplyText.replace(/\n/g, '</p><p>')}</p>`
      };
      
      // Also try alternative formats if the first doesn't work
      const alternativeOptions = {
        to: [senderEmail],
        subject: `Re: ${this.currentEmailContext.subject || ''}`,
        body: autoReplyText
      };
      
      console.log('📧 Opening Outlook compose window with options:', composeOptions);
      console.log('📧 Alternative options:', alternativeOptions);
      console.log('📧 Current email context:', this.currentEmailContext);
      console.log('📧 Sender email:', senderEmail);
      
      try {
        // Try the primary format first
        Office.context.mailbox.displayNewMessageForm(composeOptions);
      } catch (primaryError) {
        console.warn('Primary format failed, trying alternative:', primaryError);
        try {
          // Try alternative format
          Office.context.mailbox.displayNewMessageForm(alternativeOptions);
        } catch (alternativeError) {
          console.error('Both formats failed:', alternativeError);
          // Try minimal format
          Office.context.mailbox.displayNewMessageForm({
            toRecipients: [senderEmail]
          });
        }
      }
      
      // Show confirmation message with the text that was extracted
      UIComponents.addChatMessage('📧', `**Outlook compose window opened** with auto-reply text for: ${this.currentEmailContext.sender}`);
      UIComponents.addChatMessage('📝', `**Text copied:** "${autoReplyText}"`);
      
    } catch (error) {
      console.error('Error opening Outlook compose window:', error);
      UIComponents.addChatMessage('❌', 'Could not open Outlook compose window. You can copy the text manually.');
    }
  }

  private extractAutoReplyFromCurrentView(): string {
    console.log('🔍 Extracting auto-reply text from current view...');
    
    // Method 1: Look for elements with the proposed-response data attribute (most reliable)
    const proposedResponseElement = document.querySelector('[data-proposed-response="true"]');
    if (proposedResponseElement) {
      const text = proposedResponseElement.textContent || '';
      if (text.trim()) {
        console.log('✅ Extracted from data attribute:', text);
        return text.trim();
      }
    }
    
    // Method 2: Use stored data - access the interrupt data directly (most reliable fallback)
    if (this.lastClassificationData && this.lastClassificationData.interrupt_data) {
      const proposedResponse = this.lastClassificationData.interrupt_data.proposed_auto_reply || 
                              this.lastClassificationData.interrupt_data.auto_response ||
                              this.lastClassificationData.auto_response;
      if (proposedResponse) {
        console.log('✅ Extracted from stored data:', proposedResponse);
        return proposedResponse;
      }
    }
    
    console.log('⚠️ Using fallback text');
    // Fallback: provide a helpful placeholder
    return 'Thank you for your email. I will review this and get back to you soon.';
  }

  private async showEditAutoResponseInterface(threadId: string): Promise<void> {
    // Get the current auto-reply text
    const currentAutoReply = this.extractAutoReplyFromCurrentView();
    
    // Create inline editor for the auto-response
    const editorCard = `
      <div style="
        background: linear-gradient(135deg, rgba(100, 150, 200, 0.15) 0%, rgba(100, 150, 200, 0.08) 100%);
        border: 1px solid rgba(100, 150, 200, 0.3);
        border-radius: 8px;
        padding: 20px;
        margin: 8px 0;
      ">
        <div style="color: #6db4d4; font-weight: 600; margin-bottom: 16px; font-size: 16px;">
          ✏️ Edit Auto-Response
        </div>
        <div style="margin-bottom: 8px;">
          <strong style="color: #ffffff; font-size: 14px;">Subject:</strong> 
          <span style="color: #adb5bd; font-size: 14px;">Re: ${this.currentEmailContext?.subject || 'Email'}</span>
        </div>
        <textarea 
          id="edit-auto-response-${threadId}" 
          placeholder="Edit your auto-response text..."
          style="
            width: 100%;
            height: 150px;
            background: #2c3e50;
            border: 1px solid #4a5568;
            border-radius: 6px;
            color: #ffffff;
            padding: 16px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            resize: vertical;
            box-sizing: border-box;
          "
        >${this.escapeHtml(currentAutoReply)}</textarea>
        <div style="display: flex; gap: 12px; margin-top: 16px; justify-content: center;">
          <button 
            onclick="emailAssistant.saveEditedAutoResponse('${threadId}')"
            style="
              background: #17a2b8;
              border: none;
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              min-width: 120px;
            "
          >💾 Save Changes</button>
          <button 
            onclick="emailAssistant.cancelEditAutoResponse('${threadId}')"
            style="
              background: #6c757d;
              border: none;
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              min-width: 120px;
            "
          >❌ Cancel</button>
        </div>
      </div>
    `;
    
    // Add the editor to the chat
    UIComponents.addChatMessage('', editorCard);
    
    // Focus and select the text
    setTimeout(() => {
      const textarea = document.getElementById(`edit-auto-response-${threadId}`) as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }, 100);
  }

  public async saveEditedAutoResponse(threadId: string): Promise<void> {
    const textarea = document.getElementById(`edit-auto-response-${threadId}`) as HTMLTextAreaElement;
    const editedText = textarea?.value?.trim();
    
    if (!editedText) {
      UIComponents.addChatMessage('⚠️', 'Please enter some text before saving.');
      return;
    }
    
    // Remove the editor card
    const editorCard = textarea?.closest('[style*="linear-gradient(135deg, rgba(100, 150, 200"]');
    if (editorCard) {
      editorCard.remove();
    }
    
    // Update the stored auto-response in the classification data
    if (this.lastClassificationData && this.lastClassificationData.interrupt_data) {
      this.lastClassificationData.interrupt_data.proposed_auto_reply = editedText;
      this.lastClassificationData.interrupt_data.auto_response = editedText;
    }
    
    // Show confirmation and update the display
    UIComponents.addChatMessage('✅', `**Auto-response updated:** Changes saved successfully.`);
    UIComponents.addChatMessage('📝', `**New response:** "${editedText}"`);
    
    // Update the displayed decision interface with the new text
    this.updateProposedResponseDisplay(editedText);
    
    // Show a message that they can now use "Approve & Send"
    UIComponents.addChatMessage('💡', 'You can now click **"Approve & Send"** to open Outlook with your edited response.');
  }

  public cancelEditAutoResponse(threadId: string): void {
    // Remove the editor card
    const textarea = document.getElementById(`edit-auto-response-${threadId}`) as HTMLTextAreaElement;
    const editorCard = textarea?.closest('[style*="linear-gradient(135deg, rgba(100, 150, 200"]');
    if (editorCard) {
      editorCard.remove();
    }
    
    UIComponents.addChatMessage('❌', 'Edit cancelled. Auto-response unchanged.');
  }

  private updateProposedResponseDisplay(newText: string): void {
    // Find and update the proposed response using the data attribute
    const proposedResponseElement = document.querySelector('[data-proposed-response="true"]');
    if (proposedResponseElement) {
      proposedResponseElement.textContent = newText;
      console.log('✅ Updated proposed response display with new text');
    } else {
      console.warn('⚠️ Could not find proposed response element to update');
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private async showAnswerQuestionsInterface(threadId: string): Promise<void> {
    // Get the clarifying questions from the current display
    const clarifyingQuestions = this.extractClarifyingQuestionsFromCurrentView();
    
    if (!clarifyingQuestions || clarifyingQuestions.length === 0) {
      UIComponents.addChatMessage('❌', 'No clarifying questions found to answer.');
      return;
    }
    
    // Create interface to answer the questions
    const answerCard = `
      <div style="
        background: linear-gradient(135deg, rgba(100, 150, 200, 0.15) 0%, rgba(100, 150, 200, 0.08) 100%);
        border: 1px solid rgba(100, 150, 200, 0.3);
        border-radius: 8px;
        padding: 20px;
        margin: 8px 0;
      ">
        <div style="color: #6db4d4; font-weight: 600; margin-bottom: 16px; font-size: 16px;">
          💬 Answer Clarifying Questions
        </div>
        
        <div style="margin-bottom: 16px; color: #e9ecef;">
          Please provide answers to help generate a proper response:
        </div>
        
        <div style="margin-bottom: 16px;">
          ${clarifyingQuestions.map((question: string, index: number) => 
            `<div style="margin-bottom: 8px; color: #ffc107; font-weight: 600;">${index + 1}. ${this.escapeHtml(question)}</div>`
          ).join('')}
        </div>
        
        <textarea 
          id="answer-questions-${threadId}" 
          placeholder="Please provide your answers to the questions above..."
          style="
            width: 100%;
            height: 150px;
            background: #2c3e50;
            border: 1px solid #4a5568;
            border-radius: 6px;
            color: #ffffff;
            padding: 16px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            resize: vertical;
            box-sizing: border-box;
          "
        ></textarea>
        
        <div style="display: flex; gap: 12px; margin-top: 16px; justify-content: center;">
          <button 
            onclick="emailAssistant.submitAnswers('${threadId}')"
            style="
              background: #28a745;
              border: none;
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              min-width: 120px;
            "
          >✅ Submit Answers</button>
          <button 
            onclick="emailAssistant.cancelAnswerQuestions('${threadId}')"
            style="
              background: #6c757d;
              border: none;
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              min-width: 120px;
            "
          >❌ Cancel</button>
        </div>
      </div>
    `;
    
    // Add the answer interface to the chat
    UIComponents.addChatMessage('', answerCard);
    
    // Focus the textarea
    setTimeout(() => {
      const textarea = document.getElementById(`answer-questions-${threadId}`) as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  }

  private extractClarifyingQuestionsFromCurrentView(): string[] {
    // Look for the clarifying questions in the current interface
    const questionCards = document.querySelectorAll('[style*="rgba(255, 193, 7, 0.1)"]');
    
    for (let i = 0; i < questionCards.length; i++) {
      const card = questionCards[i];
      const cardText = card.textContent || '';
      
      if (cardText.includes('Clarifying Questions:')) {
        // Extract questions from the stored classification data if available
        if (this.lastClassificationData && this.lastClassificationData.interrupt_data && this.lastClassificationData.interrupt_data.clarifying_questions) {
          return this.lastClassificationData.interrupt_data.clarifying_questions;
        }
      }
    }
    
    return [];
  }

  public async submitAnswers(threadId: string): Promise<void> {
    const textarea = document.getElementById(`answer-questions-${threadId}`) as HTMLTextAreaElement;
    const answers = textarea?.value?.trim();
    
    if (!answers) {
      UIComponents.addChatMessage('⚠️', 'Please provide answers before submitting.');
      return;
    }
    
    // Remove the answer interface
    const answerCard = textarea?.closest('[style*="linear-gradient(135deg, rgba(100, 150, 200"]');
    if (answerCard) {
      answerCard.remove();
    }
    
    // Show what the user provided
    UIComponents.addChatMessage('💬', `**Answers provided:** ${answers}`);
    
    // Create the decision with answers
    const finalDecision = `provide_answers:${answers}`;
    
    // Disable all decision buttons immediately
    this.disableDecisionButtons(threadId);
    
    UIComponents.showTypingIndicator();
    
    console.log('Submitting answers:', finalDecision, 'for thread:', threadId);
    
    try {
      // Call the resume endpoint
      const result = await apiClient.resumeWorkflow(threadId, finalDecision);
      
      UIComponents.hideTypingIndicator();
      
      // Show success message
      UIComponents.addChatMessage('✅', 'Answers submitted successfully! AI is generating response...');
      
      // Check workflow status - expect another interrupt for human approval of generated response
      if (result.interrupted && result.interrupt_data && result.interrupt_data.options) {
        console.log('🛑 Workflow routed to auto-reply for response approval');
        UIComponents.addChatMessage('🤖', '**AI has generated a response based on your answers. Please review and approve:**');
        this.displayHumanDecisionInterface(result);
      } else {
        // Check final workflow status if no immediate interrupt
        await this.checkWorkflowStatus(threadId);
      }
      
    } catch (error) {
      console.error('Error submitting answers:', error);
      UIComponents.hideTypingIndicator();
      UIComponents.addChatMessage('❌', 'Sorry, there was an error submitting your answers. Please try again.');
      
      // Re-enable buttons on error
      this.enableDecisionButtons(threadId);
    }
  }

  public cancelAnswerQuestions(threadId: string): void {
    // Remove the answer interface
    const textarea = document.getElementById(`answer-questions-${threadId}`) as HTMLTextAreaElement;
    const answerCard = textarea?.closest('[style*="linear-gradient(135deg, rgba(100, 150, 200"]');
    if (answerCard) {
      answerCard.remove();
    }
    
    UIComponents.addChatMessage('❌', 'Answer submission cancelled.');
  }

  private async checkWorkflowStatus(threadId: string): Promise<void> {
    try {
      console.log('🔍 Checking workflow status for thread:', threadId);
      
      const status = await apiClient.getWorkflowStatus(threadId);
      console.log('📊 Status response:', status);
      
      if (status.interrupted && status.interrupt_data && status.interrupt_data.options && status.interrupt_data.options.length > 0) {
        console.log('🛑 Workflow still interrupted - showing new decision interface');
        this.displayHumanDecisionInterface(status);
      } else {
        console.log('✅ Workflow completed with final classification:', status.classification);
        
        // Display the final classification result properly
        if (status.classification) {
          this.displayClassificationInChat(status);
          
          // If this was a "process_instead" that became auto-reply, show the auto-response
          if (status.auto_response) {
            UIComponents.addChatMessage('🤖', `**Generated response:** ${status.auto_response}`);
          }
        } else {
          UIComponents.addChatMessage('✅', 'Decision processed successfully!');
        }
      }
      
    } catch (error) {
      console.error('Error checking workflow status:', error);
      UIComponents.addChatMessage('ℹ️', 'Decision processed. Workflow status could not be verified.');
    }
  }

  private disableDecisionButtons(threadId: string): void {
    // Find all buttons for this thread and disable them
    const buttons = document.querySelectorAll(`button[data-thread-id="${threadId}"]`);
    buttons.forEach((button) => {
      const btnElement = button as HTMLButtonElement;
      btnElement.disabled = true;
      btnElement.style.opacity = '0.5';
      btnElement.style.cursor = 'not-allowed';
      btnElement.style.filter = 'grayscale(100%)';
    });
  }

  private enableDecisionButtons(threadId: string): void {
    // Find all buttons for this thread and re-enable them
    const buttons = document.querySelectorAll(`button[data-thread-id="${threadId}"]`);
    buttons.forEach((button) => {
      const btnElement = button as HTMLButtonElement;
      btnElement.disabled = false;
      btnElement.style.opacity = '1';
      btnElement.style.cursor = 'pointer';
      btnElement.style.filter = 'none';
    });
  }

  private displayClassificationInChat(classification: any): void {
    const icon = classification.classification === 'ignore' ? '🗑️' : 
                 classification.classification === 'auto-reply' ? '🤖' : '👤';
    const confidencePercent = Math.round(classification.confidence * 100);
    
    // Create a compact, styled classification display similar to the screenshot
    const classificationCard = this.createClassificationCard(classification, confidencePercent);
    
    UIComponents.addChatMessage(icon, classificationCard);

    // For auto-reply emails, show suggested response in a compact format
    if (classification.classification === 'auto-reply' && classification.auto_response) {
      this.addCompactAutoReplyCard(classification.auto_response);
    }
  }

  private createClassificationCard(classification: any, confidencePercent: number): string {
    const classType = classification.classification.toUpperCase();
    const badgeColor = classification.classification === 'ignore' ? '#6c757d' : 
                      classification.classification === 'auto-reply' ? '#28a745' : '#ffc107';
    
    // Performance indicator
    let performanceIndicator = '';
    if (classification.processing_time_ms !== undefined) {
      const isCache = classification.processing_time_ms < 100;
      performanceIndicator = isCache ? 
        `<span style="color: #28a745; font-size: 12px;">⚡ ${classification.processing_time_ms}ms</span>` :
        `<span style="color: #17a2b8; font-size: 12px;">🔄 ${classification.processing_time_ms}ms</span>`;
    }

    return `
      <div style="
        background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
        backdrop-filter: blur(10px);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="
            background: ${badgeColor};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          ">${classType}</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="color: #adb5bd; font-size: 12px;">${confidencePercent}% confidence</span>
            ${performanceIndicator}
          </div>
        </div>
        ${classification.reasoning ? `
          <div style="
            color: #e9ecef;
            font-size: 14px;
            line-height: 1.4;
            font-style: italic;
          ">"${classification.reasoning}"</div>
        ` : ''}
      </div>
    `;
  }

  private addCompactAutoReplyCard(autoResponse: string): void {
    const autoReplyCard = `
      <div style="
        background: linear-gradient(135deg, rgba(40,167,69,0.1) 0%, rgba(40,167,69,0.05) 100%);
        border: 1px solid rgba(40,167,69,0.3);
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
        position: relative;
      ">
        <div style="
          color: #28a745;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          📧 Suggested Response
        </div>
        <div style="
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          border-left: 3px solid #28a745;
        ">
          <div style="
            color: #ffffff;
            font-size: 14px;
            line-height: 1.5;
          ">${autoResponse}</div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button onclick="emailAssistant.sendAutoReply('${autoResponse.replace(/'/g, "\\'")}')" style="
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          ">✅ Accept</button>
          <button onclick="emailAssistant.editAutoReply('${autoResponse.replace(/'/g, "\\'")}')" style="
            background: transparent;
            color: #ffc107;
            border: 1px solid #ffc107;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          ">✏️ Edit</button>
          <button onclick="emailAssistant.denyAutoReply()" style="
            background: transparent;
            color: #dc3545;
            border: 1px solid #dc3545;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          ">❌ Deny</button>
        </div>
      </div>
    `;
    
    UIComponents.addChatMessage('', autoReplyCard);
  }

  private addAutoReplyActions(autoResponse: string): void {
    const actionButtons = `
      <div class="chat-action-buttons" style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn btn-success btn-small" onclick="emailAssistant.sendAutoReply('${autoResponse.replace(/'/g, "\\'")}')">
          ✅ Send Reply
        </button>
        <button class="btn btn-warning btn-small" onclick="emailAssistant.editAutoReply('${autoResponse.replace(/'/g, "\\'")}')">
          ✏️ Edit Reply
        </button>
      </div>
    `;
    
    UIComponents.addChatMessage('', actionButtons);
  }

  private async displayGuidanceInChat(): Promise<void> {
    try {
      // Show typing indicator for guidance
      UIComponents.showTypingIndicator();
      
      // Get guidance from the backend
      const guidance = await this.getEmailGuidanceText();
      
      UIComponents.hideTypingIndicator();
      
      if (guidance) {
        // Display guidance as a compact card with inline notes area
        this.addGuidanceCard(guidance);
      }
    } catch (error) {
      console.error('Error getting guidance:', error);
      UIComponents.hideTypingIndicator();
      UIComponents.addChatMessage('❌', 'Sorry, I couldn\'t retrieve specific guidance for this email.');
    }
  }

  private addGuidanceCard(guidance: string): void {
    const formattedGuidance = UIComponents.formatGuidanceText(guidance);
    
    const guidanceCard = `
      <div style="
        background: linear-gradient(135deg, rgba(255,193,7,0.1) 0%, rgba(255,193,7,0.05) 100%);
        border: 1px solid rgba(255,193,7,0.3);
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
        backdrop-filter: blur(10px);
      ">
        <div style="
          color: #ffc107;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          💡 Specific Guidance Needed
        </div>
        
        <div style="
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          border-left: 3px solid #ffc107;
        ">
          <div style="
            color: #ffffff;
            font-size: 14px;
            line-height: 1.5;
          ">${formattedGuidance}</div>
        </div>
        
        <div style="
          color: #e9ecef;
          font-size: 13px;
          margin-bottom: 12px;
        ">Please review the guidance above and provide your notes:</div>
        
        <textarea 
          id="guidance-notes-input" 
          placeholder="Add your notes, answers to the questions, or any relevant information..."
          style="
            width: 100%;
            min-height: 80px;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.3);
            color: #ffffff;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.5;
            resize: vertical;
            box-sizing: border-box;
            margin-bottom: 16px;
          "
           rows="3"
         ></textarea>
        
        <div id="guidance-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button onclick="emailAssistant.editGuidanceNotes()" style="
            background: #ffc107;
            color: #000;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          ">✏️ Edit</button>
          <button onclick="emailAssistant.draftReplyWithNotes()" style="
            background: transparent;
            color: #17a2b8;
            border: 1px solid #17a2b8;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          ">✏️ Draft Reply</button>
        </div>
      </div>
    `;
    
    UIComponents.addChatMessage('', guidanceCard);
  }

  private addGuidanceNotesSection(): void {
    const notesSection = `
      <div style="
        background: linear-gradient(135deg, rgba(255,193,7,0.1) 0%, rgba(255,193,7,0.05) 100%);
        border: 1px solid rgba(255,193,7,0.3);
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
        backdrop-filter: blur(10px);
      ">
        <div style="
          color: #ffc107;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          📝 Your Notes & Answers
        </div>
        <textarea 
          id="guidance-notes-input" 
          placeholder="Add your notes, answers to the questions, or any relevant information..."
          style="
            width: 100%;
            min-height: 100px;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.3);
            color: #ffffff;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.5;
            resize: vertical;
            box-sizing: border-box;
            margin-bottom: 16px;
          "
          rows="4"
        ></textarea>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button onclick="emailAssistant.submitGuidanceNotes()" style="
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          ">💾 Save Notes</button>
          <button onclick="emailAssistant.draftReplyWithNotes()" style="
            background: transparent;
            color: #17a2b8;
            border: 1px solid #17a2b8;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          ">✏️ Draft Reply</button>
        </div>
      </div>
    `;
    
    UIComponents.addChatMessage('', notesSection);
  }

  private async getEmailGuidanceText(): Promise<string | null> {
    if (!this.currentEmailContext) return null;
    
    try {
      const guidanceRequest: ChatRequest = {
        subject: this.currentEmailContext.subject || 'No Subject',
        sender: this.currentEmailContext.sender || 'Unknown Sender',
        body: this.currentEmailContext.body || 'No Content',
        message: "What specific information or actions are needed for this email?"
      };
      
      const guidanceResponse = await apiClient.getEmailGuidance(guidanceRequest);
      
      return guidanceResponse.response || null;
    } catch (error) {
      console.error('Error getting email guidance:', error);
      return null;
    }
  }

  // Public methods for button actions (called from HTML onclick)
  public sendAutoReply(replyText: string): void {
    UIComponents.addChatMessage('👤', 'Sending auto-reply...');
    // Implementation for sending the reply would go here
    UIComponents.addChatMessage('✅', 'Auto-reply sent successfully!');
  }

  public editAutoReply(replyText: string): void {
    // Add the reply text to the chat input for editing
    const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
    if (chatInput) {
      chatInput.value = `Please help me edit this reply:\n\n"${replyText}"`;
      chatInput.focus();
    }
  }

  public submitGuidanceNotes(): void {
    const notesInput = document.getElementById('guidance-notes-input') as HTMLTextAreaElement;
    if (notesInput && notesInput.value.trim()) {
      const notes = notesInput.value.trim();
      UIComponents.addChatMessage('📝', `**My Notes:**\n${notes}`);
      UIComponents.addChatMessage('✅', 'Notes saved! You can now draft a reply or continue working with this email.');
    } else {
      UIComponents.addChatMessage('⚠️', 'Please add some notes before saving.');
    }
  }

  public draftReplyWithNotes(): void {
    const notesInput = document.getElementById('guidance-notes-input') as HTMLTextAreaElement;
    const notes = notesInput ? notesInput.value.trim() : '';
    
    let draftMessage = 'Please help me draft a professional reply to this email.';
    if (notes) {
      draftMessage += ` Here are my notes and information I've gathered:\n\n${notes}`;
    }
    draftMessage += '\n\nPlease create a complete, professional email response.';
    
    // Add to chat input
    const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
    if (chatInput) {
      chatInput.value = draftMessage;
      chatInput.focus();
    }
  }

  public denyAutoReply(): void {
    UIComponents.addChatMessage('❌', 'Auto-reply suggestion denied. The email will remain unprocessed.');
  }

  public editGuidanceNotes(): void {
    // Get current notes from the textarea
    const notesInput = document.getElementById('guidance-notes-input') as HTMLTextAreaElement;
    const currentNotes = notesInput ? notesInput.value : '';
    
    // Hide the textarea and show edit interface
    if (notesInput) {
      notesInput.style.display = 'none';
    }
    
    // Replace buttons with edit interface
    const buttonsContainer = document.getElementById('guidance-buttons');
    if (buttonsContainer) {
      buttonsContainer.innerHTML = `
        <textarea 
          id="edit-guidance-textarea" 
          placeholder="Edit your notes here..."
          style="
            width: 100%;
            min-height: 100px;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.3);
            color: #ffffff;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.5;
            resize: vertical;
            box-sizing: border-box;
            margin-bottom: 16px;
          "
          rows="4"
        >${currentNotes}</textarea>
        
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button onclick="emailAssistant.updateGuidanceNotes()" style="
            background: #28a745;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 120px;
            justify-content: center;
          ">✅ Update Reply</button>
          <button onclick="emailAssistant.cancelEditGuidanceNotes()" style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 120px;
            justify-content: center;
          ">❌ Cancel</button>
        </div>
      `;
    }
  }

  public updateGuidanceNotes(): void {
    const editTextarea = document.getElementById('edit-guidance-textarea') as HTMLTextAreaElement;
    const originalTextarea = document.getElementById('guidance-notes-input') as HTMLTextAreaElement;
    
    if (editTextarea && originalTextarea) {
      // Update the original textarea with the edited content
      originalTextarea.value = editTextarea.value;
      
      // Show success message
      if (editTextarea.value.trim()) {
        UIComponents.addChatMessage('📝', `**Notes Updated:**\n${editTextarea.value.trim()}`);
        UIComponents.addChatMessage('✅', 'Your notes have been updated successfully!');
      }
      
      // Restore the original interface
      this.restoreGuidanceInterface();
    }
  }

  public cancelEditGuidanceNotes(): void {
    // Show cancellation message
    UIComponents.addChatMessage('❌', 'Edit cancelled. No changes were saved.');
    
    // Restore the original interface
    this.restoreGuidanceInterface();
  }

  private restoreGuidanceInterface(): void {
    // Show the original textarea
    const notesInput = document.getElementById('guidance-notes-input') as HTMLTextAreaElement;
    if (notesInput) {
      notesInput.style.display = 'block';
    }
    
    // Restore original buttons
    const buttonsContainer = document.getElementById('guidance-buttons');
    if (buttonsContainer) {
      buttonsContainer.innerHTML = `
        <button onclick="emailAssistant.editGuidanceNotes()" style="
          background: #ffc107;
          color: #000;
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        ">✏️ Edit</button>
        <button onclick="emailAssistant.draftReplyWithNotes()" style="
          background: transparent;
          color: #17a2b8;
          border: 1px solid #17a2b8;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        ">✏️ Draft Reply</button>
      `;
    }
  }

  private async getEmailGuidance(): Promise<void> {
    if (!this.currentEmailContext) return;

    try {
      const guidanceRequest: ChatRequest = {
        subject: this.currentEmailContext.subject || 'No Subject',
        sender: this.currentEmailContext.sender || 'Unknown Sender',
        body: this.currentEmailContext.body || 'No Content',
        message: "What specific information or actions are needed for this email?"
      };

      const guidance = await apiClient.getEmailGuidance(guidanceRequest);
      
      if (guidance.success) {
        UIComponents.updateGuidanceContent(guidance.response);
      } else {
        UIComponents.updateGuidanceContent('Unable to get specific guidance at this time.');
      }
    } catch (error) {
      console.error('Error getting email guidance:', error);
      UIComponents.updateGuidanceContent('Error loading guidance. Please try again.');
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
    
    // Make the assistant globally accessible for onclick handlers
    (window as any).emailAssistant = globalAssistant;
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