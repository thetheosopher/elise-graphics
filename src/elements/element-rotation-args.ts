import { ElementBase } from './element-base';

/**
 * Describes a temporary element rotation
 */
export class ElementRotationArgs {
    /**
     * Model element
     */
    public element: ElementBase;

    /**
     * Rotation angle in degrees
     */
    public angle: number;

    /**
     * Constructs an element rotation args
     * @param element - Model element
     * @param angle - Rotation angle in degrees
     */
    constructor(element: ElementBase, angle: number) {
        this.element = element;
        this.angle = angle;
    }
}
