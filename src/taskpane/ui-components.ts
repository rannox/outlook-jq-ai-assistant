import { AgentStatus, InterruptResponse } from '../models/types';

export class UIComponents {
  
  static showStatus(status: AgentStatus): void {
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    
    if (statusElement && statusText) {
      statusText.textContent = status.message || this.getStatusMessage(status.status);
      statusElement.className = `status status-${status.status}`;
      
      // Add animation for thinking status
      if (status.status === 'thinking') {
        statusElement.classList.add('thinking-animation');
      } else {
        statusElement.classList.remove('thinking-animation');
      }
    }
  }

  static getStatusMessage(status: string): string {
    switch (status) {
      case 'thinking': return 'AI is thinking...';
      case 'waiting_for_human': return 'Waiting for your input';
      case 'completed': return 'Task completed';
      case 'cancelled': return 'Action cancelled';
      case 'error': return 'An error occurred';
      default: return 'Ready';
    }
  }

  static showLoading(show: boolean, message: string = 'Processing...'): void {
    // Loading overlay removed - using status area instead
    if (show) {
      this.addStatusItem('⚡', message, true);
    }
  }

  static addStatusItem(icon: string, text: string, isCurrent: boolean = false, isError: boolean = false): void {
    const statusContent = document.getElementById('status-content');
    if (!statusContent) return;

    // Clear current status items
    const currentItems = statusContent.querySelectorAll('.status-item.current');
    currentItems.forEach(item => {
      item.classList.remove('current');
    });

    const statusDiv = document.createElement('div');
    let className = 'status-item';
    if (isCurrent) className += ' current';
    if (isError) className += ' error';
    statusDiv.className = className;
    
    statusDiv.innerHTML = `
      <span class="status-icon">${icon}</span>
      <span class="status-text">${text}</span>
    `;
    
    statusContent.appendChild(statusDiv);
    
    // Keep only last 5 status items
    const items = statusContent.querySelectorAll('.status-item');
    if (items.length > 5) {
      items[0].remove();
    }
  }

  static clearStatusItems(): void {
    const statusContent = document.getElementById('status-content');
    if (statusContent) {
      statusContent.innerHTML = `
        <div class="status-item">
          <span class="status-icon">⚡</span>
          <span class="status-text">Ready</span>
        </div>
      `;
    }
  }

  static addChatMessage(icon: string, text: string, isThinking: boolean = false): void {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ai-message${isThinking ? ' thinking' : ''}`;
    
    messageDiv.innerHTML = `
      <span class="message-icon">${icon}</span>
      <span class="message-text">${text}</span>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  static clearChatMessages(): void {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = `
        <div class="chat-message ai-message">
          <span class="message-icon">🤖</span>
          <span class="message-text">Ready to help! Click an action above to get started.</span>
        </div>
      `;
    }
  }

  static showInterruptDialog(interruptData: any): Promise<InterruptResponse> {
    console.log('showInterruptDialog called with:', interruptData);
    
    return new Promise((resolve) => {
      // Add AI message to chat
      this.addChatMessage('🤔', interruptData.description || 'I need your approval for the next action.');
      
      // Show draft details if available
      if (interruptData.action === 'draft_email' && interruptData.args) {
        const args = interruptData.args;
        const draftText = `📧 **Draft Email:**\n**To:** ${args.to}\n**Subject:** ${args.subject}\n**Body:** ${args.body}`;
        this.addChatMessage('📝', draftText.replace(/\n/g, '<br>'));
      }
      
      // Use chat approval area
      const approvalArea = document.getElementById('chat-approval-area');
      const acceptBtn = document.getElementById('chat-btn-accept');
      const editBtn = document.getElementById('chat-btn-edit');
      const rejectBtn = document.getElementById('chat-btn-reject');
      const respondBtn = document.getElementById('chat-btn-respond');
      
      console.log('Chat approval elements found:', { approvalArea: !!approvalArea, acceptBtn: !!acceptBtn });
      
      if (approvalArea && acceptBtn) {
        // Show/hide buttons based on config
        const config = interruptData.config || {};
        if (acceptBtn) acceptBtn.style.display = config.allow_accept !== false ? 'inline-block' : 'none';
        if (editBtn) editBtn.style.display = config.allow_edit !== false ? 'inline-block' : 'none';
        if (rejectBtn) rejectBtn.style.display = config.allow_reject !== false ? 'inline-block' : 'none';
        if (respondBtn) respondBtn.style.display = config.allow_respond !== false ? 'inline-block' : 'none';
        
        // Show the approval area
        approvalArea.style.display = 'block';
        
        const cleanup = () => {
          // Hide approval area and remove event listeners
          approvalArea.style.display = 'none';
          acceptBtn?.removeEventListener('click', onAccept);
          editBtn?.removeEventListener('click', onEdit);
          rejectBtn?.removeEventListener('click', onReject);
          respondBtn?.removeEventListener('click', onRespond);
        };
        
        const onAccept = () => {
          cleanup();
          resolve({ type: 'accept' });
        };
        
        const onEdit = () => {
          // Show email editor instead of simple feedback
          this.showEmailEditor(interruptData.args, (editedArgs, feedback) => {
            cleanup();
            resolve({ 
              type: 'edit', 
              args: editedArgs,
              feedback: feedback || undefined 
            });
          }, () => {
            // User cancelled
            cleanup();
            resolve({ type: 'reject' });
          });
        };
        
        const onReject = () => {
          cleanup();
          resolve({ type: 'reject' });
        };
        
        const onRespond = () => {
          // Show inline input for general feedback (uses 'edit' type like Edit button)
          this.showInlineInput('Response', 'Please provide your response:', (response) => {
            cleanup();
            resolve({ 
              type: 'edit',  // Changed from 'response' to 'edit'
              feedback: response || undefined 
            });
          }, () => {
            // User cancelled
            cleanup();
            resolve({ type: 'reject' });
          });
        };
        
        acceptBtn?.addEventListener('click', onAccept);
        editBtn?.addEventListener('click', onEdit);
        rejectBtn?.addEventListener('click', onReject);
        respondBtn?.addEventListener('click', onRespond);
      }
    });
  }

  static hideInterruptSection(): void {
    const description = document.getElementById('inline-hitl-description');
    const buttonsContainer = document.querySelector('.inline-hitl-buttons') as HTMLElement;
    const actionDetails = document.getElementById('inline-hitl-details');
    
    if (description) description.textContent = 'Waiting for AI processing...';
    if (buttonsContainer) buttonsContainer.style.display = 'none';
    if (actionDetails) actionDetails.style.display = 'none';
  }

  static updateInterruptStatus(message: string): void {
    const description = document.getElementById('inline-hitl-description');
    if (description) {
      description.textContent = message;
    }
  }

  static showEmailEditor(originalArgs: any, onSubmit: (editedArgs: any, feedback: string) => void, onCancel: () => void): void {
    // Add email editor form to chat area
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const editorDiv = document.createElement('div');
    editorDiv.className = 'chat-message ai-message email-editor';
    editorDiv.innerHTML = `
      <span class="message-icon">✏️</span>
      <div class="message-text">
        <div class="email-editor-content">
          <p><strong>Edit Draft Email</strong></p>
          <div class="editor-field">
            <label>To:</label>
            <input type="text" id="edit-to-field" value="${originalArgs.to || ''}" />
          </div>
          <div class="editor-field">
            <label>Subject:</label>
            <input type="text" id="edit-subject-field" value="${originalArgs.subject || ''}" />
          </div>
          <div class="editor-field">
            <label>Body:</label>
            <textarea id="edit-body-field" rows="6">${originalArgs.body || ''}</textarea>
          </div>
          <div class="editor-field">
            <label>Notes for AI (optional):</label>
            <textarea id="edit-notes-field" rows="2" placeholder="Explain what you changed or additional instructions..."></textarea>
          </div>
          <div class="editor-buttons">
            <button id="email-save-btn" class="btn btn-success">💾 Save Changes</button>
            <button id="email-cancel-btn" class="btn btn-secondary">❌ Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    chatMessages.appendChild(editorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Get form elements
    const toField = document.getElementById('edit-to-field') as HTMLInputElement;
    const subjectField = document.getElementById('edit-subject-field') as HTMLInputElement;
    const bodyField = document.getElementById('edit-body-field') as HTMLTextAreaElement;
    const notesField = document.getElementById('edit-notes-field') as HTMLTextAreaElement;
    const saveBtn = document.getElementById('email-save-btn');
    const cancelBtn = document.getElementById('email-cancel-btn');

    if (toField) toField.focus();

    const cleanup = () => {
      editorDiv.remove();
      saveBtn?.removeEventListener('click', onSaveClick);
      cancelBtn?.removeEventListener('click', onCancelClick);
    };

    const onSaveClick = () => {
      const editedArgs = {
        to: toField?.value?.trim() || originalArgs.to,
        subject: subjectField?.value?.trim() || originalArgs.subject,
        body: bodyField?.value?.trim() || originalArgs.body
      };
      const feedback = notesField?.value?.trim() || '';
      
      console.log('=== EMAIL EDITOR SAVE ===');
      console.log('Original body:', originalArgs.body);
      console.log('Edited body:', bodyField?.value?.trim());
      console.log('Final editedArgs:', editedArgs);
      console.log('User feedback:', feedback);
      
      cleanup();
      onSubmit(editedArgs, feedback);
    };

    const onCancelClick = () => {
      cleanup();
      onCancel();
    };

    saveBtn?.addEventListener('click', onSaveClick);
    cancelBtn?.addEventListener('click', onCancelClick);
  }

  static showInlineInput(title: string, placeholder: string, onSubmit: (value: string) => void, onCancel: () => void): void {
    // Add input form to chat area
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const inputDiv = document.createElement('div');
    inputDiv.className = 'chat-message ai-message input-form';
    inputDiv.innerHTML = `
      <span class="message-icon">✏️</span>
      <div class="message-text">
        <div class="input-form-content">
          <p><strong>${title}</strong></p>
          <textarea id="inline-input-field" placeholder="${placeholder}" rows="3"></textarea>
          <div class="input-buttons">
            <button id="inline-submit-btn" class="btn btn-success">✅ Submit</button>
            <button id="inline-cancel-btn" class="btn btn-secondary">❌ Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    chatMessages.appendChild(inputDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Focus the input
    const inputField = document.getElementById('inline-input-field') as HTMLTextAreaElement;
    const submitBtn = document.getElementById('inline-submit-btn');
    const cancelBtn = document.getElementById('inline-cancel-btn');

    if (inputField) inputField.focus();

    const cleanup = () => {
      inputDiv.remove();
      submitBtn?.removeEventListener('click', onSubmitClick);
      cancelBtn?.removeEventListener('click', onCancelClick);
      inputField?.removeEventListener('keydown', onKeyDown);
    };

    const onSubmitClick = () => {
      const value = inputField?.value?.trim() || '';
      cleanup();
      onSubmit(value);
    };

    const onCancelClick = () => {
      cleanup();
      onCancel();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        onSubmitClick();
      } else if (e.key === 'Escape') {
        onCancelClick();
      }
    };

    submitBtn?.addEventListener('click', onSubmitClick);
    cancelBtn?.addEventListener('click', onCancelClick);
    inputField?.addEventListener('keydown', onKeyDown);
  }

  static updateResult(result: any): void {
    const resultArea = document.getElementById('result-area') as HTMLTextAreaElement;
    if (resultArea && result) {
      let displayText = '';
      
      if (typeof result === 'string') {
        displayText = result;
      } else if (result.messages && Array.isArray(result.messages)) {
        // Extract content from messages
        const lastMessage = result.messages[result.messages.length - 1];
        if (lastMessage && lastMessage.content) {
          displayText = lastMessage.content;
        } else {
          displayText = JSON.stringify(result, null, 2);
        }
      } else {
        displayText = JSON.stringify(result, null, 2);
      }
      
      resultArea.value = displayText;
      
      // Auto-resize textarea
      resultArea.style.height = 'auto';
      resultArea.style.height = Math.min(resultArea.scrollHeight, 300) + 'px';
    }
  }

  static showError(message: string): void {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      
      // Add shake animation
      errorDiv.classList.add('shake');
      setTimeout(() => {
        errorDiv.classList.remove('shake');
      }, 600);
      
      // Hide after 8 seconds
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 8000);
    }
  }

  static hideError(): void {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  static showSuccess(message: string): void {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
      successDiv.textContent = message;
      successDiv.style.display = 'block';
      
      // Hide after 4 seconds
      setTimeout(() => {
        successDiv.style.display = 'none';
      }, 4000);
    } else {
      // Create temporary success message if element doesn't exist
      const tempDiv = document.createElement('div');
      tempDiv.className = 'success-message';
      tempDiv.textContent = message;
      tempDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #00b894;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      `;
      
      document.body.appendChild(tempDiv);
      
      setTimeout(() => {
        document.body.removeChild(tempDiv);
      }, 4000);
    }
  }

  static updateEmailContext(subject: string, from: string, to: string): void {
    const elements = {
      subject: document.getElementById('email-subject'),
      from: document.getElementById('email-from'),
      to: document.getElementById('email-to')
    };

    if (elements.subject) elements.subject.textContent = subject || 'No subject';
    if (elements.from) elements.from.textContent = from || 'Unknown sender';
    if (elements.to) elements.to.textContent = to || 'Unknown recipient';

    const contextSection = document.getElementById('email-context');
    if (contextSection) {
      contextSection.style.display = 'block';
    }
  }

  static hideEmailContext(): void {
    const contextSection = document.getElementById('email-context');
    if (contextSection) {
      contextSection.style.display = 'none';
    }
  }

  static enableButtons(enabled: boolean): void {
    const buttons = document.querySelectorAll('.action-btn');
    buttons.forEach(button => {
      (button as HTMLButtonElement).disabled = !enabled;
    });
  }

  static highlightButton(buttonId: string, highlight: boolean): void {
    const button = document.getElementById(buttonId);
    if (button) {
      if (highlight) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    }
  }

  static setConnectionStatus(connected: boolean): void {
    const statusIcon = document.getElementById('connection-status');
    if (statusIcon) {
      statusIcon.textContent = connected ? '🟢' : '🔴';
      statusIcon.title = connected ? 'Connected to agent service' : 'Disconnected from agent service';
    }
  }

  static showStreamingContent(content: string): void {
    const streamArea = document.getElementById('stream-content');
    if (streamArea) {
      streamArea.textContent = content;
      streamArea.style.display = 'block';
      
      // Auto-scroll to bottom
      streamArea.scrollTop = streamArea.scrollHeight;
    }
  }

  static hideStreamingContent(): void {
    const streamArea = document.getElementById('stream-content');
    if (streamArea) {
      streamArea.style.display = 'none';
      streamArea.textContent = '';
    }
  }
}