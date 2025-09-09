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

  static addUserMessage(text: string): void {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message user-message';
    
    messageDiv.innerHTML = `
      <span class="message-icon">👤</span>
      <span class="message-text">${text}</span>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  static showTypingIndicator(): void {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    // Remove any existing typing indicator
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
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  static hideTypingIndicator(): void {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  static streamChatMessage(icon: string, initialText: string = ''): HTMLElement | null {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return null;

    // Remove typing indicator if exists
    this.hideTypingIndicator();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message ai-message';
    
    messageDiv.innerHTML = `
      <span class="message-icon">${icon}</span>
      <span class="message-text">${initialText}</span>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv.querySelector('.message-text') as HTMLElement;
  }

  static clearChatMessages(): void {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = `
        <div class="chat-message ai-message">
          <span class="message-icon">🤖</span>
          <span class="message-text">Hi! I can help you with this email. Try asking me:<br/>
          • "Extract the key tasks from this email"<br/>
          • "Write a professional reply"<br/>
          • "Summarize this email"<br/>
          • "What's the sentiment here?"<br/>
          Or just ask me anything about the email!</span>
        </div>
      `;
    }
  }

  static showReplyApproval(replyContent: string): Promise<any> {
    return new Promise((resolve) => {
      const chatMessages = document.getElementById('chat-messages');
      if (!chatMessages) {
        console.error('Chat messages container not found');
        resolve({ type: 'deny' });
        return;
      }

      // Create inline approval buttons specifically for reply workflow
      const approvalDiv = document.createElement('div');
      approvalDiv.className = 'chat-message ai-message approval-message';
      approvalDiv.id = 'inline-reply-approval-message';
      
      const buttonsHtml = `
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

      approvalDiv.innerHTML = buttonsHtml;
      chatMessages.appendChild(approvalDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      const cleanup = () => {
        const approvalMessage = document.getElementById('inline-reply-approval-message');
        if (approvalMessage) {
          approvalMessage.remove();
        }
      };

      // Add click handlers for all buttons
      approvalDiv.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest('.approval-btn') as HTMLButtonElement;
        
        if (!button) return;
        
        const action = button.getAttribute('data-action');
        cleanup();

        switch (action) {
          case 'accept':
            resolve({ type: 'accept' });
            break;
          case 'edit':
            resolve({ type: 'edit' });
            break;
          case 'deny':
            resolve({ type: 'deny' });
            break;
        }
      });
    });
  }

  static showChatApproval(options: any): Promise<any> {
    return new Promise((resolve) => {
      const chatMessages = document.getElementById('chat-messages');
      if (!chatMessages) {
        console.error('Chat messages container not found');
        resolve({ type: 'reject' });
        return;
      }

      // Create inline approval buttons as part of the chat
      const approvalDiv = document.createElement('div');
      approvalDiv.className = 'chat-message ai-message approval-message';
      approvalDiv.id = 'inline-approval-message';
      
      // Create buttons based on options - optimized for email workflow
      let buttonsHtml = `
        <span class="message-icon">🤔</span>
        <div class="message-text">
          <div class="inline-approval-buttons">
      `;

      if (options.showOpenInOutlook) {
        // Email workflow: Open in Outlook (primary action) + alternatives
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
        // General workflow: Accept + Edit for non-email proposals
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
      chatMessages.appendChild(approvalDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      const cleanup = () => {
        const approvalMessage = document.getElementById('inline-approval-message');
        if (approvalMessage) {
          approvalMessage.remove();
        }
      };

      // Add click handlers for all buttons
      approvalDiv.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest('.approval-btn') as HTMLButtonElement;
        
        if (!button) return;
        
        const action = button.getAttribute('data-action');
        cleanup();

        switch (action) {
          case 'accept':
            resolve({ type: 'accept' });
            break;
          case 'edit':
          case 'revise':
            this.addChatMessage('✏️', 'What changes would you like me to make to this proposal?');
            this.showInlineInput('Revision Request', 'Describe the changes you want...', (feedback: any) => {
              resolve({ type: 'edit', feedback });
            }, () => {
              resolve({ type: 'reject' });
            });
            break;
          case 'open_in_outlook':
            resolve({ type: 'open_in_outlook' });
            break;
          case 'reject':
            resolve({ type: 'reject' });
            break;
        }
      });
    });
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

  static showInlineReplyEditor(content: string, onSubmit: (value: string) => void, onCancel: () => void): void {
    // Add reply editor form to chat area
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const editorDiv = document.createElement('div');
    editorDiv.className = 'chat-message ai-message reply-editor';
    editorDiv.innerHTML = `
      <span class="message-icon">✏️</span>
      <div class="message-text">
        <div class="reply-editor-content">
          <p><strong>Edit Reply</strong></p>
          <textarea id="reply-editor-field" rows="8">${content}</textarea>
          <div class="editor-buttons">
            <button id="reply-update-btn" class="btn btn-success">✅ Update Reply</button>
            <button id="reply-cancel-btn" class="btn btn-secondary">❌ Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    chatMessages.appendChild(editorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Focus the textarea and select all content for easy editing
    const replyField = document.getElementById('reply-editor-field') as HTMLTextAreaElement;
    const updateBtn = document.getElementById('reply-update-btn');
    const cancelBtn = document.getElementById('reply-cancel-btn');

    if (replyField) {
      replyField.focus();
      replyField.select();
    }

    const cleanup = () => {
      editorDiv.remove();
      updateBtn?.removeEventListener('click', onUpdateClick);
      cancelBtn?.removeEventListener('click', onCancelClick);
      replyField?.removeEventListener('keydown', onKeyDown);
    };

    const onUpdateClick = () => {
      const value = replyField?.value?.trim() || '';
      cleanup();
      onSubmit(value);
    };

    const onCancelClick = () => {
      cleanup();
      onCancel();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        onUpdateClick();
      } else if (e.key === 'Escape') {
        onCancelClick();
      }
    };

    updateBtn?.addEventListener('click', onUpdateClick);
    cancelBtn?.addEventListener('click', onCancelClick);
    replyField?.addEventListener('keydown', onKeyDown);
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

  static showSystemStatus(status: any): void {
    if (!status) {
      this.addChatMessage('🤖', '🏥 **System Status**: Service is responding but status details unavailable');
      return;
    }
    
    const statusValue = status.status || 'unknown';
    
    // Handle different response formats
    if (status.checks) {
      // Expected format with checks object
      const checks = status.checks;
      const message = status.message || 'No additional information';
      
      const statusMessage = `🏥 **System Status: ${statusValue}**
• Exchange: ${checks.exchange ? '✅ Connected' : '❌ Disconnected'}
• Database: ${checks.database ? '✅ Connected' : '❌ Disconnected'}  
• LLM: ${checks.llm ? '✅ Available' : '❌ Unavailable'}
• Message: ${message}`;
      
      this.addChatMessage('🤖', statusMessage.replace(/\n/g, '<br>'));
    } else if (status.tools) {
      // Actual format from your backend
      const toolCount = Array.isArray(status.tools) ? status.tools.length : 0;
      const statusMessage = `🏥 **System Status: ${statusValue}**
• LangChain Tools: ${toolCount} available
• Service: ✅ Running
• Backend: ✅ Responding`;
      
      this.addChatMessage('🤖', statusMessage.replace(/\n/g, '<br>'));
    } else {
      // Minimal format
      const statusMessage = `🏥 **System Status: ${statusValue}**
• Service: ✅ Running and responding`;
      
      this.addChatMessage('🤖', statusMessage.replace(/\n/g, '<br>'));
    }
  }

  static showClassificationResults(classification: any): void {
    // Classification section removed - results now shown in chat
    return;
  }

  static async useAutoReply(replyText: string): Promise<void> {
    try {
      // Use the existing reply functionality
      const { createReply } = await import('../utils/office-helpers');
      await createReply(replyText);
      this.addChatMessage('✅', 'Auto-reply opened in Outlook for review and sending.');
    } catch (error) {
      console.error('Error using auto-reply:', error);
      this.addChatMessage('❌', 'Failed to open auto-reply in Outlook.');
    }
  }

  static editAutoReply(replyText: string): void {
    // Add the reply to chat for editing
    this.addChatMessage('📝', 'Here\'s the suggested reply for you to edit:');
    this.addChatMessage('🤖', replyText);
    
    // Show inline editor
    this.showInlineReplyEditor(replyText, async (editedContent: string) => {
      await this.useAutoReply(editedContent);
    }, () => {
      this.addChatMessage('❌', 'Edit cancelled.');
    });
  }

  static updateGuidanceContent(guidance: string): void {
    const guidanceContent = document.getElementById('guidance-content');
    const guidanceActions = document.getElementById('guidance-actions');
    
    if (guidanceContent) {
      // Format the guidance text with proper line breaks and structure
      const formattedGuidance = this.formatGuidanceText(guidance);
      guidanceContent.innerHTML = `<div class="guidance-text">${formattedGuidance}</div>`;
      
      // Show the action buttons
      if (guidanceActions) {
        guidanceActions.style.display = 'flex';
      }
    }
  }

  static formatGuidanceText(text: string): string {
    // Use a much simpler, robust approach without complex regex patterns
    return this.parseGuidanceStructure(text);
  }

  static parseGuidanceStructure(text: string): string {
    // Clean the text first
    const cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Split by periods followed by numbers to find numbered items
    const parts = cleaned.split(/(?=\d+\.\s)/);
    let result = '';
    
    for (let part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      // Check if this part starts with a number
      const match = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (match) {
        const [, number, content] = match;
        result += this.formatGuidanceItem(number, content);
      } else {
        // This is probably intro text or other content
        if (trimmed.length > 5) {
          result += this.formatGuidanceParagraph(trimmed);
        }
      }
    }
    
    return result;
  }

  static formatGuidanceItem(number: string, content: string): string {
    // Process the content to handle sub-items and formatting
    const processedContent = this.processItemContent(content);
    
    return `<div class="guidance-item">
      <span class="guidance-number">${number}.</span>
      <span class="guidance-text">${processedContent}</span>
    </div>`;
  }

  static formatGuidanceParagraph(content: string): string {
    const processedContent = this.processItemContent(content);
    return `<div class="guidance-paragraph">${processedContent}</div>`;
  }

  static processItemContent(content: string): string {
    let processed = content;
    
    // Handle bold text
    processed = processed.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    
    // Handle special keywords first
    processed = processed.replace(/(Why\?|Next Step:|Actionable Response Template:|Action Required:|Note:)/gi, '<span class="guidance-keyword">$1</span>');
    
    // Handle dash items - but be more careful about the splitting
    if (processed.includes(' - ')) {
      const parts = processed.split(' - ');
      if (parts.length > 1) {
        const firstPart = parts[0];
        const dashItems = parts.slice(1);
        
        processed = firstPart;
        for (let item of dashItems) {
          if (item.trim()) {
            processed += `<div class="guidance-sub-item">• ${item.trim()}</div>`;
          }
        }
      }
    }
    
    // Handle questions
    processed = processed.replace(/\?([^?]*?)(?=<|$)/g, '?<span class="guidance-question-mark"></span>$1');
    
    return processed;
  }

  static formatInlineContent(text: string): string {
    return text
      // Format bold text with **
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Format italic text with *
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Format questions or important notes
      .replace(/\*([^*]+)\?\*/g, '<span class="guidance-question">$1?</span>')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  static showNotesSection(): void {
    const notesSection = document.getElementById('user-notes-section');
    const notesInput = document.getElementById('user-notes-input') as HTMLTextAreaElement;
    
    if (notesSection) {
      notesSection.style.display = 'block';
      if (notesInput) {
        notesInput.focus();
      }
    }
  }

  static hideNotesSection(): void {
    const notesSection = document.getElementById('user-notes-section');
    if (notesSection) {
      notesSection.style.display = 'none';
    }
  }

  static saveUserNotes(): void {
    const notesInput = document.getElementById('user-notes-input') as HTMLTextAreaElement;
    if (notesInput && notesInput.value.trim()) {
      const notes = notesInput.value.trim();
      this.addChatMessage('📝', `**My Notes:**\n${notes}`);
      this.addChatMessage('✅', 'Notes saved! You can now draft a reply or continue working with this email.');
      
      // Hide the notes section
      this.hideNotesSection();
      
      // Clear the input for next use
      notesInput.value = '';
    } else {
      this.addChatMessage('⚠️', 'Please add some notes before saving.');
    }
  }

  static async draftReplyWithGuidance(classification: any): Promise<void> {
    const notesInput = document.getElementById('user-notes-input') as HTMLTextAreaElement;
    const userNotes = notesInput ? notesInput.value.trim() : '';
    
    // Create a context-aware message for drafting
    let draftMessage = 'Please help me draft a professional reply to this email.';
    
    if (userNotes) {
      draftMessage += ` Here are my notes and information I've gathered: ${userNotes}`;
    }
    
    draftMessage += ' Please create a complete, professional email response.';
    
    // Add to chat and trigger the chat workflow
    this.addChatMessage('👤', draftMessage);
    this.addChatMessage('🤖', 'I\'ll help you draft a reply based on the information you\'ve provided...');
    
    // Trigger the chat system (this would need to be connected to the main chat system)
    // For now, we'll show a message encouraging them to use the chat
    this.addChatMessage('💡', 'You can also use the chat below to refine your reply or ask for specific help with wording.');
  }

  static showClassificationLoading(): void {
    // Classification section removed - loading shown in chat
    return;
  }


}