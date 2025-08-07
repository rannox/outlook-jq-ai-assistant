import { ProcessEmailRequest, ProcessEmailResponse, InterruptResponse } from '../models/types';

export class AgentApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async processEmail(request: ProcessEmailRequest): Promise<ProcessEmailResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/email/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async resumeInterrupt(threadId: string, interruptResponse: InterruptResponse): Promise<ProcessEmailResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/interrupt/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        thread_id: threadId,
        response: interruptResponse,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async getThreadStatus(threadId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/thread/${threadId}/status`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const apiClient = new AgentApiClient();