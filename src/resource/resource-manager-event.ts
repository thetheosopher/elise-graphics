import type { ISourceEvent, OptionalDataEventHandler } from '../core/typed-event';

/**
 * Resource manager event
 */
export class ResourceManagerEvent<T> implements ISourceEvent<unknown, T> {
    public listeners: Array<OptionalDataEventHandler<unknown, T>> = [];

    constructor() {
        this.add = this.add.bind(this);
        this.remove = this.remove.bind(this);
        this.clear = this.clear.bind(this);
        this.trigger = this.trigger.bind(this);
        this.hasListeners = this.hasListeners.bind(this);
    }

    /**
     * Add a new event listener
     * @param listener - Resource manager event listener (resourceManager: ResourceManager, data?: T)
     */
    public add(listener: OptionalDataEventHandler<unknown, T>) {
        this.listeners.push(listener);
    }

    /**
     * Removes an event listener
     * @param listener - Resource manager event listener (resourceManager: ResourceManager, data?: T)
     */
    public remove(listener: OptionalDataEventHandler<unknown, T>) {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Clears all event listeners
     */
    public clear() {
        this.listeners = [];
    }

    /**
     * Triggers event and calls listeners
     * @param rm - Resource manager
     * @param data - Event data
     */
    public trigger(rm: unknown, data?: T) {
        this.listeners.slice(0).forEach(h => h(rm, data));
    }

    /**
     * Returns true if any registered listeners
     * @returns True if any registered listeners
     */
    public hasListeners() {
        return this.listeners.length > 0;
    }
}
