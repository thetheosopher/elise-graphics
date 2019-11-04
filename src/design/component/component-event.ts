import {Component} from './component';

export class ComponentEvent<T> {
    private listeners: Array<(c: Component, data: T) => void> = [];

    /**
     * Component event
     */
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
    public add(listener: (c: Component, data: T) => void) {
        this.listeners.push(listener);
    }

    /**
     * Removes a component event listener
     * @param listener - Listener function to remove (c: Component, data: T)
     */
    public remove(listener: any): void {
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
    public trigger(c: Component, data: T) {
        this.listeners.slice(0).forEach(h => h(c, data));
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
