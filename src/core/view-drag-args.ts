import { LocationArgs } from './location-args';
import { Point } from './point';

/**
 * Describes a view drag event
 */
export class ViewDragArgs extends LocationArgs {
    /**
     * Drag Event
     */
    public event?: DragEvent;

    /**
     * @param event - Mouse drag event
     * @param location - Location
     */
    constructor(event?: DragEvent, location?: Point) {
        super(location);
        this.event = event;
    }
}
