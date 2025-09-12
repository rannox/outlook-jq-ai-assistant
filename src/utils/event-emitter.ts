/**
 * EventEmitter - Simple event emitter implementation for component communication
 * 
 * Provides a lightweight pub/sub pattern for decoupled component communication
 * following modern TypeScript patterns and best practices.
 */

export type EventCallback = (...args: any[]) => void;

export class EventEmitter {
  private listeners: Map<string, EventCallback[]> = new Map();

  /**
   * Add an event listener
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Add a one-time event listener
   */
  once(event: string, callback: EventCallback): void {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper);
      callback(...args);
    };
    this.on(event, onceWrapper);
  }

  /**
   * Remove an event listener
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event
   */
  emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      // Create a copy to avoid issues if listeners are modified during emission
      [...callbacks].forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event, or all listeners if no event specified
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }
}
