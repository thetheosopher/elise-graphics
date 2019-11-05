import { IMouseEvent } from './mouse-event';
import { MouseEventArgs } from './mouse-event-args';
import { Point } from './point';

export class MouseLocationArgs extends MouseEventArgs {
    /**
     * Location
     */
    public location: Point;

    /**
     * Describes a mouse location
     * @param event - Mouse event or simulated event args
     * @param location - Location
     */
    constructor(event: MouseEvent | IMouseEvent, location: Point) {
        super(event);
        this.location = location;
    }
}
