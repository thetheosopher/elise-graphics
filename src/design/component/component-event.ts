type ComponentEventHandler<T> = (source: any, data: T) => void;

/**
 * Component related event
 */
export class ComponentEvent<T> {
    private listeners: Array<ComponentEventHandler<T>> = [];

    constructor() {
        this.add = this.add.bind(this);
        this.remove = this.remove.bind(this);
        this.clear = this.clear.bind(this);
        this.trigger = this.trigger.bind(this);
        this.hasListeners = this.hasListeners.bind(this);
        this.copyTo = this.copyTo.bind(this);
    }

    /**
     * Adds a component event listener
     * @param listener - Listener function (c: Component, data: T)
     */
    public add(listener: ComponentEventHandler<T>) {
        this.listeners.push(listener);
    }

    /**
     * Removes a component event listener
     * @param listener - Listener function to remove (c: Component, data: T)
     */
    public remove(listener: ComponentEventHandler<T>): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Clears all listeners
     */
    public clear(): void {
        this.listeners.splice(0, this.listeners.length);
    }

    /**
     * Triggers event
     * @param c - Component firing event
     * @param data - Event data
     */
    public trigger(c: unknown, data?: T) {
        this.listeners.slice(0).forEach(h => h(c, data as T));
    }

    /**
     * Returns true if any listeners attached
     * @returns True if any listeners attached to event
     */
    public hasListeners(): boolean {
        if (!this.listeners || this.listeners.length === 0) {
            return false;
        }
        return true;
    }

    /**
     * Copies listeners of this event to another event
     * @param other - Target component event
     */
    public copyTo(other: ComponentEvent<T>) {
        this.listeners.forEach(h => {
            other.add(h);
        });
    }
}
