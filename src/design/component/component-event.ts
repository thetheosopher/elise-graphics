import { RequiredDataSourceEvent, type EventHandler } from '../../core/typed-event';

/**
 * Component related event
 */
export class ComponentEvent<T, TSource = any> extends RequiredDataSourceEvent<TSource, T> {
    constructor() {
        super();
        this.copyTo = this.copyTo.bind(this);
    }

    /**
     * Copies listeners of this event to another event
     * @param other - Target component event
     */
    public copyTo(other: ComponentEvent<T, TSource>) {
        this.listeners.forEach((h: EventHandler<TSource, T>) => {
            other.add(h);
        });
    }
}
