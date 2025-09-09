import { EmailContext } from '../models/types';

export async function getCurrentEmailContext(): Promise<EmailContext | null> {
  return new Promise((resolve) => {
    try {
      const item = Office.context.mailbox.item;
      if (!item) {
        console.warn('No email item available');
        resolve(null);
        return;
      }

      const isCompose = item.itemType === Office.MailboxEnums.ItemType.Message && 
                       !item.dateTimeCreated;

      console.log('Email item type:', item.itemType);
      console.log('Is compose mode:', isCompose);

      // Get email properties
      const subject = item.subject || '';
      
      Promise.all([
        getFromAddress(),
        getToAddresses(),
        getEmailBody()
      ]).then(([sender, to, body]) => {
        const context: EmailContext = {
          subject,
          sender,
          to,
          body,
          isCompose,
          internetMessageId: item.internetMessageId || undefined // Add unique Outlook message ID
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

function convertTextToHtml(text: string): string {
  if (!text) return '';
  
  // Escape HTML characters first
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
          console.error('Failed to get email body:', result.error);
          resolve('');
        }
      });
    } catch (error) {
      console.error('Error getting email body:', error);
      resolve('');
    }
  });
}

export async function createReply(content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const item = Office.context.mailbox.item;
      if (!item) {
        reject(new Error('No email item available'));
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

export async function insertIntoEmail(content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const item = Office.context.mailbox.item;
      if (!item?.body) {
        reject(new Error('No email body available'));
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
            console.error('Failed to insert content:', result.error);
            reject(new Error(result.error?.message || 'Failed to insert content'));
          }
        }
      );
    } catch (error) {
      console.error('Error inserting content:', error);
      reject(error);
    }
  });
}



export function isOfficeReady(): boolean {
  return typeof Office !== 'undefined' && 
         Office.context && 
         Office.context.mailbox && 
         !!Office.context.mailbox.item;
}