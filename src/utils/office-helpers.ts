import { EmailContext, OfficeError } from '../models/types';

/**
 * Retrieves the current email context from Office.js mailbox item
 * Follows Microsoft Office.js best practices for error handling
 * @returns Promise resolving to EmailContext or null if unavailable
 */
export async function getCurrentEmailContext(): Promise<EmailContext | null> {
  return new Promise((resolve) => {
    try {
      const item = Office.context.mailbox.item;
      if (!item) {
        console.warn('No email item available - user may not have selected an email');
        resolve(null);
        return;
      }

      const isCompose = item.itemType === Office.MailboxEnums.ItemType.Message && 
                       !item.dateTimeCreated;

      console.log('Email item type:', item.itemType);
      console.log('Is compose mode:', isCompose);
      console.log('Email dateTimeCreated:', item.dateTimeCreated);

      // Get email properties
      const subject = item.subject || '';
      
      Promise.all([
        getFromAddress(),
        getToAddresses(),
        getEmailBody()
      ]).then(([sender, to, body]) => {
        // Use the actual email timestamp from Outlook, fallback to current time for compose mode
        let emailTimestamp: string;
        if (item.dateTimeCreated) {
          // For existing emails, use the actual creation/received timestamp
          emailTimestamp = item.dateTimeCreated.toISOString();
          console.log('Using original email timestamp:', emailTimestamp);
        } else {
          // For compose mode (new emails), use current timestamp
          emailTimestamp = new Date().toISOString();
          console.log('Using current timestamp for compose mode:', emailTimestamp);
        }
        
        const context: EmailContext = {
          sender,
          recipient: to, // Single recipient string as expected by backend
          subject,
          body,
          timestamp: emailTimestamp,
          // Optional Outlook-specific properties
          message_id: item.internetMessageId || `outlook-${Date.now()}`,
          is_compose: isCompose,
          internetMessageId: item.internetMessageId || undefined
        };
        
        console.log('Email context created:', context);
        resolve(context);
      }).catch((error) => {
        console.error('Error getting email properties:', error);
        resolve(null);
      });

    } catch (error) {
      console.error('Error getting email context:', error);
      resolve(null);
    }
  });
}

/**
 * Converts plain text to HTML format optimized for Outlook compatibility
 * Properly escapes HTML characters and formats text with paragraphs and line breaks
 * @param text - Plain text to convert
 * @returns HTML formatted text safe for Outlook
 */
function convertTextToHtml(text: string): string {
  if (!text) return '';
  
  // Escape HTML characters first to prevent XSS and formatting issues
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  
  // Convert line breaks to proper paragraphs for better Outlook compatibility
  let htmlContent = escaped
    .replace(/\r\n/g, '\n')   // Normalize line endings
    .replace(/\r/g, '\n')     // Normalize line endings
    .trim();
  
  // Split into paragraphs (double line breaks)
  const paragraphs = htmlContent.split('\n\n');
  
  // Process each paragraph
  const processedParagraphs = paragraphs.map(paragraph => {
    if (!paragraph.trim()) return '';
    
    // Convert single line breaks within paragraphs to <br>
    const withBreaks = paragraph.replace(/\n/g, '<br>');
    
    // Apply basic formatting
    let formatted = withBreaks
      // Format bold text with ** (do this first)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Format italic text with single * (more compatible approach)
    // This regex finds single asterisks that aren't part of ** pairs
    formatted = formatted.replace(/\*([^*\n]+)\*/g, (match, content) => {
      // Check if this asterisk is part of a ** pair by looking for <strong> tags
      if (match.includes('<strong>') || match.includes('</strong>')) {
        return match; // Don't modify if it's part of bold formatting
      }
      return `<em>${content}</em>`;
    });
    
    return `<p style="margin: 0 0 12px 0; line-height: 1.4;">${formatted}</p>`;
  }).filter(p => p);
  
  // Wrap in a div with Outlook-optimized styling
  return `<div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #000000;">
    ${processedParagraphs.join('')}
  </div>`;
}

/**
 * Retrieves the sender's email address from the current email item
 * @returns Promise resolving to sender email address or empty string if unavailable
 */
function getFromAddress(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const item = Office.context.mailbox.item;
      if (!item) {
        resolve('');
        return;
      }
      
      if ('from' in item && item.from) {
        resolve(item.from.emailAddress || '');
      } else {
        // For compose mode or when from is not available, use user's email
        resolve(Office.context.mailbox.userProfile.emailAddress);
      }
    } catch (error) {
      console.error('Error getting from address:', error);
      resolve(Office.context.mailbox.userProfile.emailAddress);
    }
  });
}

/**
 * Retrieves the current user's email address from Office.js user profile
 * @returns Current user's email address or default fallback
 */
export function getCurrentUserEmail(): string {
  try {
    return Office.context.mailbox.userProfile.emailAddress || 'outlook-plugin-user';
  } catch (error) {
    console.error('Error getting current user email:', error);
    return 'outlook-plugin-user';
  }
}

/**
 * Retrieves the current user's display name from Office.js user profile
 * @returns Current user's display name or email as fallback
 */
export function getCurrentUserDisplayName(): string {
  try {
    return Office.context.mailbox.userProfile.displayName || getCurrentUserEmail();
  } catch (error) {
    console.error('Error getting current user display name:', error);
    return getCurrentUserEmail();
  }
}


/**
 * Retrieves the recipient email addresses from the current email item
 * @returns Promise resolving to comma-separated recipient addresses or empty string
 */
function getToAddresses(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const item = Office.context.mailbox.item;
      if (!item || !('to' in item) || !item.to) {
        resolve('');
        return;
      }
      
      const addresses = item.to.map(recipient => recipient.emailAddress).join(', ');
      resolve(addresses);
    } catch (error) {
      console.error('Error getting to addresses:', error);
      resolve('');
    }
  });
}

/**
 * Retrieves the email body content as plain text
 * Uses Office.js async API with proper error handling
 * @returns Promise resolving to email body text or empty string if unavailable
 */
function getEmailBody(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const item = Office.context.mailbox.item;
      if (!item?.body) {
        resolve('');
        return;
      }

      item.body.getAsync(Office.CoercionType.Text, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value || '');
        } else {
          // Follow Office.js best practices for error handling
          const error = result.error;
          console.error('Failed to get email body:', {
            name: error?.name,
            message: error?.message,
            code: error?.code
          });
          resolve(''); // Resolve with empty string rather than rejecting to allow graceful degradation
        }
      });
    } catch (error) {
      console.error('Error getting email body:', error);
      resolve('');
    }
  });
}

/**
 * Creates a reply to the current email with the provided content
 * Opens Outlook's reply form with pre-filled HTML content
 * Follows Office.js best practices for email composition
 * @param content - Plain text content to include in the reply
 * @returns Promise that resolves when reply form is opened
 * @throws Error if no email item is available or operation fails
 */
export async function createReply(content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const item = Office.context.mailbox.item;
      if (!item) {
        const error = new Error('No email item available - ensure an email is selected');
        console.error('createReply failed:', error.message);
        reject(error);
        return;
      }

      console.log('Creating reply with content:', content);
      
      // Convert plain text to HTML format for proper display
      const htmlContent = convertTextToHtml(content);
      console.log('Converted to HTML:', htmlContent);
      
      // Use displayReplyForm to open reply window
      item.displayReplyForm({
        htmlBody: htmlContent
      });
      
      resolve();
    } catch (error) {
      console.error('Error creating reply:', error);
      reject(error);
    }
  });
}

/**
 * Inserts content into the current email at the cursor position
 * Uses Office.js setSelectedDataAsync for precise content insertion
 * @param content - Plain text content to insert
 * @returns Promise that resolves when content is successfully inserted
 * @throws Error if no email body is available or insertion fails
 */
export async function insertIntoEmail(content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const item = Office.context.mailbox.item;
      if (!item?.body) {
        const error = new Error('No email body available - ensure email is in compose mode');
        console.error('insertIntoEmail failed:', error.message);
        reject(error);
        return;
      }

      console.log('Inserting content into email:', content);

      // Convert text to HTML for better formatting
      const htmlContent = convertTextToHtml(content);
      console.log('Converted content for insertion:', htmlContent);

      item.body.setSelectedDataAsync(
        htmlContent,
        { coercionType: Office.CoercionType.Html },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            console.log('Content inserted successfully');
            resolve();
          } else {
            // Follow Office.js best practices for error handling
            const error = result.error;
            const errorMessage = `Failed to insert content: ${error?.name || 'Unknown'} - ${error?.message || 'Unknown error'}`;
            console.error(errorMessage, {
              name: error?.name,
              message: error?.message,
              code: error?.code
            });
            reject(new Error(errorMessage));
          }
        }
      );
    } catch (error) {
      console.error('Error inserting content:', error);
      reject(error);
    }
  });
}



/**
 * Checks if Office.js is properly initialized and ready for use
 * Verifies that Office context, mailbox, and current item are available
 * @returns true if Office.js is ready and an email item is selected
 */
export function isOfficeReady(): boolean {
  try {
    return typeof Office !== 'undefined' && 
           Office.context && 
           Office.context.mailbox && 
           !!Office.context.mailbox.item;
  } catch (error) {
    console.error('Error checking Office readiness:', error);
    return false;
  }
}