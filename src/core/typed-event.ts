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

/**
 * Generic multicast event dispatcher with source + optional data.
 */
export class SourceEvent<TSource, TData> implements ISourceEvent<TSource, TData> {
    public listeners: Array<OptionalDataEventHandler<TSource, TData>> = [];

    public add(handler: OptionalDataEventHandler<TSource, TData>): void {
        this.listeners.push(handler);
    }

    public remove(handler: OptionalDataEventHandler<TSource, TData>): void {
        const index = this.listeners.indexOf(handler);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    public clear(): void {
        this.listeners.splice(0, this.listeners.length);
    }

    public hasListeners(): boolean {
        return this.listeners.length > 0;
    }

    public trigger(source: TSource, data?: TData): void {
        this.listeners.slice(0).forEach(h => h(source, data));
    }
}

/**
 * Generic multicast event dispatcher with source + required data.
 */
export class RequiredDataSourceEvent<TSource, TData> {
    public listeners: Array<EventHandler<TSource, TData>> = [];

    public add(handler: EventHandler<TSource, TData>): void {
        this.listeners.push(handler);
    }

    public remove(handler: EventHandler<TSource, TData>): void {
        const index = this.listeners.indexOf(handler);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    public clear(): void {
        this.listeners.splice(0, this.listeners.length);
    }

    public hasListeners(): boolean {
        return this.listeners.length > 0;
    }

    public trigger(source: TSource, data: TData): void {
        this.listeners.slice(0).forEach(h => h(source, data));
    }
}

/**
 * Generic multicast event dispatcher with optional data only.
 */
export class SimpleEvent<TData> implements ISimpleEvent<TData> {
    public handlers: Array<(data?: TData) => void> = [];

    public add(handler: (data?: TData) => void): void {
        this.handlers.push(handler);
    }

    public remove(handler: (data?: TData) => void): void {
        const index = this.handlers.indexOf(handler);
        if (index > -1) {
            this.handlers.splice(index, 1);
        }
    }

    public clear(): void {
        this.handlers.splice(0, this.handlers.length);
    }

    public hasListeners(): boolean {
        return this.handlers.length > 0;
    }

    public trigger(data?: TData): void {
        this.handlers.slice(0).forEach(h => h(data));
    }
}
