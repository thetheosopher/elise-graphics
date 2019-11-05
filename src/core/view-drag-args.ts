import { LocationArgs } from './location-args';
import { Point } from './point';

export class ViewDragArgs extends LocationArgs {
    /**
     * Drag Event
     */
    public event?: DragEvent;

    /**
     * Describes a view drag event
     * @param event - Mouse drag event
     * @param location - Location
     */
    constructor(event?: DragEvent, location?: Point) {
        super(location);
        this.event = event;
    }
}
