# JQuad AI Assistant - Localization Implementation

## Overview

The JQuad AI Assistant Outlook plugin now supports automatic language detection and localization. The plugin will automatically detect the language of your Outlook installation and display its interface in the appropriate language.

## Supported Languages

- **English (en)** - Default language
- **German (de)** - Deutsch

## How It Works

### Automatic Language Detection

The plugin uses Office.js APIs to detect the current language:

1. **Primary Detection**: Uses `Office.context.displayLanguage` to get Outlook's UI language
2. **Fallback Detection**: Uses `Office.context.contentLanguage` as a secondary option
3. **Smart Parsing**: Handles various locale formats (e.g., `de-DE`, `en-US`, `de-AT`)

### Language Switching Logic

```typescript
// Example of automatic detection
const displayLanguage = Office.context.displayLanguage; // e.g., "de-DE"
const detectedLocale = parseLanguageCode(displayLanguage); // returns "de"
localizationManager.setLocale(detectedLocale); // Switches to German
```

## Implementation Details

### File Structure

```
src/localization/
├── strings.ts              # All localized strings for EN and DE
├── localization-manager.ts # Main localization logic
└── README.md               # This documentation
```

### Key Components

1. **LocalizationManager**: Singleton class that handles language detection and string management
2. **LocalizedStrings Interface**: Type-safe interface for all text content
3. **Language Resources**: Complete German and English translations

### Integration Points

The localization system is integrated throughout the plugin:

- **taskpane.ts**: Initializes localization and updates UI
- **ui-components.ts**: Uses localized strings for status messages
- **taskpane.html**: Contains elements with IDs for localization

## Testing the Localization

### Option 1: Live Testing in Outlook

1. Change your Outlook display language:
   - Go to **File** > **Options** > **Language**
   - Under **Choose Display Language**, select German or English
   - Restart Outlook
2. Load the plugin - it should automatically display in the selected language

### Option 2: Browser Testing

1. Open `test-localization.html` in your browser
2. Use the "Switch to English" / "Switch to German" buttons
3. Observe how all text elements change language dynamically

## Localized Content

### Main Interface

| Element | English | German |
|---------|---------|---------|
| App Title | JQuad AI Assistant | JQuad KI-Assistent |
| Chat Title | Chat with AI Assistant | Chat mit KI-Assistent |
| Email Subject | Subject: | Betreff: |
| Email From | From: | Von: |
| Email To | To: | An: |

### Status Messages

| Status | English | German |
|--------|---------|---------|
| Ready | Ready | Bereit |
| Thinking | AI is thinking... | KI denkt nach... |
| Completed | Task completed | Aufgabe abgeschlossen |
| Error | An error occurred | Ein Fehler ist aufgetreten |

### Buttons and Actions

| Action | English | German |
|--------|---------|---------|
| Refresh | Refresh | Aktualisieren |
| Accept | Accept | Akzeptieren |
| Edit | Edit | Bearbeiten |
| Reject | Reject | Ablehnen |
| Send | Send | Senden |

### Chat Interface

The chat interface includes localized:
- Welcome messages
- Suggestion buttons
- Input placeholders
- Response messages

## Adding New Languages

To add support for additional languages:

1. **Add the locale type**:
   ```typescript
   export type SupportedLocale = 'en' | 'de' | 'fr'; // Add 'fr' for French
   ```

2. **Create the string resource**:
   ```typescript
   export const FR_STRINGS: LocalizedStrings = {
     appTitle: "Assistant IA JQuad",
     // ... translate all strings
   };
   ```

3. **Update the LocalizationManager**:
   ```typescript
   case 'fr':
     this.currentStrings = FR_STRINGS;
     break;
   ```

## Technical Features

### Type Safety

All localized strings are type-checked using TypeScript interfaces, preventing missing translations and typos.

### Performance

- Localization is initialized once during plugin startup
- Strings are loaded synchronously after language detection
- No runtime API calls for translations

### Fallback Strategy

- Unknown languages fall back to English
- Missing strings fall back to their key names
- Graceful degradation if localization fails

## Browser Support

The localization system works in all modern browsers and Office environments:
- Office Online (Web)
- Office Desktop (Windows/Mac)
- Outlook Desktop
- Outlook Web App

## Development Notes

### Testing Language Detection

During development, you can simulate different Outlook languages by modifying the Office.js context:

```javascript
// Simulate German Outlook
Office.context.displayLanguage = 'de-DE';
localizationManager.refresh(); // Re-detect and update
```

### Adding New UI Elements

When adding new UI elements that need localization:

1. Add the element to the HTML with an ID
2. Add the localized strings to `strings.ts`
3. Update the `updateUIWithLocalizedStrings()` method in `taskpane.ts`

### Error Handling

The localization system includes comprehensive error handling:
- Falls back to English if language detection fails
- Logs warnings for missing translations
- Returns key names as fallback for missing strings

## Future Enhancements

Potential future improvements:

1. **Additional Languages**: French, Spanish, Italian, Dutch
2. **Regional Variants**: Support for country-specific variations
3. **Dynamic Loading**: Load language resources on demand
4. **User Override**: Allow manual language selection
5. **Date/Time Formatting**: Locale-specific formatting
6. **RTL Support**: Right-to-left languages like Arabic

## Support

If you encounter issues with localization:

1. Check the browser console for localization warnings
2. Verify your Outlook language settings
3. Test with the included `test-localization.html` file
4. Ensure the plugin is using the latest build

The localization system is designed to be robust and fail gracefully, ensuring the plugin remains functional even if language detection encounters issues.
