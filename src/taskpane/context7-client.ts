/**
 * Context7 MCP Client - Provides contextual documentation and help
 * 
 * Integrates with Context7 Model Context Protocol server for intelligent
 * documentation retrieval and contextual assistance
 */

export interface Context7LibraryDocs {
  library_id: string;
  content: string;
  tokens_used: number;
}

export interface Context7LibraryResolution {
  library_id: string;
  name: string;
  description: string;
  trust_score: number;
}

export class Context7Client {
  private mcpServerUrl: string;
  private headers: Headers;

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.mcpServerUrl = serverUrl;
    this.headers = new Headers({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  /**
   * Resolve library name to Context7-compatible library ID
   */
  async resolveLibraryId(libraryName: string): Promise<Context7LibraryResolution[]> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/mcp/context7/resolve-library-id`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ 
          libraryName: libraryName 
        })
      });

      if (!response.ok) {
        throw new Error(`Context7 resolve failed: ${response.status}`);
      }

      const result = await response.json();
      return result.libraries || [];
    } catch (error) {
      console.error('Context7 library resolution failed:', error);
      return [];
    }
  }

  /**
   * Get contextual documentation for a library
   */
  async getLibraryDocs(
    context7LibraryId: string, 
    topic?: string, 
    maxTokens: number = 5000
  ): Promise<Context7LibraryDocs | null> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/mcp/context7/get-library-docs`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          context7CompatibleLibraryID: context7LibraryId,
          topic: topic,
          tokens: maxTokens
        })
      });

      if (!response.ok) {
        throw new Error(`Context7 docs retrieval failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        library_id: context7LibraryId,
        content: result.content || '',
        tokens_used: result.tokens_used || 0
      };
    } catch (error) {
      console.error('Context7 documentation retrieval failed:', error);
      return null;
    }
  }

  /**
   * Get contextual help for email-related queries
   */
  async getEmailContextualHelp(query: string): Promise<string> {
    try {
      // First resolve relevant libraries for email/Outlook development
      const emailLibraries = await this.resolveLibraryId('office-js');
      const outlookLibraries = await this.resolveLibraryId('outlook-addin');
      
      const relevantLibraries = [...emailLibraries, ...outlookLibraries]
        .filter(lib => lib.trust_score >= 7)
        .slice(0, 2); // Limit to top 2 most relevant libraries

      if (relevantLibraries.length === 0) {
        return 'No contextual help available for this query.';
      }

      // Get documentation from the most relevant library
      const topLibrary = relevantLibraries[0];
      const docs = await this.getLibraryDocs(topLibrary.library_id, query);

      if (docs && docs.content) {
        return `**Contextual Help from ${topLibrary.name}:**\n\n${docs.content}`;
      }

      return 'Unable to retrieve contextual help at this time.';
    } catch (error) {
      console.error('Email contextual help failed:', error);
      return 'Error retrieving contextual help.';
    }
  }

  /**
   * Get help for specific Office.js or Outlook development topics
   */
  async getOfficeJsHelp(topic: string): Promise<string> {
    try {
      const libraries = await this.resolveLibraryId('office-js');
      
      if (libraries.length === 0) {
        return 'Office.js documentation not available.';
      }

      const officeJsLib = libraries[0];
      const docs = await this.getLibraryDocs(officeJsLib.library_id, topic);

      if (docs && docs.content) {
        return `**Office.js Help for "${topic}":**\n\n${docs.content}`;
      }

      return 'No specific help found for this Office.js topic.';
    } catch (error) {
      console.error('Office.js help retrieval failed:', error);
      return 'Error retrieving Office.js help.';
    }
  }

  /**
   * Check if Context7 MCP server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Context7 availability check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const context7Client = new Context7Client();
