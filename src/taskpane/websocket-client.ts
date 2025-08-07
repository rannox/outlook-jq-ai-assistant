import { StreamMessage, AgentStatus } from '../models/types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private baseUrl: string;
  private onStatusUpdate?: (status: AgentStatus) => void;
  private onStreamData?: (data: any) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;

  constructor(baseUrl: string = 'ws://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  connect(threadId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Close existing connection if any
        if (this.ws) {
          this.ws.close();
        }

        this.ws = new WebSocket(`${this.baseUrl}/ws/${threadId}`);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected to thread:', threadId);
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message: StreamMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            console.log('Raw message:', event.data);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.ws = null;
          
          // Attempt to reconnect if not intentionally closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect(threadId);
          }
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(threadId: string): void {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(threadId).catch(error => {
        console.error('Reconnection failed:', error);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          if (this.onStatusUpdate) {
            this.onStatusUpdate({
              status: 'error',
              message: 'Connection lost. Please refresh the page.'
            });
          }
        }
      });
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  private handleMessage(message: StreamMessage): void {
    console.log('WebSocket message received:', message);

    switch (message.type) {
      case 'status':
        if (this.onStatusUpdate) {
          this.onStatusUpdate({
            status: message.data.status,
            message: message.data.message,
            thread_id: message.thread_id
          });
        }
        break;
        
      case 'chunk':
        if (this.onStreamData) {
          this.onStreamData(message.data);
        }
        break;
        
      case 'interrupt':
        if (this.onStatusUpdate) {
          this.onStatusUpdate({
            status: 'waiting_for_human',
            message: 'Agent needs your input',
            data: message.data,
            thread_id: message.thread_id
          });
        }
        break;
        
      case 'complete':
        if (this.onStatusUpdate) {
          this.onStatusUpdate({
            status: 'completed',
            message: 'Task completed successfully',
            data: message.data,
            thread_id: message.thread_id
          });
        }
        break;
        
      case 'error':
        if (this.onStatusUpdate) {
          this.onStatusUpdate({
            status: 'error',
            message: message.data.error || 'An error occurred during processing'
          });
        }
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  onStatus(callback: (status: AgentStatus) => void): void {
    this.onStatusUpdate = callback;
  }

  onStream(callback: (data: any) => void): void {
    this.onStreamData = callback;
  }

  disconnect(): void {
    if (this.ws) {
      // Set code 1000 for normal closure to prevent reconnection
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }



  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient();