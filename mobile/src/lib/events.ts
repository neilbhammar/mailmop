type EventCallback = (detail?: unknown) => void;

class MailMopEventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, detail?: unknown): void {
    this.listeners.get(event)?.forEach((callback) => callback(detail));
  }
}

export const eventBus = new MailMopEventBus();

export function dispatchAppEvent(event: string, detail?: unknown): void {
  eventBus.emit(event, detail);
}
