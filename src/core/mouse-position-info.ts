export class MousePositionInfo {
    /**
     * Represents the raw source point at which a DOM event occurred
     * @param clientX - Raw x coordinate
     * @param clientY - Raw y coordinate
     */
    constructor(public clientX: number, public clientY: number) {}
}
