import { ElementBase } from './element-base';

/**
 * Encapsulates element drag event arguments
 */
export class ElementDragArgs {
    /**
     * Model element
     */
    public element: ElementBase;

    /**
     * Drag Event
     */
    public event?: DragEvent;

    /**
     * Describes an element drag event
     * @param element - Model element
     * @param event - Mouse drag event
     */
    constructor(element: ElementBase, event?: DragEvent) {
        this.element = element;
        this.event = event;
    }
}
