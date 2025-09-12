/**
 * StatusDisplay - Handles status indicators and notifications
 * 
 * Responsibilities:
 * - Connection status display
 * - Processing status indicators
 * - Error and success messages
 * - Loading states
 */

import { AgentStatus } from '../../models/types';
import { localizationManager } from '../../localization/localization-manager';

export class StatusDisplay {
  private statusElement: HTMLElement | null = null;
  private statusText: HTMLElement | null = null;
  private connectionStatus: HTMLElement | null = null;
  private errorMessage: HTMLElement | null = null;
  private successMessage: HTMLElement | null = null;

  constructor() {
    this.initializeElements();
  }

  initialize(): void {
    console.log('[StatusDisplay] Initializing...');
    this.initializeElements();
    this.showStatus({ status: 'completed', message: localizationManager.getString('status.ready') });
  }

  showStatus(status: AgentStatus): void {
    if (!this.statusElement || !this.statusText) return;

    this.statusText.textContent = status.message || this.getStatusMessage(status.status);
    this.statusElement.className = `status status-${status.status}`;
    
    // Add animation for thinking status
    if (status.status === 'thinking') {
      this.statusElement.classList.add('thinking-animation');
    } else {
      this.statusElement.classList.remove('thinking-animation');
    }
  }

  setConnectionStatus(connected: boolean): void {
    if (!this.connectionStatus) return;

    this.connectionStatus.textContent = connected ? '🟢' : '🔴';
    this.connectionStatus.title = connected 
      ? localizationManager.getString('connectionStatus.connected')
      : localizationManager.getString('connectionStatus.disconnected');
  }

  showError(message: string): void {
    if (!this.errorMessage) return;

    this.errorMessage.textContent = message;
    this.errorMessage.style.display = 'block';
    
    // Add shake animation
    this.errorMessage.classList.add('shake');
    setTimeout(() => {
      this.errorMessage?.classList.remove('shake');
    }, 600);
    
    // Hide after 8 seconds
    setTimeout(() => {
      this.hideError();
    }, 8000);
  }

  hideError(): void {
    if (this.errorMessage) {
      this.errorMessage.style.display = 'none';
    }
  }

  showSuccess(message: string): void {
    if (this.successMessage) {
      this.successMessage.textContent = message;
      this.successMessage.style.display = 'block';
      
      // Hide after 4 seconds
      setTimeout(() => {
        if (this.successMessage) {
          this.successMessage.style.display = 'none';
        }
      }, 4000);
    } else {
      // Create temporary success message if element doesn't exist
      this.createTemporaryMessage(message, 'success');
    }
  }

  showLoading(show: boolean, message: string = ''): void {
    if (!message) {
      message = localizationManager.getString('processing.loading');
    }
    
    if (show) {
      this.showStatus({ 
        status: 'thinking', 
        message: message 
      });
    }
  }

  dispose(): void {
    console.log('[StatusDisplay] Disposing...');
    // No cleanup needed for this component
  }

  private initializeElements(): void {
    this.statusElement = document.getElementById('status');
    this.statusText = document.getElementById('status-text');
    this.connectionStatus = document.getElementById('connection-status');
    this.errorMessage = document.getElementById('error-message');
    this.successMessage = document.getElementById('success-message');
  }

  private getStatusMessage(status: string): string {
    switch (status) {
      case 'thinking': return localizationManager.getString('status.thinking');
      case 'waiting_for_human': return localizationManager.getString('status.waitingForInput');
      case 'completed': return localizationManager.getString('status.completed');
      case 'cancelled': return localizationManager.getString('status.cancelled');
      case 'error': return localizationManager.getString('status.error');
      case 'connecting': return localizationManager.getString('status.connecting');
      case 'disconnected': return localizationManager.getString('status.disconnected');
      case 'ready': return localizationManager.getString('status.ready');
      default: return localizationManager.getString('status.ready');
    }
  }

  private createTemporaryMessage(message: string, type: 'success' | 'error' = 'success'): void {
    const tempDiv = document.createElement('div');
    tempDiv.className = `${type}-message temporary`;
    tempDiv.textContent = message;
    tempDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#00b894' : '#e74c3c'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 1000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(tempDiv);
    
    setTimeout(() => {
      tempDiv.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }
      }, 300);
    }, 4000);
  }
}
