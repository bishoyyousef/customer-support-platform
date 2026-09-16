type EventListener = (data: any) => void;

class DemoEventEmitter {
  private listeners: { [event: string]: EventListener[] } = {};

  on(event: string, fn: EventListener): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(fn);
  }

  off(event: string, fn: EventListener): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== fn);
  }

  emit(event: string, data?: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(fn => fn(data));
    }
  }
}

export const demoEventEmitter = new DemoEventEmitter();
