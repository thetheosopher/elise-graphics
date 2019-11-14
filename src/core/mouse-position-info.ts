/**
 * Represents the raw source point at which a DOM event occurred
 */
export class MousePositionInfo {
    /**
     * @param clientX - Raw x coordinate
     * @param clientY - Raw y coordinate
     */
    constructor(public clientX: number, public clientY: number) {}
}
