export type Listener<T = any> = (payload: T) => void;

export class EventTargetEmitter<Events extends Record<string, any> = any> {
  private target = new EventTarget();

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    const wrapper = (e: Event) => fn((e as CustomEvent<Events[K]>).detail);
    this.target.addEventListener(event as string, wrapper);
    return () => this.target.removeEventListener(event as string, wrapper);
  }

  emit<K extends keyof Events>(event: K, payload?: Events[K]): void {
    this.target.dispatchEvent(
      new CustomEvent(event as string, { detail: payload })
    );
  }
}
