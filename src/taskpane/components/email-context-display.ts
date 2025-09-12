/**
 * EmailContextDisplay - Manages email context UI display
 * 
 * Responsibilities:
 * - Email context information display
 * - Context section visibility
 * - Context field updates
 */

import { EmailContext } from '../../models/types';
import { localizationManager } from '../../localization/localization-manager';

export class EmailContextDisplay {
  private contextSection: HTMLElement | null = null;
  private subjectElement: HTMLElement | null = null;
  private fromElement: HTMLElement | null = null;
  private toElement: HTMLElement | null = null;

  constructor() {
    this.initializeElements();
  }

  initialize(): void {
    console.log('[EmailContextDisplay] Initializing...');
    this.initializeElements();
    this.hide(); // Start hidden
  }

  updateContext(context: EmailContext | null): void {
    if (!context) {
      this.hide();
      return;
    }

    this.show();
    this.updateFields(context);
  }

  show(): void {
    if (this.contextSection) {
      this.contextSection.style.display = 'block';
    }
  }

  hide(): void {
    if (this.contextSection) {
      this.contextSection.style.display = 'none';
    }
  }

  isVisible(): boolean {
    return this.contextSection?.style.display !== 'none';
  }

  dispose(): void {
    console.log('[EmailContextDisplay] Disposing...');
    // No cleanup needed for this component
  }

  private initializeElements(): void {
    this.contextSection = document.getElementById('email-context');
    this.subjectElement = document.getElementById('email-subject');
    this.fromElement = document.getElementById('email-from');
    this.toElement = document.getElementById('email-to');

    if (!this.contextSection) {
      console.warn('[EmailContextDisplay] Email context section not found');
    }
  }

  private updateFields(context: EmailContext): void {
    const strings = localizationManager.getStrings();
    
    if (this.subjectElement) {
      this.subjectElement.textContent = context.subject || strings.emailContext.noSubject;
    }
    
    if (this.fromElement) {
      this.fromElement.textContent = context.sender || strings.emailContext.unknownSender;
    }
    
    if (this.toElement) {
      this.toElement.textContent = context.recipient || strings.emailContext.unknownRecipient;
    }
  }
}
