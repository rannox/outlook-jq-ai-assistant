/**
 * HITL Decision Dialog Component
 * 
 * Provides a modal dialog for human-in-the-loop decision making during AI workflows
 * Handles the three classification types: ignore, auto-reply, and information-needed
 */

import { HITLWorkflowResponse } from '../../models/api-types';
import { EmailContext } from '../../models/types';
import { localizationManager } from '../../localization/localization-manager';

export interface HITLDecisionConfig {
  workflowId: string;
  classification: HITLWorkflowResponse['classification'];
  interruptData: HITLWorkflowResponse['interrupt_data'];
  email: {
    subject: string;
    sender: string;
    body: string;
    message_id?: string;
  };
  onDecision: (decision: string) => void;
}

export class HITLDecisionDialog {
  private currentDialog: HTMLElement | null = null;
  private isOpen: boolean = false;

  public async showDecision(config: HITLDecisionConfig): Promise<string> {
    return new Promise((resolve) => {
      if (this.isOpen) {
        console.warn('Another HITL dialog is already open');
        resolve('convert_to_ignore');
        return;
      }

      this.createDialog(config, resolve);
      this.isOpen = true;
    });
  }

  private createDialog(config: HITLDecisionConfig, resolve: (value: string) => void): void {
    const dialog = document.createElement('div');
    dialog.className = 'hitl-decision-dialog';
    
    if (!config.classification || !config.interruptData) {
      console.error('Invalid HITL configuration');
      resolve('convert_to_ignore');
      return;
    }

    let dialogContent = '';
    
    switch (config.interruptData.type) {
      case 'ignore_approval_needed':
        dialogContent = this.createIgnoreDialog(config);
        break;
      case 'auto_reply_approval_needed':
        dialogContent = this.createAutoReplyDialog(config);
        break;
      case 'information_needed_questions':
        dialogContent = this.createInformationDialog(config);
        break;
      default:
        console.error('Unknown interrupt type:', config.interruptData.type);
        resolve('convert_to_ignore');
        return;
    }
    
    dialog.innerHTML = dialogContent;
    document.body.appendChild(dialog);
    this.currentDialog = dialog;
    
    this.attachEventListeners(dialog, config, resolve);
  }

  private createIgnoreDialog(config: HITLDecisionConfig): string {
    const classification = config.classification!;
    const buttonsHtml = this.createDynamicButtons(config);
    
    return `
      <div class="hitl-overlay">
        <div class="hitl-content">
          <div class="hitl-header">
            <h3>🗂️ ${localizationManager.getString('classification.title')}: ${localizationManager.getString('classification.types.ignore')}</h3>
            <button class="hitl-close">&times;</button>
          </div>
          
          <div class="hitl-body">
            <div class="classification-summary">
              <p><strong>${localizationManager.getString('classification.confidence')}:</strong> ${(classification.confidence * 100).toFixed(1)}%</p>
              <p><strong>${localizationManager.getString('classification.reasoning')}:</strong> ${this.escapeHtml(classification.reasoning)}</p>
            </div>
            
            <div class="email-preview">
              <p><strong>From:</strong> ${this.escapeHtml(config.email.sender)}</p>
              <p><strong>Subject:</strong> ${this.escapeHtml(config.email.subject)}</p>
              <div class="email-body">
                ${this.escapeHtml(config.email.body.substring(0, 200))}${config.email.body.length > 200 ? '...' : ''}
              </div>
            </div>
          </div>
          
          <div class="hitl-footer">
            ${buttonsHtml}
          </div>
        </div>
      </div>
    `;
  }

  private createAutoReplyDialog(config: HITLDecisionConfig): string {
    const classification = config.classification!;
    const buttonsHtml = this.createDynamicButtons(config);
    
    return `
      <div class="hitl-overlay">
        <div class="hitl-content">
          <div class="hitl-header">
            <h3>📤 ${localizationManager.getString('classification.title')}: ${localizationManager.getString('classification.types.autoReply')}</h3>
            <button class="hitl-close">&times;</button>
          </div>
          
          <div class="hitl-body">
            <div class="classification-summary">
              <p><strong>${localizationManager.getString('classification.confidence')}:</strong> ${(classification.confidence * 100).toFixed(1)}%</p>
              <p><strong>${localizationManager.getString('classification.reasoning')}:</strong> ${this.escapeHtml(classification.reasoning)}</p>
            </div>
            
            <div class="proposed-reply">
              <h4>${localizationManager.getString('classification.proposedResponse')}</h4>
              <div class="reply-preview">
                ${this.escapeHtml((classification as any).auto_response || (classification as any).proposed_reply || '')}
              </div>
            </div>
            
            <!-- Custom reply section removed - using two-step flow now -->
          </div>
          
          <div class="hitl-footer">
            ${buttonsHtml}
          </div>
        </div>
      </div>
    `;
  }

  private createInformationDialog(config: HITLDecisionConfig): string {
    const classification = config.classification!;
    const questions = (classification as any).questions || (classification as any).clarifying_questions || [];
    const questionsHtml = questions.map((q: string) => 
      `<li>${this.escapeHtml(q)}</li>`
    ).join('');
    const buttonsHtml = this.createDynamicButtons(config);

    return `
      <div class="hitl-overlay">
        <div class="hitl-content">
          <div class="hitl-header">
            <h3>❓ ${localizationManager.getString('classification.title')}: ${localizationManager.getString('classification.types.informationNeeded')}</h3>
            <button class="hitl-close">&times;</button>
          </div>
          
          <div class="hitl-body">
            <div class="classification-summary">
              <p><strong>${localizationManager.getString('classification.confidence')}:</strong> ${(classification.confidence * 100).toFixed(1)}%</p>
              <p><strong>${localizationManager.getString('classification.reasoning')}:</strong> ${this.escapeHtml(classification.reasoning)}</p>
            </div>
            
            <div class="questions-section">
              <h4>${localizationManager.getString('classification.clarifyingQuestions')}</h4>
              <ul class="questions-list">${questionsHtml}</ul>
            </div>
            
            <div class="response-mode">
              <label><input type="radio" name="response-mode" value="answers" checked> ${localizationManager.getString('decision.provideAnswers')}</label>
              <label><input type="radio" name="response-mode" value="custom"> ${localizationManager.getString('decision.customReply')}</label>
            </div>
            
            <div class="answers-section">
              <textarea id="response-text" placeholder="Provide answers to help generate a response..." rows="4"></textarea>
            </div>
          </div>
          
          <div class="hitl-footer">
            ${buttonsHtml}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create dynamic buttons based on available_decisions from backend
   */
  private createDynamicButtons(config: HITLDecisionConfig): string {
    const availableDecisions = config.interruptData?.available_decisions || [];
    
    if (availableDecisions.length === 0) {
      console.warn('No available decisions found, falling back to convert_to_ignore');
      return `<button class="hitl-btn tertiary" data-decision="convert_to_ignore">🚫 ${localizationManager.getString('decision.convertToIgnore')}</button>`;
    }

    let buttonsHtml = '';
    
    for (const decision of availableDecisions) {
      const buttonInfo = this.getDecisionButtonInfo(decision);
      const buttonClass = this.getButtonClass(decision);
      
      buttonsHtml += `
        <button class="hitl-btn ${buttonClass}" data-decision="${decision}">
          ${buttonInfo.icon} ${buttonInfo.label}
        </button>
      `;
    }
    
    return buttonsHtml;
  }

  /**
   * Get button info (icon and label) for each decision type
   * Updated for new two-step flow
   */
  private getDecisionButtonInfo(decision: string): { icon: string; label: string } {
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
   * Get appropriate CSS class for button styling
   */
  private getButtonClass(decision: string): string {
    switch (decision) {
      case 'approve_send':
      case 'approve_ignore':
      case 'send_edited':
        return 'primary';
      case 'edit_reply':
      case 'provide_answers':
      case 'custom_reply':
      case 'process_instead':
        return 'secondary';
      case 'cancel_edit':
      case 'convert_to_ignore':
        return 'tertiary';
      default:
        return 'secondary';
    }
  }

  private attachEventListeners(
    dialog: HTMLElement, 
    config: HITLDecisionConfig, 
    resolve: (value: string) => void
  ): void {
    // Close button
    dialog.querySelector('.hitl-close')?.addEventListener('click', () => {
      this.handleDecision('convert_to_ignore', config, resolve);
    });

    // Decision buttons
    dialog.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.hitl-btn') as HTMLButtonElement;
      
      if (!button) return;
      
      const decision = button.getAttribute('data-decision');
      if (decision) {
        this.handleButtonClick(decision, config, resolve);
      }
    });

    // Two-step flow: edit_reply will trigger edit mode dialog
    // No need for inline textarea anymore

    // Response mode toggle for information needed
    const radioButtons = dialog.querySelectorAll('input[name="response-mode"]');
    radioButtons.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const textarea = dialog.querySelector('#response-text') as HTMLTextAreaElement;
        if (textarea) {
          textarea.placeholder = target.value === 'answers' 
            ? 'Provide answers to help generate a response...'
            : 'Enter your custom reply message...';
        }
      });
    });
  }

  private handleButtonClick(
    decision: string, 
    config: HITLDecisionConfig, 
    resolve: (value: string) => void
  ): void {
    let finalDecision = decision;
    
    // Handle decisions that require text input
    if (decision === 'edit_reply') {
      // Step 1: Enter edit mode - show edit dialog
      this.showEditModeDialog(config, resolve);
      return;
    } else if (decision === 'provide_answers') {
      const textarea = document.querySelector('#response-text') as HTMLTextAreaElement;
      const text = textarea?.value.trim();
      if (text) {
        // Use JSON format for provide_answers
        finalDecision = JSON.stringify({
          decision: "provide_answers",
          proposed_reply: text
        });
      } else {
        return; // Don't proceed without text
      }
    } else if (decision === 'custom_reply') {
      const textarea = document.querySelector('#response-text') as HTMLTextAreaElement;
      const text = textarea?.value.trim();
      if (text) {
        finalDecision = `${decision}:${text}`;
      } else {
        return; // Don't proceed without text
      }
    }
    
    this.handleDecision(finalDecision, config, resolve);
  }

  private handleDecision(
    decision: string, 
    config: HITLDecisionConfig, 
    resolve: (value: string) => void
  ): void {
    this.closeDialog();
    config.onDecision(decision);
    resolve(decision);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show edit mode dialog (Step 2 of two-step flow)
   */
  private showEditModeDialog(config: HITLDecisionConfig, resolve: (value: string) => void): void {
    this.closeDialog(); // Close current dialog
    
    const classification = config.classification!;
    const originalReply = (classification as any).auto_response || (classification as any).proposed_reply || '';
    
    const editDialog = document.createElement('div');
    editDialog.className = 'hitl-decision-dialog';
    
    editDialog.innerHTML = `
      <div class="hitl-overlay">
        <div class="hitl-content edit-mode">
          <div class="hitl-header">
            <h3>✏️ ${localizationManager.getString('decision.editReply')}</h3>
            <button class="hitl-close">&times;</button>
          </div>
          
          <div class="hitl-body">
            <div class="email-context">
              <p><strong>From:</strong> ${this.escapeHtml(config.email.sender)}</p>
              <p><strong>Subject:</strong> ${this.escapeHtml(config.email.subject)}</p>
            </div>
            
            <div class="edit-section">
              <h4>${localizationManager.getString('decision.proposedResponse')}</h4>
              <textarea id="edit-reply-text" placeholder="Edit your reply message..." rows="6">${this.escapeHtml(originalReply)}</textarea>
            </div>
          </div>
          
          <div class="hitl-footer">
            <button class="hitl-btn primary" data-decision="send_edited">
              📤 ${localizationManager.getString('decision.sendEdited')}
            </button>
            <button class="hitl-btn tertiary" data-decision="cancel_edit">
              ❌ ${localizationManager.getString('decision.cancelEdit')}
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(editDialog);
    this.currentDialog = editDialog;
    
    // Focus on textarea
    const textarea = editDialog.querySelector('#edit-reply-text') as HTMLTextAreaElement;
    setTimeout(() => textarea?.focus(), 100);
    
    // Attach event listeners for edit mode
    this.attachEditModeListeners(editDialog, config, resolve);
  }
  
  /**
   * Attach event listeners for edit mode dialog
   */
  private attachEditModeListeners(
    dialog: HTMLElement, 
    config: HITLDecisionConfig, 
    resolve: (value: string) => void
  ): void {
    // Close button - cancel edit
    dialog.querySelector('.hitl-close')?.addEventListener('click', () => {
      this.handleEditModeDecision('cancel_edit', config, resolve);
    });

    // Decision buttons
    dialog.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.hitl-btn') as HTMLButtonElement;
      
      if (!button) return;
      
      const decision = button.getAttribute('data-decision');
      if (decision) {
        this.handleEditModeDecision(decision, config, resolve);
      }
    });
  }
  
  /**
   * Handle edit mode decisions
   */
  private handleEditModeDecision(
    decision: string, 
    config: HITLDecisionConfig, 
    resolve: (value: string) => void
  ): void {
    let finalDecision = decision;
    
    if (decision === 'send_edited') {
      const textarea = document.querySelector('#edit-reply-text') as HTMLTextAreaElement;
      const text = textarea?.value.trim();
      if (text) {
        finalDecision = `send_edited:${text}`;
      } else {
        return; // Don't proceed without text
      }
    } else if (decision === 'cancel_edit') {
      // Return to original dialog
      this.closeDialog();
      this.createDialog(config, resolve);
      return;
    }
    
    this.handleDecision(finalDecision, config, resolve);
  }

  public closeDialog(): void {
    if (this.currentDialog) {
      this.currentDialog.remove();
      this.currentDialog = null;
      this.isOpen = false;
    }
  }
}

// Global instance
export const hitlDecisionDialog = new HITLDecisionDialog();
