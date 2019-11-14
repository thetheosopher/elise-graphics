import { Point } from '../core/point';
import { ElementBase } from './element-base';

/**
 * Represents the tentative location of an element during a move operation
 */
export class MoveLocation {
    /**
     * Element being moved
     */
    public element: ElementBase;

    /**
     * Tentative location of element
     */
    public location: Point;

    /**
     * @param element - Element being sized
     * @param location - Tentative location of element
     */
    constructor(element: ElementBase, location: Point) {
        this.element = element;
        this.location = location;
    }
}
