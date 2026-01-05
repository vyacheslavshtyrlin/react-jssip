export type Listener<T = any> = (payload: T) => void;
export declare class EventTargetEmitter<Events extends Record<string, any> = any> {
    private target;
    on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void;
    emit<K extends keyof Events>(event: K, payload?: Events[K]): void;
}
