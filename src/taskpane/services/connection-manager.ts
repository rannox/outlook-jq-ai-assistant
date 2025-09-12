/**
 * ConnectionManager - Handles API connections and service health
 * 
 * Responsibilities:
 * - Agent service connectivity
 * - Health monitoring
 * - Connection status events
 * - Reconnection logic
 */

import { apiClient, SystemStatus } from '../api-client';
import { EventEmitter } from '../../utils/event-emitter';
import { localizationManager } from '../../localization/localization-manager';

export interface ConnectionStatus {
  isConnected: boolean;
  lastChecked: Date;
  error?: string;
}

export class ConnectionManager extends EventEmitter {
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    lastChecked: new Date()
  };

  private healthCheckInterval: number | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    console.log('[ConnectionManager] Initializing...');
    
    try {
      await this.performHealthCheck();
      this.startHealthMonitoring();
      console.log('[ConnectionManager] Initialized successfully');
    } catch (error) {
      console.error('[ConnectionManager] Initialization failed:', error);
      this.updateConnectionStatus(false, error instanceof Error ? error.message : localizationManager.getString('errors.connectionFailed'));
      throw error;
    }
  }

  async performHealthCheck(): Promise<boolean> {
    try {
      console.log('[ConnectionManager] Performing health check...');
      const isHealthy = await apiClient.healthCheck();
      
      if (isHealthy) {
        this.updateConnectionStatus(true);
        console.log('[ConnectionManager] Service is healthy');
      } else {
        this.updateConnectionStatus(false, localizationManager.getString('errors.agentServiceUnavailable'));
        console.warn('[ConnectionManager] Service health check failed');
      }
      
      return isHealthy;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : localizationManager.getString('errors.agentServiceUnavailable');
      this.updateConnectionStatus(false, errorMessage);
      console.error('[ConnectionManager] Health check error:', error);
      return false;
    }
  }

  async getSystemStatus(): Promise<SystemStatus | null> {
    try {
      if (!this.isConnected()) {
        return null;
      }

      const status = await apiClient.getSystemStatus();
      console.log('[ConnectionManager] System status retrieved:', status);
      return status;
    } catch (error) {
      console.error('[ConnectionManager] Failed to get system status:', error);
      return null;
    }
  }

  isConnected(): boolean {
    return this.connectionStatus.isConnected;
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  onStatusChange(callback: (isConnected: boolean, error?: string) => void): void {
    this.on('statusChange', callback);
  }

  dispose(): void {
    console.log('[ConnectionManager] Disposing...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.removeAllListeners();
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = window.setInterval(async () => {
      await this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);

    console.log('[ConnectionManager] Health monitoring started');
  }

  private updateConnectionStatus(isConnected: boolean, error?: string): void {
    const wasConnected = this.connectionStatus.isConnected;
    
    this.connectionStatus = {
      isConnected,
      lastChecked: new Date(),
      error
    };

    console.log(`[ConnectionManager] Connection status update: ${wasConnected} -> ${isConnected}, error: ${error}`);
    
    // Always emit on first initialization (wasConnected will be false initially) 
    // or when status actually changed
    if (wasConnected !== isConnected) {
      console.log(`[ConnectionManager] Emitting status change event: isConnected=${isConnected}, error=${error}`);
      this.emit('statusChange', isConnected, error);
    } else {
      console.log(`[ConnectionManager] Status unchanged, not emitting event`);
    }
  }
}
