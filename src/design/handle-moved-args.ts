export class HandleMovedArgs {
    /**
     * Horizontal (x) movement
     */
    public deltaX: number;

    /**
     * Vertical (y) movement
     */
    public deltaY: number;

    /**
     * Constructs a HandleMovedArgs
     * @classdesc Represents movement of element handle
     * @param deltaX - x movement
     * @param deltaY - Y movement
     */
    constructor(deltaX: number, deltaY: number) {
        this.deltaX = deltaX;
        this.deltaY = deltaY;
    }
}
