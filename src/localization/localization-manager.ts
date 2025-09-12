import { LocalizedStrings, EN_STRINGS, DE_STRINGS } from './strings';

export type SupportedLocale = 'en' | 'de';

export class LocalizationManager {
  private static instance: LocalizationManager;
  private currentLocale: SupportedLocale = 'en';
  private currentStrings: LocalizedStrings = EN_STRINGS;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): LocalizationManager {
    if (!LocalizationManager.instance) {
      LocalizationManager.instance = new LocalizationManager();
    }
    return LocalizationManager.instance;
  }

  /**
   * Initialize the localization manager and detect the Outlook language
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure Office.js is available
      if (typeof Office === 'undefined' || !Office.context) {
        console.warn('Office.js not available, falling back to English');
        this.setLocale('en');
        return;
      }

      // Detect the current Outlook language using Office.js API
      const detectedLocale = this.detectOutlookLanguage();
      console.log('Detected Outlook language:', detectedLocale);
      
      // Set the locale and load appropriate strings
      this.setLocale(detectedLocale);
      
      console.log(`Localization initialized with locale: ${this.currentLocale}`);
    } catch (error) {
      console.warn('Failed to detect Outlook language, falling back to English:', error);
      this.setLocale('en');
    }
  }

  /**
   * Detect the current Outlook language using Office.js APIs
   */
  private detectOutlookLanguage(): SupportedLocale {
    try {
      // Use Office.context.displayLanguage to get the UI language of Outlook
      const displayLanguage = Office.context.displayLanguage;
      console.log('Office.context.displayLanguage:', displayLanguage);
      
      // Also check content language as a fallback
      const contentLanguage = Office.context.contentLanguage;
      console.log('Office.context.contentLanguage:', contentLanguage);
      
      // Primary detection based on display language
      const locale = this.parseLanguageCode(displayLanguage);
      if (locale) {
        return locale;
      }
      
      // Fallback to content language
      const contentLocale = this.parseLanguageCode(contentLanguage);
      if (contentLocale) {
        return contentLocale;
      }
      
      // Default fallback
      return 'en';
    } catch (error) {
      console.error('Error detecting Outlook language:', error);
      return 'en';
    }
  }

  /**
   * Synchronously detect and set locale (for immediate use)
   */
  public initializeSync(): void {
    try {
      if (typeof Office !== 'undefined' && Office.context) {
        const detectedLocale = this.detectOutlookLanguage();
        this.setLocale(detectedLocale);
        console.log(`Localization initialized synchronously with locale: ${this.currentLocale}`);
      } else {
        console.warn('Office.js not available for sync initialization, using English');
        this.setLocale('en');
      }
    } catch (error) {
      console.warn('Failed to initialize localization synchronously, using English:', error);
      this.setLocale('en');
    }
  }

  /**
   * Parse language codes (e.g., 'de-DE', 'en-US') to supported locales
   */
  private parseLanguageCode(languageCode: string): SupportedLocale | null {
    if (!languageCode) {
      return null;
    }

    // Convert to lowercase and extract primary language code
    const primaryLanguage = languageCode.toLowerCase().split('-')[0];
    
    switch (primaryLanguage) {
      case 'de':
        return 'de';
      case 'en':
        return 'en';
      default:
        // For unsupported languages, check if it's a Germanic language that might prefer German
        if (['at', 'ch', 'li'].includes(languageCode.toLowerCase().split('-')[1])) {
          return 'de';
        }
        return null;
    }
  }

  /**
   * Set the current locale and load the appropriate strings
   */
  public setLocale(locale: SupportedLocale): void {
    this.currentLocale = locale;
    
    switch (locale) {
      case 'de':
        this.currentStrings = DE_STRINGS;
        break;
      case 'en':
      default:
        this.currentStrings = EN_STRINGS;
        break;
    }
    
    console.log(`Locale set to: ${locale}`);
  }

  /**
   * Get the current locale
   */
  public getCurrentLocale(): SupportedLocale {
    return this.currentLocale;
  }

  /**
   * Get the current localized strings
   */
  public getStrings(): LocalizedStrings {
    return this.currentStrings;
  }

  /**
   * Get a specific localized string by path (dot notation)
   * Example: getString('chat.title') returns the chat title
   */
  public getString(path: string): string {
    try {
      const keys = path.split('.');
      let value: unknown = this.currentStrings;
      
      for (const key of keys) {
        if (value && typeof value === 'object' && !Array.isArray(value) && key in value) {
          value = (value as Record<string, unknown>)[key];
        } else {
          console.warn(`Localization key not found: ${path}`);
          return path; // Return the path as fallback
        }
      }
      
      if (typeof value === 'string') {
        return value;
      } else {
        console.warn(`Localization value is not a string: ${path}`, value);
        return path;
      }
    } catch (error) {
      console.error(`Error getting localized string for path: ${path}`, error);
      return path;
    }
  }

  /**
   * Check if a locale is supported
   */
  public isLocaleSupported(locale: string): boolean {
    const primaryLanguage = locale.toLowerCase().split('-')[0];
    return ['en', 'de'].includes(primaryLanguage);
  }

  /**
   * Get available locales
   */
  public getAvailableLocales(): SupportedLocale[] {
    return ['en', 'de'];
  }

  /**
   * Get locale display name
   */
  public getLocaleDisplayName(locale: SupportedLocale): string {
    switch (locale) {
      case 'en':
        return 'English';
      case 'de':
        return 'Deutsch';
      default:
        return locale;
    }
  }

  /**
   * Force refresh localization (useful for testing)
   */
  public refresh(): void {
    this.initialize();
  }
}

// Export singleton instance
export const localizationManager = LocalizationManager.getInstance();
