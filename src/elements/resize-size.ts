import { Size } from '../core/size';
import { ElementBase } from './element-base';

/**
 * Represents the tentative size of an element during a resizing operation
 */
export class ResizeSize {
    /**
     * Element being sized
     */
    public element: ElementBase;

    /**
     * Tentative size of element
     */
    public size: Size;

    /**
     * @param element - Element being sized
     * @param size - Tentative size of element
     */
    constructor(element: ElementBase, size: Size) {
        this.element = element;
        this.size = size;
    }
}
