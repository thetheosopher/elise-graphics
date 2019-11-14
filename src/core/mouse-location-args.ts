import { IMouseEvent } from './mouse-event';
import { MouseEventArgs } from './mouse-event-args';
import { Point } from './point';

/**
 * Represents a mouse location in event handlers
 */
export class MouseLocationArgs extends MouseEventArgs {
    /**
     * Location
     */
    public location: Point;

    /**
     * @param event - Mouse event or simulated event args
     * @param location - Location
     */
    constructor(event: MouseEvent | IMouseEvent, location: Point) {
        super(event);
        this.location = location;
    }
}
