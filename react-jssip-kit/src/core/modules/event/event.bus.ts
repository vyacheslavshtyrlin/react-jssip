type EventHandler<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<EventHandler<unknown>>>();

  on<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>
  ): () => void {
    const set = this.listeners.get(event) ?? new Set<EventHandler<unknown>>();
    set.add(handler as EventHandler<unknown>);
    this.listeners.set(event, set);

    return () => {
      const existing = this.listeners.get(event);
      if (!existing) return;
      existing.delete(handler as EventHandler<unknown>);
      if (existing.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((handler) => {
      (handler as EventHandler<Events[K]>)(payload);
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}
