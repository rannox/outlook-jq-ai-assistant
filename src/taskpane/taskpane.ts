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
  private isProcessing: boolean = false;
  private currentAction: AgentAction | null = null;
  private instanceId: string;
  private lastApprovedDraft: any = null; // Store the last approved draft for successful execution

  constructor() {
    this.instanceId = Math.random().toString(36).substr(2, 9);
    console.log(`EmailAssistant instance created: ${this.instanceId}`);
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
    // Action buttons
    this.addEventListenerSafe('btn-compose-reply', 'click', 
      () => this.handleAction(AgentAction.COMPOSE_REPLY));
    this.addEventListenerSafe('btn-summarize', 'click', 
      () => this.handleAction(AgentAction.SUMMARIZE));
    this.addEventListenerSafe('btn-analyze-sentiment', 'click', 
      () => this.handleAction(AgentAction.ANALYZE_SENTIMENT));
    this.addEventListenerSafe('btn-extract-tasks', 'click', 
      () => this.handleAction(AgentAction.EXTRACT_TASKS));

    // Utility buttons
    this.addEventListenerSafe('btn-refresh', 'click', 
      () => this.loadEmailContext());
    this.addEventListenerSafe('btn-test-connection', 'click', 
      () => this.testAgentConnection());

    console.log('UI event listeners initialized');
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

  private async handleAction(action: AgentAction): Promise<void> {
    console.log(`[${this.instanceId}] handleAction called: ${action}`);
    console.log(`[${this.instanceId}] Current state - isProcessing: ${this.isProcessing}, currentAction: ${this.currentAction}, threadId: ${this.currentThreadId}`);
    console.log(`[${this.instanceId}] Email context available: ${!!this.currentEmailContext}`);
    
    if (this.isProcessing) {
      console.log(`[${this.instanceId}] Request blocked - already processing`);
      UIComponents.showError('Another action is already in progress. Please wait.');
      return;
    }

    if (!this.currentEmailContext) {
      UIComponents.showError('No email context available. Please refresh to load email data.');
      return;
    }

    try {
      this.isProcessing = true;
      this.currentAction = action; // Store current action
      UIComponents.enableButtons(false);
      UIComponents.highlightButton(`btn-${action.replace('_', '-')}`, true);
      // Clear previous chat and status
      UIComponents.clearChatMessages();
      UIComponents.clearStatusItems();
      UIComponents.addStatusItem('🔄', `Starting ${action.replace('_', ' ')}`, true);
      UIComponents.showStatus({ status: 'thinking', message: 'Sending request to agent...' });

      // Prepare request
      const request: ProcessEmailRequest = {
        email_context: this.currentEmailContext,
        action: action,
        thread_id: this.currentThreadId || undefined
      };

      console.log('Sending request to agent:', request);

      // Send to agent
      UIComponents.addStatusItem('📤', 'Sending to agent', true);
      console.log('About to send request to agent service...');
      const response = await apiClient.processEmail(request);
      console.log('Received response from agent service:', response);
      console.log('=== INITIAL RESPONSE ROUTING ===');
      console.log('requires_human_input:', response.requires_human_input);
      console.log('interrupt_data present:', !!response.interrupt_data);
      console.log('Will take HITL path:', !!response.requires_human_input);
      
      UIComponents.addStatusItem('📥', 'Response received', true);
      
      this.currentThreadId = response.thread_id;
      console.log('Thread ID set to:', this.currentThreadId);

      if (response.requires_human_input) {
        // Connect to WebSocket for real-time updates
        UIComponents.addStatusItem('🔗', 'Connecting...', true);
        await this.connectWebSocket(response.thread_id);
        
        // Handle human-in-the-loop
        UIComponents.addStatusItem('🤔', 'Waiting for approval', true);
        if (response.interrupt_data) {
          await this.handleHumanInTheLoop(response.interrupt_data);
        } else {
          console.error('HTTP response has requires_human_input=true but null interrupt_data');
          UIComponents.showError('Invalid approval request from server. Please try again.');
        }
      } else {
        // Process completed immediately
        UIComponents.addStatusItem('✅', 'Processing complete', true);
        this.handleCompletedTask(response.result);
      }

    } catch (error) {
      console.error('Error processing action:', error);
      UIComponents.addStatusItem('❌', 'Error occurred', false, true);
      UIComponents.showError(`Failed to process ${action}: ${error instanceof Error ? error.message : String(error)}`);
      UIComponents.showStatus({ status: 'error', message: 'Error occurred' });
    } finally {
      this.isProcessing = false;
      this.currentAction = null; // Clear current action
      UIComponents.enableButtons(true);
      UIComponents.highlightButton(`btn-${action.replace('_', '-')}`, false);
      console.log(`[${this.instanceId}] Action ${action} completed - state reset for next action`);
      console.log(`[${this.instanceId}] Final state - isProcessing: ${this.isProcessing}, emailContext: ${!!this.currentEmailContext}`);
      // No more loading overlay or HITL section to hide
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
        console.log('Current processing state:', {
          isProcessing: this.isProcessing,
          currentAction: this.currentAction,
          currentThreadId: this.currentThreadId
        });
        console.log('Full WebSocket status:', status);
        
        UIComponents.showStatus(status);
        
        if (status.status === 'waiting_for_human') {
          console.log('WebSocket waiting_for_human check:', {
            hasData: !!status.data,
            isProcessing: this.isProcessing,
            currentThreadId: this.currentThreadId,
            statusThreadId: status.thread_id,
            threadsMatch: status.thread_id === this.currentThreadId
          });
          
          if (status.data && this.isProcessing && this.currentThreadId && status.thread_id === this.currentThreadId) {
            console.log('WebSocket triggering human-in-the-loop for current action');
            this.handleHumanInTheLoop(status.data);
          } else {
            console.log('Ignoring WebSocket human-in-the-loop:', {
              reason: !status.data ? 'no data' :
                      !this.isProcessing ? 'not processing' : 
                      !this.currentThreadId ? 'no current thread' :
                      status.thread_id !== this.currentThreadId ? 'different thread' : 'unknown',
              statusThreadId: status.thread_id,
              currentThreadId: this.currentThreadId
            });
          }
        } else if (status.status === 'completed' && status.data) {
          // Only handle completion for the current thread
          if (this.currentThreadId && status.thread_id === this.currentThreadId) {
            console.log('WebSocket handling completion for current thread');
            this.handleCompletedTask(status.data);
          } else {
            console.log('Ignoring WebSocket completion for different/no thread');
          }
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
        
        // Reset processing state immediately for next action
        this.isProcessing = false;
        this.currentAction = null;
        this.currentThreadId = null;
        UIComponents.enableButtons(true);
        
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
          // Task completed
          this.handleCompletedTask(response.result);
        }
      }

    } catch (error) {
      console.error('Error handling human-in-the-loop:', error);
      UIComponents.showError('Failed to process your response');
    } finally {
      UIComponents.showLoading(false);
      // Only reset state if we didn't already handle it (e.g., in reject case)
      if (this.isProcessing) {
        this.isProcessing = false;
        this.currentAction = null;
        UIComponents.enableButtons(true);
        console.log(`[${this.instanceId}] State reset in finally block`);
      }
    }
  }

  private async handleCompletedTask(result: any): Promise<void> {
    console.log('=== TASK COMPLETED ===');
    console.log('Result:', result);
    console.log('Current action:', this.currentAction);
    console.log('Should auto-apply result:', this.shouldAutoApplyResult());
    
    UIComponents.showStatus({ status: 'completed', message: 'Task completed successfully' });
    UIComponents.hideStreamingContent();
    UIComponents.hideInterruptSection(); // Hide the inline HITL section
    
    // Update result area
    UIComponents.updateResult(result);
    
    // Only auto-apply result for compose actions, not for analysis actions
    if (this.shouldAutoApplyResult()) {
      console.log('Auto-applying result...');
      await this.applyResult(result);
    } else {
      console.log('Not auto-applying result - action:', this.currentAction);
    }
    
    // Disconnect WebSocket
    wsClient.disconnect();
    
    // Refresh email context for future actions
    console.log('Refreshing email context after task completion...');
    this.currentEmailContext = await getCurrentEmailContext();
    console.log('Email context refreshed:', !!this.currentEmailContext);
    
    UIComponents.showSuccess('Task completed successfully!');
  }

  private shouldAutoApplyResult(): boolean {
    // Only auto-apply for actions that should create/modify emails
    // Don't auto-apply for analysis actions that should just display results
    const autoApplyActions = [AgentAction.COMPOSE_REPLY];
    return this.currentAction ? autoApplyActions.includes(this.currentAction) : false;
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