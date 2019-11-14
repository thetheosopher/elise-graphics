import { IMouseEvent } from './mouse-event';

/**
 * Represents a mouse event for event handling
 */
export class MouseEventArgs {
    /**
     * DOM Event or simulated event args
     */
    public event: MouseEvent | IMouseEvent;

    /**
     * @param event - DOM event or simulated event args
     */
    constructor(event: MouseEvent | IMouseEvent) {
        this.event = event;
    }
}
