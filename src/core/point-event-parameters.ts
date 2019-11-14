import { MousePositionInfo } from './mouse-position-info';
import { Point } from './point';
/**
 * Represents a DOM point related event
 */
export class PointEventParameters {
    /**
     * Point at which the event occurred adjusted to model coordinates
     */
    public point?: Point;

    /**
     * DOM source event
     */
    public event?: Event | MousePositionInfo;

    /**
     * @param event - Source DOM event
     * @param point - Model scale adjusted point at which event occurred
     */
    constructor(event: Event | MousePositionInfo, point?: Point) {
        if (event instanceof Event) {
            this.event = event;
        }
        if (point !== undefined) {
            this.point = point;
        }
    }
}
