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
  
  // Escape HTML characters
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  
  // Convert line breaks to HTML
  const htmlContent = escaped
    .replace(/\r\n/g, '<br>')  // Windows line endings
    .replace(/\n/g, '<br>')   // Unix line endings
    .replace(/\r/g, '<br>');  // Mac line endings
  
  // Wrap in a div with proper styling
  return `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.4;">${htmlContent}</div>`;
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