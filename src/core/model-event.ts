import type { ISourceEvent, OptionalDataEventHandler } from './typed-event';

/**
 * Generic, multicast model related event dispatcher
 */
export class ModelEvent<T> implements ISourceEvent<unknown, T> {
    private listeners: Array<OptionalDataEventHandler<unknown, T>> = [];

    constructor() {
        this.add = this.add.bind(this);
        this.remove = this.remove.bind(this);
        this.clear = this.clear.bind(this);
        this.trigger = this.trigger.bind(this);
    }

    /**
     * Add a listener
     * @param listener - Listener function (c: Model, data?: T)
     */
    public add(listener: OptionalDataEventHandler<unknown, T>) {
        this.listeners.push(listener);
    }

    /**
     * Removes a listener
     * @param listener - Listener function (c: Model, data?: T)
     */
    public remove(listener: OptionalDataEventHandler<unknown, T>) {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Clears listeners
     */
    public clear() {
        this.listeners = [];
    }

    /**
     * Returns true if any listeners
     */
    public hasListeners(): boolean {
        return this.listeners.length > 0;
    }

    /**
     * Trigger event
     *  @param model - Event model
     *  @param data data
     */
    public trigger(model: unknown, data?: T) {
        this.listeners.slice(0).forEach(h => h(model, data));
    }
}
