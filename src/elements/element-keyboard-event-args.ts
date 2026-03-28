import { KeyboardEventArgs } from '../core/keyboard-event-args';
import { ElementBase } from './element-base';

/**
 * Encapsulates an element related keyboard event.
 */
export class ElementKeyboardEventArgs extends KeyboardEventArgs {
    /**
     * Model element.
     */
    public element: ElementBase;

    /**
     * Constructs an element related keyboard event args.
     * @param event - DOM keyboard event
     * @param element - Model element
     */
    constructor(event: KeyboardEvent, element: ElementBase) {
        super(event);
        this.element = element;
    }
}