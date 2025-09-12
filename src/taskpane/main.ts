/**
 * Main entry point for the Outlook AI Assistant
 * 
 * Coordinates initialization and manages the application lifecycle
 * Follows Office.js best practices for add-in development
 */

/* global Office */

import { EmailAssistant } from './core/email-assistant';
import { localizationManager } from '../localization/localization-manager';

// Global singleton instance
let globalAssistant: EmailAssistant | null = null;

/**
 * Initialize when Office is ready
 */
Office.onReady(async (info) => {
  console.log('[Main] Office is ready. Host:', info.host);
  
  // Prevent multiple initializations
  if (globalAssistant) {
    console.log('[Main] Email Assistant already exists, skipping initialization');
    return;
  }
  
  if (info.host === Office.HostType.Outlook) {
    try {
      // Initialize localization IMMEDIATELY and synchronously
      console.log('[Main] Initializing localization synchronously...');
      localizationManager.initializeSync();
      console.log('[Main] Localization initialized with locale:', localizationManager.getCurrentLocale());
      
      // Update the initial UI with localized strings immediately
      updateInitialUIWithLocalizedStrings();
      
      // Now create the assistant
      globalAssistant = new EmailAssistant();
      
      // Initialize the assistant (localization already done)
      await globalAssistant.initialize();
      
      // Make the assistant globally accessible for debugging
      (window as any).emailAssistant = globalAssistant;
      
      console.log('[Main] Email Assistant initialized successfully');
      
    } catch (error) {
      console.error('[Main] Failed to initialize Email Assistant:', error);
      globalAssistant = null; // Reset on error to allow retry
      showInitializationError(error);
    }
  } else {
    console.error('[Main] This add-in only works in Outlook');
    showHostError();
  }
});

/**
 * Update initial UI elements with localized strings
 */
function updateInitialUIWithLocalizedStrings(): void {
  console.log('[Main] Updating initial UI with localized strings...');
  
  const elements = {
    'app-title': localizationManager.getString('app.title'),
    'email-context-title': localizationManager.getString('emailContext.title'),
    'chat-title': localizationManager.getString('chat.title'),
    'email-subject-label': localizationManager.getString('emailContext.subject'),
    'email-from-label': localizationManager.getString('emailContext.from'),
    'email-to-label': localizationManager.getString('emailContext.to'),
    'welcome-message': getWelcomeMessage(),
    'suggestion-extract-text': localizationManager.getString('suggestions.extractTasks'),
    'suggestion-reply-text': localizationManager.getString('suggestions.writeReply'),
    'suggestion-summarize-text': localizationManager.getString('suggestions.summarize'),
    'suggestion-sentiment-text': localizationManager.getString('suggestions.sentiment'),
    'suggestion-classify-text': localizationManager.getString('suggestions.classify'),
    'chat-btn-accept-text': localizationManager.getString('buttons.accept'),
    'chat-btn-edit-text': localizationManager.getString('buttons.edit'),
    'chat-btn-respond-text': localizationManager.getString('buttons.respond'),
    'chat-btn-reject-text': localizationManager.getString('buttons.reject'),
    'status-text': localizationManager.getString('status.connecting')
  };

  Object.entries(elements).forEach(([id, text]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  });

  // Update placeholders
  const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
  if (chatInput) {
    chatInput.placeholder = localizationManager.getString('chat.inputPlaceholder');
  }
}

/**
 * Get localized welcome message
 */
function getWelcomeMessage(): string {
  const suggestions = [
    localizationManager.getString('suggestions.extractTasks'),
    localizationManager.getString('suggestions.writeReply'),
    localizationManager.getString('suggestions.summarize'),
    localizationManager.getString('suggestions.sentiment')
  ];

  return `${localizationManager.getString('chat.welcome')}\n${suggestions.map(s => `• "${s}"`).join('\n')}\n${localizationManager.getString('chat.welcomeEnd')}`;
}

/**
 * Show initialization error
 */
function showInitializationError(error: any): void {
  const errorMessage = error instanceof Error ? error.message : 
    localizationManager.getString('errors.initializationFailed');
  
  showTemporaryMessage(errorMessage, 'error');
  
  // Update status to show disconnected
  const statusElement = document.getElementById('status');
  const statusText = document.getElementById('status-text');
  const connectionStatus = document.getElementById('connection-status');
  
  if (statusElement && statusText) {
    statusElement.className = 'status status-error';
    statusText.textContent = localizationManager.getString('status.error');
  }
  
  if (connectionStatus) {
    connectionStatus.textContent = '🔴';
    connectionStatus.title = localizationManager.getString('connectionStatus.disconnected');
  }
}

/**
 * Show host compatibility error
 */
function showHostError(): void {
  showTemporaryMessage(
    'This add-in is designed for Microsoft Outlook only.',
    'error'
  );
}

/**
 * Show temporary message to user
 */
function showTemporaryMessage(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  const div = document.createElement('div');
  div.className = `temporary-message ${type}`;
  div.textContent = message;
  
  const bgColor = type === 'success' ? '#00b894' : 
                  type === 'error' ? '#e74c3c' : '#74b9ff';
  
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    z-index: 1001;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    animation: slideInRight 0.3s ease;
    background: ${bgColor};
    color: white;
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  document.body.appendChild(div);
  
  setTimeout(() => {
    div.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (document.body.contains(div)) {
        document.body.removeChild(div);
      }
    }, 300);
  }, type === 'error' ? 8000 : 3000);
}

// Add CSS animations if not already present
if (!document.querySelector('#slide-animations')) {
  const style = document.createElement('style');
  style.id = 'slide-animations';
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Cleanup function for testing or hot reload scenarios
 */
function cleanup(): void {
  if (globalAssistant) {
    globalAssistant.dispose();
    globalAssistant = null;
  }
}
/**
 * Get the global assistant instance
 */
export function getAssistant(): EmailAssistant | null {
  return globalAssistant;
}

// Export for testing purposes
export { globalAssistant, cleanup };

