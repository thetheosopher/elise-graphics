/**
 * Represents a keyboard event for runtime view event handling.
 */
export class KeyboardEventArgs {
    /**
     * DOM keyboard event.
     */
    public event: KeyboardEvent;

    /**
     * @param event - DOM keyboard event
     */
    constructor(event: KeyboardEvent) {
        this.event = event;
    }
}