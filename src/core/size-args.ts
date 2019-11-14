import { Size } from './size';

/**
 * Represents a size in event handlers
 */
export class SizeArgs {
    /**
     * Size property
     */
    public size: Size;

    /**
     * Describes a size
     * @param size - Size
     */
    constructor(size: Size) {
        this.size = size;
    }
}
