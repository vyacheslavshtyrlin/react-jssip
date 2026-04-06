export type Listener<T = unknown> = (payload: T) => void;

type ListenerBuckets<Events extends Record<string, unknown>> = {
  [K in keyof Events]?: Set<Listener<Events[K]>>;
};

type PendingRemoval<Events extends Record<string, unknown>> = {
  event: keyof Events;
  fn: Listener<unknown>;
};

export class JssipEventEmitter<
  Events extends Record<string, unknown> = Record<string, unknown>,
> {
  private listeners: ListenerBuckets<Events> = {};
  private emitting = false;
  private pendingRemovals: PendingRemoval<Events>[] = [];

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    const bucket = this.listeners[event] ?? new Set<Listener<Events[K]>>();
    this.listeners[event] = bucket;
    bucket.add(fn);

    return () => {
      if (this.emitting) {
        this.pendingRemovals.push({ event, fn: fn as Listener<unknown> });
        return;
      }
      const current = this.listeners[event];
      if (!current) return;
      current.delete(fn);
      if (current.size === 0) delete this.listeners[event];
    };
  }

  emit<K extends keyof Events>(event: K, payload?: Events[K]): void {
    const bucket = this.listeners[event];
    if (!bucket || bucket.size === 0) return;

    this.emitting = true;
    for (const listener of bucket) {
      listener(payload as Events[K]);
    }
    this.emitting = false;

    if (this.pendingRemovals.length > 0) {
      for (const { event: e, fn } of this.pendingRemovals) {
        const b = this.listeners[e];
        if (!b) continue;
        b.delete(fn as never);
        if (b.size === 0) delete this.listeners[e];
      }
      this.pendingRemovals = [];
    }
  }
}
