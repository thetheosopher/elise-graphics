/**
 * Strongly-typed event handler signature
 */
export type EventHandler<TSource, TData> = (source: TSource, data: TData) => void;

/**
 * Strongly-typed event handler signature for events with optional data
 */
export type OptionalDataEventHandler<TSource, TData> = (source: TSource, data?: TData) => void;

/**
 * Common interface for multicast event dispatchers with a source and data parameter
 */
export interface ISourceEvent<TSource, TData> {
    add(handler: OptionalDataEventHandler<TSource, TData>): void;
    remove(handler: OptionalDataEventHandler<TSource, TData>): void;
    clear(): void;
    hasListeners(): boolean;
    trigger(source: TSource, data?: TData): void;
}

/**
 * Common interface for simple multicast event dispatchers (no source parameter)
 */
export interface ISimpleEvent<TData> {
    add(handler: (data?: TData) => void): void;
    remove(handler: (data?: TData) => void): void;
    clear(): void;
    hasListeners(): boolean;
    trigger(data?: TData): void;
}
