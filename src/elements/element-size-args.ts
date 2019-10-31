import { Size } from '../core/size';
import { SizeArgs } from '../core/size-args';
import { ElementBase } from './element-base';

export class ElementSizeArgs extends SizeArgs {
    /**
     * Model element
     */
    public element: ElementBase;

    /**
     * Constructs an element size args
     * @classdesc Describes an element size
     * @param element - Model element
     * @param size - Size
     */
    constructor(element: ElementBase, size: Size) {
        super(size);
        this.element = element;
    }
}
