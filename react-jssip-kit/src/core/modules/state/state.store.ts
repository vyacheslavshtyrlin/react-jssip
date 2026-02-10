export class StateStore<TState> {
  private state: TState;
  private listeners = new Set<() => void>();

  constructor(initialState: TState) {
    this.state = initialState;
  }

  getState = (): TState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setState(next: TState): void {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  patchState(patch: Partial<TState>): void {
    this.state = { ...(this.state as object), ...(patch as object) } as TState;
    this.listeners.forEach((listener) => listener());
  }
}
