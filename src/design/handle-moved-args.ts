/**
 * Describes design handle movement
 */
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
     * Mouse X position in canvas coordinates (for rotation)
     */
    public mouseX?: number;

    /**
     * Mouse Y position in canvas coordinates (for rotation)
     */
    public mouseY?: number;

    /**
     * Whether shift key is held (for angle snapping)
     */
    public shiftKey?: boolean;

    /**
     * Represents movement of element handle
     * @param deltaX - x movement
     * @param deltaY - Y movement
     */
    constructor(deltaX: number, deltaY: number) {
        this.deltaX = deltaX;
        this.deltaY = deltaY;
    }
}
