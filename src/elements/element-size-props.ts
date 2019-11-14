import { Size } from '../core/size';
import { ElementBase } from './element-base';

/**
 * Encapsulates element sizing event arguments
 */
export class ElementSizeProps {
    /**
     * Element being sized
     */
    public element: ElementBase;

    /**
     * Element size
     */
    public size: Size;

    /**
     * Constructs an element size props
     * @param element - Element being sized
     * @param size - New element size
     */
    constructor(element: ElementBase, size: Size) {
        this.element = element;
        this.size = size;
    }
}
