export class GradientFillStop {

    /**
     * Clones gradient stop collection
     * @param stops Stops to clone
     */
    public static cloneStops(stops: GradientFillStop[]): GradientFillStop[] {
        const cloned = [];
        for (const stop of stops) {
            cloned.push(stop.clone());
        }
        return cloned;
    }

    /**
     * Fill stop factory function
     * @param color - Stop color represented as a string
     * @param offset - Stop offset in the range of 0 to 1
     * @returns New fill stop
     */
    public static create(color: string, offset: number) {
        return new GradientFillStop(color, offset);
    }

    /**
     * Stop color as string
     */
    public color: string;

    /**
     * Stop offset (0-1)
     */
    public offset: number;

    /**
     * Constructs a gradient fill stop
     * @classdev Represents a radial or linear gradient color fill stop
     * @param color - Stop color represented as a string
     * @param offset - Stop offset in the range of 0 to 1
     */
    constructor(color: string, offset: number) {
        this.color = color;
        this.offset = offset;
    }

    public clone(): GradientFillStop {
        const stop = new GradientFillStop(this.color, this.offset);
        return stop;
    }
}
