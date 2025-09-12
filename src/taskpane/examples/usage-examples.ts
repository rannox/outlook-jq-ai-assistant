/**
 * Usage Examples for the Refactored Architecture
 * 
 * This file demonstrates how to use the new modular components
 * in different scenarios and migration patterns.
 */

// Example 1: Using the legacy facade (backward compatibility)
import { UIComponents } from '../ui-components-new';

export function legacyUsageExample() {
  // All existing code continues to work unchanged
  UIComponents.showStatus({ status: 'thinking', message: 'Processing...' });
  UIComponents.addChatMessage('🤖', 'Hello from the assistant!');
  UIComponents.showSuccess('Operation completed successfully');
}

// Example 2: Using specific components directly (recommended for new code)
import { ChatInterface } from '../components/chat-interface';
import { StatusDisplay } from '../components/status-display';
import { EmailContextDisplay } from '../components/email-context-display';

export function modernUsageExample() {
  // Initialize components
  const chatInterface = new ChatInterface();
  const statusDisplay = new StatusDisplay();
  const emailContextDisplay = new EmailContextDisplay();

  // Initialize all components
  chatInterface.initialize();
  statusDisplay.initialize();
  emailContextDisplay.initialize();

  // Use specific methods
  chatInterface.addAssistantMessage('Hello! How can I help you today?', '🤖');
  statusDisplay.showStatus({ status: 'completed', message: 'Assistant is ready' });
  
  // Handle events
  chatInterface.on('sendMessage', (message: string) => {
    console.log('User sent message:', message);
    chatInterface.addUserMessage(message);
    chatInterface.showTypingIndicator();
    
    // Simulate AI response
    setTimeout(() => {
      chatInterface.hideTypingIndicator();
      chatInterface.addAssistantMessage(`I received: "${message}"`);
    }, 1000);
  });

  // Cleanup when done
  return () => {
    chatInterface.dispose();
    statusDisplay.dispose();
    emailContextDisplay.dispose();
  };
}

// Example 3: Using services directly (advanced usage)
import { ConnectionManager } from '../services/connection-manager';
import { ChatManager } from '../services/chat-manager';
import { EmailContextManager } from '../services/email-context-manager';

export async function serviceUsageExample() {
  // Initialize services
  const connectionManager = new ConnectionManager();
  const emailContextManager = new EmailContextManager();
  const chatManager = new ChatManager(emailContextManager);

  try {
    // Initialize in dependency order
    await connectionManager.initialize();
    await emailContextManager.initialize();
    // ChatManager no longer needs initialization

    // Set up event handlers
    connectionManager.onStatusChange((isConnected, error) => {
      console.log('Connection status:', isConnected, error);
    });

    emailContextManager.onContextChange((context) => {
      console.log('Email context changed:', context?.subject);
    });

    chatManager.onStatusChange((status) => {
      console.log('Chat status:', status);
    });

    // Use services
    const isHealthy = await connectionManager.performHealthCheck();
    console.log('Service health:', isHealthy);

    if (emailContextManager.hasValidContext()) {
      await chatManager.sendMessage('Summarize this email');
    }

    // Return cleanup function
    return () => {
      chatManager.dispose();
      emailContextManager.dispose();
      connectionManager.dispose();
    };

  } catch (error) {
    console.error('Service initialization failed:', error);
    throw error;
  }
}

// Example 4: Custom component extending base functionality
import { EventEmitter } from '../../utils/event-emitter';

export class CustomEmailAnalyzer extends EventEmitter {
  private isAnalyzing: boolean = false;

  constructor(
    private chatManager: ChatManager,
    private emailContextManager: EmailContextManager
  ) {
    super();
    this.setupEventHandlers();
  }

  async analyzeCurrentEmail(): Promise<void> {
    if (this.isAnalyzing) {
      console.warn('Analysis already in progress');
      return;
    }

    const context = this.emailContextManager.getCurrentContext();
    if (!context) {
      throw new Error('No email context available');
    }

    this.isAnalyzing = true;
    this.emit('analysisStarted');

    try {
      // Send analysis request
      await this.chatManager.sendMessage('Analyze the sentiment and key points of this email');
      this.emit('analysisCompleted');
    } catch (error) {
      this.emit('analysisError', error);
      throw error;
    } finally {
      this.isAnalyzing = false;
    }
  }

  isAnalysisInProgress(): boolean {
    return this.isAnalyzing;
  }

  private setupEventHandlers(): void {
    this.chatManager.onStatusChange((status) => {
      if (status.isProcessing && this.isAnalyzing) {
        this.emit('analysisProgress', 'Processing with AI...');
      }
    });
  }

  dispose(): void {
    this.removeAllListeners();
    this.isAnalyzing = false;
  }
}

// Example 5: Testing helper functions
export function createMockEmailContext() {
  return {
    subject: 'Test Email Subject',
    sender: 'test@example.com',
    to: 'recipient@example.com',
    body: 'This is a test email body with some content.',
    messageId: 'test-message-id'
  };
}

export function createMockChatMessage() {
  return {
    id: 'test-msg-1',
    type: 'user' as const,
    content: 'Test message content',
    timestamp: new Date()
  };
}

// Example 6: Migration utility functions
export function migrateFromLegacyToModular() {
  // Step 1: Replace global UIComponents usage
  const replaceUIComponentsCalls = () => {
    console.log('Replace UIComponents.showStatus() with StatusDisplay.showStatus()');
    console.log('Replace UIComponents.addChatMessage() with ChatInterface.addMessage()');
    console.log('Replace UIComponents.updateEmailContext() with EmailContextDisplay.updateContext()');
  };

  // Step 2: Initialize new components
  const initializeNewComponents = () => {
    console.log('Initialize individual components instead of global singleton');
  };

  // Step 3: Set up event handlers
  const setupEventHandlers = () => {
    console.log('Replace direct method calls with event-driven communication');
  };

  return {
    replaceUIComponentsCalls,
    initializeNewComponents,
    setupEventHandlers
  };
}
