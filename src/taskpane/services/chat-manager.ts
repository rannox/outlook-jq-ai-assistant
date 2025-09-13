/**
 * ChatManager - Handles chat interactions and AI agent communication
 * 
 * Responsibilities:
 * - Enhanced chat with vector context
 * - Human-in-the-loop workflows
 * - Email classification workflows
 * - Chat state management
 */

import { apiClient, ChatRequest, ChatResponse } from '../api-client';
import { HITLWorkflowResponse, ChatMessageResponse } from '../../models/api-types';
import { EmailContext, ProcessEmailRequest, StreamMessageData, InterruptResponse, InterruptData, AgentAction } from '../../models/types';
import { EmailContextManager } from './email-context-manager';
import { EventEmitter } from '../../utils/event-emitter';
import { localizationManager } from '../../localization/localization-manager';
import { EmailAgentError } from '../error-handler';
import { createReply } from '../../utils/office-helpers';
import { UIComponents } from '../ui-components';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  enhanced?: boolean;
}

export interface ChatStatus {
  isProcessing: boolean;
  currentWorkflowId?: string;
  workflowStatus?: 'processing' | 'waiting_for_human' | 'completed' | 'error' | 'awaiting_decision' | 'already_completed';
}

export class ChatManager extends EventEmitter {
  private readonly emailContextManager: EmailContextManager;
  private messages: ChatMessage[] = [];
  private status: ChatStatus = { isProcessing: false };

  constructor(emailContextManager: EmailContextManager) {
    super();
    this.emailContextManager = emailContextManager;
  }

  /**
   * Send enhanced chat message with automatic vector context
   */
  async sendMessage(message: string): Promise<void> {
    if (!message?.trim()) return;

    const trimmedMessage = message.trim();
    
    // Check for special workflow command
    if (trimmedMessage === '/classify' || trimmedMessage === '/workflow') {
      await this.startClassificationWorkflow();
      return;
    }
    
    try {
      // Add user message
      this.addMessage({
        id: this.generateMessageId(),
        type: 'user',
        content: trimmedMessage,
        timestamp: new Date()
      });

      this.updateStatus({ isProcessing: true });

      // Send to enhanced chat API
      const response = await apiClient.sendChatMessage(trimmedMessage);
      
      // Check if this is an error response
      if (response.data?.query_type === 'error') {
        throw new Error(response.response);
      }
      
      this.addMessage({
        id: this.generateMessageId(),
        type: 'assistant',
        content: response.response,
        timestamp: new Date(),
        enhanced: response.data?.search_results && response.data.search_results.length > 0
      });
    } catch (error) {
      console.error('[ChatManager] Chat error:', error);
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `❌ Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    } finally {
      this.updateStatus({ isProcessing: false });
    }
  }

  /**
   * Start email classification workflow
   */
  async startClassificationWorkflow(): Promise<void> {
    const emailContext = this.emailContextManager.getCurrentContext();
    
    if (!emailContext) {
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: '⚠️ Please select an email first to start classification.',
        timestamp: new Date()
      });
      return;
    }

    try {
      // Add system message first, then show typing indicator
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `🔄 ${localizationManager.getString('processing.startingClassification')}`,
        timestamp: new Date()
      });

      this.updateStatus({ isProcessing: true });

      const response = await apiClient.startHITLWorkflow(emailContext);

      if (response.success) {
        this.updateStatus({ 
          isProcessing: false,
          currentWorkflowId: response.workflow_id,
          workflowStatus: response.status
        });
        
        // Show classification result
        if (response.classification) {
          // Debug logging for clarifying questions
          console.log('[ChatManager] Classification data:', response.classification);
          console.log('[ChatManager] Interrupt data:', response.interrupt_data);
          
          this.addMessage({
            id: this.generateMessageId(),
            type: 'assistant',
            content: this.formatClassificationResult(response.classification, response.interrupt_data),
            timestamp: new Date()
          });
        }

        // Handle human input requirement (backend uses 'awaiting_decision')
        if ((response.status === 'waiting_for_human' || response.status === 'awaiting_decision') && response.interrupt_data) {
          // Show inline decision buttons instead of modal dialog
          this.showInlineDecisionButtons(response);
        } else if (response.status === 'already_completed') {
          // Handle already completed workflows
          this.showAlreadyCompletedInfo(response);
        } else if (response.status === 'completed') {
          this.addMessage({
            id: this.generateMessageId(),
            type: 'system',
            content: '✅ Email classification completed automatically.',
            timestamp: new Date()
          });
        }
      } else {
        throw new Error(response.error || 'Failed to start workflow');
      }
    } catch (error) {
      console.error('[ChatManager] Workflow error:', error);
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `❌ Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
      this.updateStatus({ isProcessing: false });
    }
  }

  /**
   * Show information about already completed workflow
   */
  private showAlreadyCompletedInfo(workflowResponse: HITLWorkflowResponse): void {
    if (!workflowResponse.interrupt_data) {
      console.error('Missing interrupt_data for already completed workflow');
      return;
    }

    const { message, completion_date, final_classification, final_reply } = workflowResponse.interrupt_data;
    
    let content = `ℹ️ **${localizationManager.getString('workflow.alreadyProcessed')}**\n\n${localizationManager.getString('workflow.alreadyCompletedMessage')}`;
    
    if (completion_date) {
      content += `\n**${localizationManager.getString('workflow.completed')}** ${completion_date}`;
    }
    
    if (final_classification) {
      content += `\n**${localizationManager.getString('workflow.classification')}** ${final_classification}`;
    }
    
    if (final_reply) {
      content += `\n**${localizationManager.getString('workflow.finalReply')}** ${final_reply}`;
    }

    this.addMessage({
      id: this.generateMessageId(),
      type: 'system',
      content,
      timestamp: new Date()
    });

    this.updateStatus({ 
      isProcessing: false,
      currentWorkflowId: workflowResponse.workflow_id,
      workflowStatus: 'already_completed'
    });
  }

  /**
   * Show inline decision buttons instead of modal dialog
   */
  private showInlineDecisionButtons(workflowResponse: HITLWorkflowResponse): void {
    if (!workflowResponse.classification || !workflowResponse.interrupt_data) {
      console.error('Invalid workflow response for human decision');
      return;
    }

    // Store workflow data for later access
    if (!(this as any)._workflowData) {
      (this as any)._workflowData = {};
    }
    (this as any)._workflowData[workflowResponse.workflow_id] = workflowResponse;

    this.addMessage({
      id: this.generateMessageId(),
      type: 'system',
      content: `⏸️ ${localizationManager.getString('decision.humanDecisionRequired')}`,
      timestamp: new Date()
    });

    // Add decision buttons message
    const buttonsHtml = this.createDecisionButtonsHtml(workflowResponse);
    this.addDecisionButtonsMessage(workflowResponse.workflow_id, buttonsHtml);
  }

  /**
   * Create HTML for decision buttons styled like suggestion buttons
   */
  private createDecisionButtonsHtml(workflowResponse: HITLWorkflowResponse): string {
    const classificationType = workflowResponse.classification?.type || workflowResponse.classification?.classification;
    const availableDecisions = workflowResponse.interrupt_data?.available_decisions || [];

    let buttonsHtml = '<div class="chat-suggestions" style="margin-top: 12px;">';

    // Map backend decisions to user-friendly button labels
    for (const decision of availableDecisions) {
      const buttonInfo = this.getDecisionButtonInfo(decision, classificationType);
      buttonsHtml += `<button class="suggestion-btn decision-btn" data-decision="${decision}" data-workflow-id="${workflowResponse.workflow_id}">${buttonInfo.icon} ${buttonInfo.label}</button>`;
    }

    buttonsHtml += '</div>';
    return buttonsHtml;
  }

  /**
   * Get button info (icon and label) for each decision type
   */
  private getDecisionButtonInfo(decision: string, classificationType?: string): { icon: string; label: string } {
    switch (decision) {
      case 'approve_send':
        return { icon: '✅', label: localizationManager.getString('decision.sendReply') };
      case 'approve_ignore':
        return { icon: '✅', label: localizationManager.getString('decision.approveIgnore') };
      case 'edit_reply':
        return { icon: '✏️', label: localizationManager.getString('decision.editReply') };
      case 'send_edited':
        return { icon: '📤', label: localizationManager.getString('decision.sendEdited') };
      case 'cancel_edit':
        return { icon: '❌', label: localizationManager.getString('decision.cancelEdit') };
      case 'process_instead':
        return { icon: '🔄', label: localizationManager.getString('decision.processInstead') };
      case 'convert_to_ignore':
        return { icon: '🚫', label: localizationManager.getString('decision.convertToIgnore') };
      case 'provide_answers':
        return { icon: '💡', label: localizationManager.getString('decision.provideAnswers') };
      case 'custom_reply':
        return { icon: '✏️', label: localizationManager.getString('decision.customReply') };
      default:
        if (decision.startsWith('send_edited:')) {
          return { icon: '📤', label: localizationManager.getString('decision.sendEdited') };
        }
        return { icon: '❓', label: decision.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
    }
  }

  /**
   * Add decision buttons as a special message type
   */
  private addDecisionButtonsMessage(workflowId: string, buttonsHtml: string): void {
    const messageId = this.generateMessageId();
    const message: ChatMessage = {
      id: messageId,
      type: 'system',
      content: buttonsHtml,
      timestamp: new Date()
    };

    this.messages.push(message);
    this.emit('messageAdded', message);

    // Attach event listeners after the message is added to DOM
    setTimeout(() => {
      this.attachDecisionButtonListeners(workflowId);
    }, 100);
  }

  /**
   * Attach click event listeners to decision buttons
   */
  private attachDecisionButtonListeners(workflowId: string): void {
    const decisionButtons = document.querySelectorAll(`.decision-btn[data-workflow-id="${workflowId}"]`);
    
    decisionButtons.forEach((button) => {
      button.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const decision = target.getAttribute('data-decision') || target.closest('.decision-btn')?.getAttribute('data-decision');
        
        if (decision) {
          // Handle special cases that open Outlook
          if (decision === 'approve_send') {
            await this.handleSendEditedReply(workflowId);
            return;
          }
          
          // Handle sending edited reply (also opens Outlook)
          if (decision === 'send_edited' || decision.startsWith('send_edited:')) {
            await this.handleSendEditedReply(workflowId);
            return;
          }
          
          // Handle inline edit reply
          if (decision === 'edit_reply') {
            await this.handleInlineEditReply(workflowId);
            return;
          }
          
          // Handle special decisions that need text input
          if (decision === 'provide_answers') {
            const text = await this.promptForText(decision);
            if (text) {
              // Remove the decision buttons
              this.removeDecisionButtons(workflowId);
              // Submit with new JSON format
              await this.submitDecisionWithAnswers(workflowId, text);
            } else {
              return; // User cancelled
            }
          } else if (decision === 'custom_reply') {
            const text = await this.promptForText(decision);
            if (text) {
              const finalDecision = `${decision}:${text}`;
              // Remove the decision buttons
              this.removeDecisionButtons(workflowId);
              // Submit the decision
              await this.submitDecision(workflowId, finalDecision);
            } else {
              return; // User cancelled
            }
          } else {
            // Remove the decision buttons
            this.removeDecisionButtons(workflowId);
            
            // Submit the decision
            await this.submitDecision(workflowId, decision);
          }
        }
      });
    });
  }

  /**
   * Handle inline editing of the proposed reply
   */
  private async handleInlineEditReply(workflowId: string): Promise<void> {
    try {
      // Get the workflow data to access the original proposed reply
      const workflowData = this.getWorkflowData(workflowId);
      if (!workflowData || !workflowData.classification) {
        console.error('Could not find workflow data for editing');
        return;
      }

      // Get the original proposed reply text directly from the workflow data
      const proposedReplyText = workflowData.classification.proposed_reply || 
                               workflowData.classification.auto_response || '';

      if (!proposedReplyText) {
        console.error('No proposed reply text found in workflow data');
        return;
      }

      // Find the classification message that contains the proposed reply
      const classificationMessages = document.querySelectorAll('.chat-message.ai-message');
      let classificationMessage: HTMLElement | null = null;

      // Find the message containing the proposed response
      for (let i = 0; i < classificationMessages.length; i++) {
        const message = classificationMessages[i];
        const content = message.textContent || '';
        if (content.includes(localizationManager.getString('classification.proposedResponse'))) {
          classificationMessage = message as HTMLElement;
          break;
        }
      }

      if (!classificationMessage) {
        console.error('Could not find classification message to edit');
        return;
      }

      // Replace the message content with an editable version
      this.replaceWithEditableReply(classificationMessage, proposedReplyText, workflowId);

    } catch (error) {
      console.error('Error handling inline edit reply:', error);
    }
  }

  /**
   * Replace the classification message with an editable version
   */
  private replaceWithEditableReply(messageElement: HTMLElement, originalText: string, workflowId: string): void {
    const messageTextElement = messageElement.querySelector('.message-text');
    if (!messageTextElement) return;

    // Save the original content for restoration
    messageElement.setAttribute('data-original-content', messageTextElement.innerHTML);
    messageElement.setAttribute('data-original-text', originalText);

    // Create editable version
    messageTextElement.innerHTML = `
      <div class="inline-edit-container">
        <p><strong>${localizationManager.getString('decision.editReply')}</strong></p>
        <textarea 
          id="inline-edit-textarea-${workflowId}" 
          class="inline-edit-textarea"
          rows="6"
          placeholder="${localizationManager.getString('editor.placeholder.editReply')}"
        >${this.escapeHtml(originalText)}</textarea>
        <div class="inline-edit-buttons">
          <button class="btn btn-success inline-edit-save" data-workflow-id="${workflowId}">
            💾 ${localizationManager.getString('decision.saveEdited')}
          </button>
          <button class="btn btn-secondary inline-edit-cancel" data-workflow-id="${workflowId}">
            ❌ ${localizationManager.getString('decision.cancelEdit')}
          </button>
        </div>
      </div>
    `;

    // Add event listeners for the buttons
    this.attachInlineEditListeners(workflowId, originalText, messageElement);

    // Focus on the textarea
    setTimeout(() => {
      const textarea = document.getElementById(`inline-edit-textarea-${workflowId}`) as HTMLTextAreaElement;
      textarea?.focus();
    }, 100);
  }

  /**
   * Attach event listeners for inline edit buttons
   */
  private attachInlineEditListeners(workflowId: string, originalText: string, messageElement: HTMLElement): void {
    const saveButton = messageElement.querySelector('.inline-edit-save');
    const cancelButton = messageElement.querySelector('.inline-edit-cancel');
    const textarea = messageElement.querySelector(`#inline-edit-textarea-${workflowId}`) as HTMLTextAreaElement;

    if (saveButton) {
      saveButton.addEventListener('click', () => {
        const editedText = textarea?.value?.trim();
        if (editedText) {
          // Save the edited text and return to original view
          this.saveEditedReplyAndRestore(messageElement, editedText, workflowId, originalText);
        }
      });
    }

    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        // Add fade out animation before restoring
        const container = messageElement.querySelector('.inline-edit-container') as HTMLElement;
        if (container) {
          container.style.animation = 'slideOutEdit 0.2s ease-in';
          setTimeout(() => {
            this.restoreOriginalMessage(messageElement, originalText);
          }, 200);
        } else {
          this.restoreOriginalMessage(messageElement, originalText);
        }
      });
    }
  }

  /**
   * Save the edited reply and restore to original view with updated content
   */
  private saveEditedReplyAndRestore(messageElement: HTMLElement, editedText: string, workflowId: string, originalText: string): void {
    // Update the stored workflow data with the edited text
    const workflowData = this.getWorkflowData(workflowId);
    if (workflowData && workflowData.classification) {
      // Update both possible fields where the reply might be stored
      if (workflowData.classification.proposed_reply) {
        workflowData.classification.proposed_reply = editedText;
      }
      if (workflowData.classification.auto_response) {
        workflowData.classification.auto_response = editedText;
      }
    }

    // Animate out the edit container
    const container = messageElement.querySelector('.inline-edit-container') as HTMLElement;
    if (container) {
      container.style.animation = 'slideOutEdit 0.2s ease-in';
      setTimeout(() => {
        // Restore the message with the updated text
        this.restoreWithUpdatedText(messageElement, editedText);
      }, 200);
    } else {
      this.restoreWithUpdatedText(messageElement, editedText);
    }
  }

  /**
   * Restore the message with updated text content
   */
  private restoreWithUpdatedText(messageElement: HTMLElement, updatedText: string): void {
    const messageTextElement = messageElement.querySelector('.message-text');
    if (messageTextElement) {
      // Create the updated content with the new text
      const content = `
**${localizationManager.getString('classification.proposedResponse')}**

${updatedText}
      `.trim();
      
      // Format the content with basic markdown
      const formattedContent = this.formatContent(content);
      messageTextElement.innerHTML = formattedContent;
      
      // Add restoration animation
      const htmlElement = messageTextElement as HTMLElement;
      htmlElement.style.animation = 'slideInRestore 0.3s ease-out';
      setTimeout(() => {
        htmlElement.style.animation = '';
      }, 300);
      
      // Clean up the temporary attributes
      messageElement.removeAttribute('data-original-content');
      messageElement.removeAttribute('data-original-text');
    }
  }

  /**
   * Restore the original message content
   */
  private restoreOriginalMessage(messageElement: HTMLElement, originalText: string): void {
    const messageTextElement = messageElement.querySelector('.message-text');
    if (messageTextElement) {
      // Try to restore the saved original content
      const savedContent = messageElement.getAttribute('data-original-content');
      
      if (savedContent) {
        messageTextElement.innerHTML = savedContent;
      } else {
        // Fallback: reconstruct the original message format
        const content = `
**${localizationManager.getString('classification.proposedResponse')}**

${originalText}
        `.trim();
        
        // Format the content with basic markdown
        const formattedContent = this.formatContent(content);
        messageTextElement.innerHTML = formattedContent;
      }
      
      // Add restoration animation
      const htmlElement = messageTextElement as HTMLElement;
      htmlElement.style.animation = 'slideInRestore 0.3s ease-out';
      setTimeout(() => {
        htmlElement.style.animation = '';
      }, 300);
      
      // Clean up the temporary attributes
      messageElement.removeAttribute('data-original-content');
      messageElement.removeAttribute('data-original-text');
    }
  }

  /**
   * Helper method to escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format content with basic markdown-style formatting
   */
  private formatContent(content: string): string {
    // Clean up content first - remove leading/trailing whitespace and newlines
    const cleaned = content.trim().replace(/^[\r\n]+|[\r\n]+$/g, '');
    
    // Basic markdown-style formatting
    return cleaned
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Handle sending the edited reply - open Outlook and finalize workflow
   */
  private async handleSendEditedReply(workflowId: string): Promise<void> {
    try {
      // Get the workflow data with the updated reply text
      const workflowData = this.getWorkflowData(workflowId);
      if (!workflowData || !workflowData.classification) {
        throw new Error('Workflow data not found');
      }

      // Get the updated proposed reply (which should contain the edited text)
      const proposedReply = workflowData.classification.proposed_reply || workflowData.classification.auto_response;
      
      if (!proposedReply) {
        throw new Error('No reply text found');
      }

      // Remove decision buttons immediately
      this.removeDecisionButtons(workflowId);

      // Submit the decision with the JSON format first: { decision: "approve_send", proposed_reply: "edited text" }
      await this.submitDecisionWithReply(workflowId, proposedReply);

      // After successful decision submission, show processing message
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `📤 ${localizationManager.getString('chat.responses.openingOutlookWithEdited')}`,
        timestamp: new Date()
      });

      // Create reply in Outlook with the edited text
      await createReply(proposedReply);

      // Show success message
      this.addMessage({
        id: this.generateMessageId(),
        type: 'assistant',
        content: `✅ ${localizationManager.getString('chat.responses.outlookReplyOpened')}`,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error handling send edited reply:', error);
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `❌ ${localizationManager.getString('chat.responses.outlookComposeFailed')}`,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle opening Outlook reply with proposed content and mark workflow as completed
   */
  private async handleOpenOutlookReply(workflowId: string): Promise<void> {
    try {
      // Find the workflow data to get the proposed reply
      const workflowData = this.getWorkflowData(workflowId);
      if (!workflowData || !workflowData.classification) {
        throw new Error('Workflow data not found');
      }

      const proposedReply = workflowData.classification.proposed_reply || workflowData.classification.auto_response;
      if (!proposedReply) {
        throw new Error('No proposed reply found');
      }

      // Remove the decision buttons first
      this.removeDecisionButtons(workflowId);

      // Show user that we're opening Outlook
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `📧 ${localizationManager.getString('chat.responses.openingOutlookWithProposed')}`,
        timestamp: new Date()
      });

      // Open Outlook reply window with proposed content
      await createReply(proposedReply);

      // Mark workflow as completed
      await this.submitDecision(workflowId, 'approve_send');

      // Show completion message
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `✅ ${localizationManager.getString('chat.responses.outlookReplyOpened')}`,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error opening Outlook reply:', error);
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `❌ Failed to open Outlook reply: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get workflow data for a specific workflow ID (from current messages)
   */
  private getWorkflowData(workflowId: string): HITLWorkflowResponse | null {
    // Store workflow data when buttons are created so we can access it later
    return (this as any)._workflowData?.[workflowId] || null;
  }

  /**
   * Remove decision buttons from the chat
   */
  private removeDecisionButtons(workflowId: string): void {
    const buttons = document.querySelectorAll(`.decision-btn[data-workflow-id="${workflowId}"]`);
    buttons.forEach(button => {
      const messageContainer = button.closest('.chat-message');
      if (messageContainer) {
        messageContainer.remove();
      }
    });
  }

  /**
   * Prompt user for text input for decisions that require it using UIComponents
   */
  private async promptForText(decision: string): Promise<string | null> {
    const prompts = {
      'provide_answers': 'Antworten geben',
      'custom_reply': 'Benutzerdefinierte Antwort eingeben'
    };
    
    const placeholders = {
      'provide_answers': 'Geben Sie Ihre Antworten auf die klärenden Fragen ein...',
      'custom_reply': 'Geben Sie Ihre benutzerdefinierte Antwort ein...'
    };
    
    const title = prompts[decision as keyof typeof prompts] || 'Text eingeben';
    const placeholder = placeholders[decision as keyof typeof placeholders] || 'Text eingeben...';
    
    return new Promise((resolve) => {
      UIComponents.showInlineInput(
        title,
        placeholder,
        (value: string) => {
          resolve(value || null);
        },
        () => {
          resolve(null);
        }
      );
    });
  }

  /**
   * Handle continued workflow after a decision that leads to another interrupt
   */
  private async handleContinuedWorkflow(workflowId: string): Promise<void> {
    try {
      // Poll for the next interrupt data (with retry logic)
      let attempts = 0;
      const maxAttempts = 5;
      const pollInterval = 1000; // 1 second

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;

        try {
          // Check workflow status to get the next interrupt
          const statusData = await apiClient.getHITLWorkflowStatus(workflowId);
          
          if (statusData.status === 'awaiting_decision' && statusData.interrupt_data) {
            // Create a new workflow response object for the continued workflow
            const continuedWorkflowResponse: HITLWorkflowResponse = {
              workflow_id: workflowId,
              status: 'awaiting_decision',
              classification: this.extractClassificationFromInterruptData(statusData.interrupt_data),
              interrupt_data: statusData.interrupt_data
            };

            // Show the new classification and decision buttons
            this.showContinuedWorkflowClassification(continuedWorkflowResponse);
            return;
          } else if (statusData.status === 'completed') {
            // Workflow completed while we were polling
            this.addMessage({
              id: this.generateMessageId(),
              type: 'assistant',
              content: this.formatFinalResult(statusData.result),
              timestamp: new Date()
            });
            this.updateStatus({ workflowStatus: 'completed' });
            return;
          }
        } catch (pollError) {
          console.warn(`Polling attempt ${attempts} failed:`, pollError);
        }
      }

      // If we get here, polling failed
      throw new Error('Failed to get next workflow step after multiple attempts');
    } catch (error) {
      console.error('Error handling continued workflow:', error);
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `❌ Failed to continue workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }
  }

  /**
   * Extract classification data from interrupt data for continued workflows
   */
  private extractClassificationFromInterruptData(interruptData: any): HITLWorkflowResponse['classification'] {
    // The interrupt_data might contain classification info directly
    if (interruptData.classification) {
      return {
        classification: interruptData.classification,
        confidence: interruptData.confidence || 0.95,
        reasoning: interruptData.reasoning || 'Continued from previous classification',
        proposed_reply: interruptData.proposed_reply,
        clarifying_questions: interruptData.clarifying_questions || []
      };
    }
    return undefined;
  }

  /**
   * Show classification for continued workflow (similar to initial but without storing duplicate data)
   */
  private showContinuedWorkflowClassification(workflowResponse: HITLWorkflowResponse): void {
    // Update stored workflow data
    if ((this as any)._workflowData) {
      (this as any)._workflowData[workflowResponse.workflow_id] = workflowResponse;
    }

    // Show classification result if available
    if (workflowResponse.classification) {
      this.addMessage({
        id: this.generateMessageId(),
        type: 'assistant',
        content: this.formatClassificationResult(workflowResponse.classification, workflowResponse.interrupt_data),
        timestamp: new Date()
      });
    }

    this.addMessage({
      id: this.generateMessageId(),
      type: 'system',
      content: `⏸️ ${localizationManager.getString('processing.nextDecisionRequired')}`,
      timestamp: new Date()
    });

    // Add decision buttons for the continued workflow
    const buttonsHtml = this.createDecisionButtonsHtml(workflowResponse);
    this.addDecisionButtonsMessage(workflowResponse.workflow_id, buttonsHtml);
  }

  /**
   * Submit decision with answers in the new JSON format
   */
  private async submitDecisionWithAnswers(workflowId: string, answers: string): Promise<void> {
    try {
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `⏳ ${localizationManager.getString('processing.processingDecision')} provide_answers`,
        timestamp: new Date()
      });

      const decision = {
        decision: "provide_answers",
        proposed_reply: answers
      };

      const result = await apiClient.submitHITLDecision(workflowId, decision);
      
      if (result.status === 'completed' && result.result) {
        this.addMessage({
          id: this.generateMessageId(),
          type: 'assistant',
          content: this.formatFinalResult(result.result),
          timestamp: new Date()
        });
      } else if (result.status === 'awaiting_decision' && result.interrupt_data) {
        // Continue with next decision
        this.showInlineDecisionButtons(result);
      } else {
        this.addMessage({
          id: this.generateMessageId(),
          type: 'system',
          content: `✅ ${localizationManager.getString('chat.responses.answerSubmitted')}`,
          timestamp: new Date()
        });
      }

      this.updateStatus({ 
        isProcessing: false,
        workflowStatus: result.status === 'completed' ? 'completed' : 'awaiting_decision'
      });

    } catch (error) {
      console.error('Error submitting answers:', error);
      
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `❌ Answer submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
      
      this.updateStatus({ isProcessing: false });
    }
  }

  /**
   * Submit decision with edited reply in the new JSON format
   */
  private async submitDecisionWithReply(workflowId: string, proposedReply: string): Promise<void> {
    try {
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `⏳ ${localizationManager.getString('processing.processingDecision')} approve_send`,
        timestamp: new Date()
      });

      const decision = {
        decision: "approve_send",
        proposed_reply: proposedReply
      };

      const result = await apiClient.submitHITLDecision(workflowId, decision);
      
      if (result.status === 'completed' && result.result) {
        this.addMessage({
          id: this.generateMessageId(),
          type: 'assistant',
          content: this.formatFinalResult(result.result),
          timestamp: new Date()
        });
        this.updateStatus({ workflowStatus: 'completed' });
      } else if (result.status === 'awaiting_decision') {
        // Handle continued workflow (e.g., process_instead leads to second interrupt)
        console.log('Workflow continues with second interrupt');
        this.addMessage({
          id: this.generateMessageId(),
          type: 'system',
          content: `🔄 ${localizationManager.getString('processing.workflowContinues')}`,
          timestamp: new Date()
        });
        
        // Poll for the next interrupt data
        await this.handleContinuedWorkflow(workflowId);
      } else if (result.status === 'error') {
        throw new Error(result.error || 'Workflow execution failed');
      }
    } catch (error) {
      console.error('Error submitting decision with reply:', error);
      
      // Try to extract specific error message
      let errorMessage = 'An error occurred while processing your decision.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `❌ Error: ${errorMessage}`,
        timestamp: new Date()
      });
      
      this.updateStatus({ workflowStatus: 'error' });
    }
  }

  /**
   * Submit decision and get final result
   */
  private async submitDecision(workflowId: string, decision: string): Promise<void> {
    try {
      this.addMessage({
        id: this.generateMessageId(),
        type: 'system',
        content: `⏳ ${localizationManager.getString('processing.processingDecision')} ${this.formatDecision(decision)}`,
        timestamp: new Date()
      });

      const result = await apiClient.submitHITLDecision(workflowId, decision);
      
      if (result.status === 'completed' && result.result) {
        this.addMessage({
          id: this.generateMessageId(),
          type: 'assistant',
          content: this.formatFinalResult(result.result),
          timestamp: new Date()
        });
        this.updateStatus({ workflowStatus: 'completed' });
      } else if (result.status === 'awaiting_decision') {
        // Handle continued workflow (e.g., process_instead leads to second interrupt)
        console.log('Workflow continues with second interrupt');
        this.addMessage({
          id: this.generateMessageId(),
          type: 'system',
          content: `🔄 ${localizationManager.getString('processing.workflowContinues')}`,
          timestamp: new Date()
        });
        
        // Poll for the next interrupt data
        await this.handleContinuedWorkflow(workflowId);
      } else if (result.status === 'error') {
        throw new Error(result.error || 'Workflow execution failed');
      }
    } catch (error) {
      console.error('Error submitting decision:', error);
      
      // Handle already completed workflow specifically
      if (error instanceof EmailAgentError && error.code === 'WORKFLOW_ALREADY_COMPLETED') {
        this.addMessage({
          id: this.generateMessageId(),
          type: 'system',
          content: `ℹ️ **Workflow Already Completed**\n\n${error.message}\n\nThis email has already been processed. Please refresh to see the latest status.`,
          timestamp: new Date()
        });
        this.updateStatus({ workflowStatus: 'already_completed' });
      } else {
        this.addMessage({
          id: this.generateMessageId(),
          type: 'system',
          content: `❌ Decision submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        });
      }
    }
  }

  private formatClassificationResult(classification: HITLWorkflowResponse['classification'], interruptData?: any): string {
    if (!classification) return '';
    
    const typeEmoji = {
      'ignore': '🗂️',
      'auto-reply': '📤', 
      'information-needed': '❓'
    };

    // Handle both frontend (type) and backend (classification) field names
    const classificationType = classification.type || classification.classification;
    
    if (!classificationType) return '';
    
    let result = `${typeEmoji[classificationType]} **${localizationManager.getString('classification.title')}:** ${classificationType}
**${localizationManager.getString('classification.confidence')}:** ${(classification.confidence * 100).toFixed(1)}%
**${localizationManager.getString('classification.reasoning')}:** ${classification.reasoning}`;

    // Add proposed reply if available (backend uses 'proposed_reply')
    const proposedReply = classification.auto_response || classification.proposed_reply;
    if (proposedReply) {
      result += `\n**${localizationManager.getString('classification.proposedResponse')}**\n${proposedReply}`;
    }

    // Add clarifying questions if available - check both classification and interrupt_data
    const clarifyingQuestions = classification.clarifying_questions || 
                               classification.questions || 
                               interruptData?.clarifying_questions;
    
    console.log('[ChatManager] Looking for clarifying questions:');
    console.log('  classification.clarifying_questions:', classification.clarifying_questions);
    console.log('  classification.questions:', classification.questions);
    console.log('  interruptData?.clarifying_questions:', interruptData?.clarifying_questions);
    console.log('  Final clarifyingQuestions:', clarifyingQuestions);
    
    if (clarifyingQuestions && clarifyingQuestions.length > 0) {
      result += `\n\n**${localizationManager.getString('classification.clarifyingQuestions')}**`;
      clarifyingQuestions.forEach((question: string, index: number) => {
        result += `\n${index + 1}. ${question}`;
      });
    }

    return result;
  }

  private formatDecision(decision: string): string {
    if (decision.includes(':')) {
      const [action] = decision.split(':');
      return action.replace('_', ' ');
    }
    return decision.replace('_', ' ');
  }

  private formatFinalResult(result: any): string {
    let message = `✅ **Final Action:** ${result.final_action}`;
    
    if (result.auto_response) {
      message += `\n\n**Response Sent:**\n${result.auto_response}`;
    }
    
    if (result.questions_answered) {
      message += `\n\n**Questions Addressed:** ${result.questions_answered.length}`;
    }
    
    return message;
  }

  onStatusChange(callback: (status: ChatStatus) => void): void {
    this.on('statusChanged', callback);
  }

  onMessageAdded(callback: (message: ChatMessage) => void): void {
    this.on('messageAdded', callback);
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getStatus(): ChatStatus {
    return { ...this.status };
  }

  clearMessages(): void {
    this.messages = [];
    this.emit('messagesCleared');
  }

  dispose(): void {
    this.removeAllListeners();
    this.messages = [];
  }

  private addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.emit('messageAdded', message);
  }

  private updateStatus(updates: Partial<ChatStatus>): void {
    this.status = { ...this.status, ...updates };
    console.log('[ChatManager] Status updated:', this.status);
    this.emit('statusChanged', this.status);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
