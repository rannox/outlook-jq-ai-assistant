/**
 * Decision Dialog Component
 * 
 * Provides a modal dialog for user decision-making during AI workflows
 * Used for approval workflows, clarification requests, and user input collection
 */

import { DecisionDialogConfig } from '../../models/types';
import { localizationManager } from '../../localization/localization-manager';

/**
 * Decision Dialog Manager
 * Handles the creation and management of decision dialogs
 */
export class DecisionDialogManager {
  private currentDialog: HTMLElement | null = null;
  private isOpen: boolean = false;

  /**
   * Show a decision dialog with the given configuration
   */
  public async showDecisionDialog(config: DecisionDialogConfig): Promise<string> {
    return new Promise((resolve) => {
      if (this.isOpen) {
        console.warn('[DecisionDialog] Another dialog is already open');
        resolve('reject');
        return;
      }

      this.createDialog(config, resolve);
      this.isOpen = true;
    });
  }

  /**
   * Close the current dialog if open
   */
  public closeDialog(): void {
    if (this.currentDialog) {
      this.currentDialog.remove();
      this.currentDialog = null;
      this.isOpen = false;
    }
  }

  /**
   * Create and display the dialog
   */
  private createDialog(config: DecisionDialogConfig, resolve: (value: string) => void): void {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'decision-dialog-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    `;

    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'decision-dialog';
    dialog.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
      margin: 20px;
      width: 100%;
      box-sizing: border-box;
    `;

    // Build dialog content
    dialog.innerHTML = this.buildDialogHTML(config);

    // Add event listeners
    this.attachEventListeners(dialog, config, resolve);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    this.currentDialog = overlay;

    // Focus first button
    const firstButton = dialog.querySelector('button') as HTMLButtonElement;
    if (firstButton) {
      firstButton.focus();
    }
  }

  /**
   * Build the HTML content for the dialog
   */
  private buildDialogHTML(config: DecisionDialogConfig): string {
    const { title, message, email, autoResponse, questions, options } = config;

    let content = `
      <div class="dialog-header">
        <h2 style="margin: 0 0 16px 0; color: #333; font-size: 1.2em;">${this.escapeHtml(title)}</h2>
      </div>
      
      <div class="dialog-content">
        <p style="margin: 0 0 16px 0; color: #666; line-height: 1.4;">${this.escapeHtml(message)}</p>
        
        <div class="email-preview" style="background: #f8f9fa; border-left: 4px solid #007acc; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <div style="margin-bottom: 8px;">
            <strong style="color: #333;">${localizationManager.getString('emailContext.subject')}: </strong>
            <span style="color: #666;">${this.escapeHtml(email.subject)}</span>
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #333;">${localizationManager.getString('emailContext.from')}: </strong>
            <span style="color: #666;">${this.escapeHtml(email.sender)}</span>
          </div>
          <div style="margin-bottom: 12px;">
            <strong style="color: #333;">${localizationManager.getString('emailContext.body')}: </strong>
            <div style="max-height: 150px; overflow-y: auto; background: white; padding: 8px; border-radius: 4px; margin-top: 4px;">
              ${this.escapeHtml(email.body.substring(0, 500))}${email.body.length > 500 ? '...' : ''}
            </div>
          </div>
        </div>
    `;

    // Add auto response if provided
    if (autoResponse) {
      content += `
        <div class="auto-response" style="background: #e8f5e8; border-left: 4px solid #28a745; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <strong style="color: #155724; margin-bottom: 8px; display: block;">${localizationManager.getString('response.proposed')}: </strong>
          <div style="background: white; padding: 12px; border-radius: 4px; color: #333; white-space: pre-wrap;">${this.escapeHtml(autoResponse)}</div>
        </div>
      `;
    }

    // Add questions if provided
    if (questions && questions.length > 0) {
      content += `
        <div class="questions" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <strong style="color: #856404; margin-bottom: 8px; display: block;">${localizationManager.getString('questions.title')}: </strong>
          <ul style="margin: 0; padding-left: 20px; color: #856404;">
            ${questions.map(q => `<li style="margin: 4px 0;">${this.escapeHtml(q)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    content += `
      </div>
      
      <div class="dialog-actions" style="margin-top: 24px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
    `;

    // Add action buttons
    options.forEach(option => {
      const buttonClass = option.isPrimary ? 'primary' : 'secondary';
      const icon = option.icon ? `<span style="margin-right: 6px;">${option.icon}</span>` : '';
      
      content += `
        <button 
          class="dialog-btn dialog-btn-${buttonClass}" 
          data-value="${option.value}"
          title="${this.escapeHtml(option.description || option.label)}"
          style="
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            ${option.isPrimary ? 
              'background: #007acc; color: white;' : 
              'background: #f0f0f0; color: #333; border: 1px solid #ccc;'
            }
          "
          onmouseover="this.style.opacity='0.8'"
          onmouseout="this.style.opacity='1'"
        >
          ${icon}${this.escapeHtml(option.label)}
        </button>
      `;
    });

    content += `
      </div>
    `;

    return content;
  }

  /**
   * Attach event listeners to dialog elements
   */
  private attachEventListeners(
    dialog: HTMLElement, 
    config: DecisionDialogConfig, 
    resolve: (value: string) => void
  ): void {
    // Handle button clicks
    const buttons = dialog.querySelectorAll('.dialog-btn');
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const value = target.getAttribute('data-value') || 'reject';
        this.handleDecision(value, config, resolve);
      });
    });

    // Handle ESC key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.handleDecision('reject', config, resolve);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Handle overlay click
    this.currentDialog?.addEventListener('click', (e) => {
      if (e.target === this.currentDialog) {
        this.handleDecision('reject', config, resolve);
      }
    });
  }

  /**
   * Handle user decision
   */
  private handleDecision(
    decision: string, 
    config: DecisionDialogConfig, 
    resolve: (value: string) => void
  ): void {
    this.closeDialog();
    
    // Call the config's onDecision callback if provided
    if (config.onDecision) {
      config.onDecision(decision);
    }
    
    resolve(decision);
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Check if a dialog is currently open
   */
  public isDialogOpen(): boolean {
    return this.isOpen;
  }
}

// Global instance
let globalDecisionDialog: DecisionDialogManager | null = null;

/**
 * Get or create the global decision dialog manager
 */
export function getDecisionDialogManager(): DecisionDialogManager {
  if (!globalDecisionDialog) {
    globalDecisionDialog = new DecisionDialogManager();
  }
  return globalDecisionDialog;
}

/**
 * Show a decision dialog (convenience function)
 */
export async function showDecisionDialog(config: DecisionDialogConfig): Promise<string> {
  const manager = getDecisionDialogManager();
  return manager.showDecisionDialog(config);
}

/**
 * Close any open decision dialog
 */
export function closeDecisionDialog(): void {
  if (globalDecisionDialog) {
    globalDecisionDialog.closeDialog();
  }
}

// Add CSS styles if not already present
if (!document.querySelector('#decision-dialog-styles')) {
  const style = document.createElement('style');
  style.id = 'decision-dialog-styles';
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideIn {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .decision-dialog-overlay {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .dialog-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    
    .dialog-btn:active {
      transform: translateY(0);
    }
    
    .dialog-btn:focus {
      outline: 2px solid #007acc;
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
}
