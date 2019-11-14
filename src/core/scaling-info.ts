/**
 * Represents horizontal(rx) and vertical (ry) scaling factors
 */
export class ScalingInfo {
    /** Horizontal scaling factor */
    public rx: number;

    /** Vertical scaling factor */
    public ry: number;

    constructor() {
        this.rx = 1;
        this.ry = 1;
    }
}
