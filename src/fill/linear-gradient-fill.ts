import { GradientFillStop } from './gradient-fill-stop';

/**
 * Describes  a linear gradient fill
 */
export class LinearGradientFill {
    /**
     * Linear gradient factory function
     * @param start - Start point serialized as a string
     * @param end - End point serialized as a string
     * @returns New linear gradient fill
     */
    public static create(start: string, end: string) {
        return new LinearGradientFill(start, end);
    }

    /**
     * Gradient type tag (linearGradient)
     */
    public type: string;

    /**
     * Gradient start point as string
     */
    public start: string;

    /**
     * Gradient end point as string
     */
    public end: string;

    /**
     * Array of gradient fill stops
     */
    public stops: GradientFillStop[];

    /**
     * @param start - Start point serialized as a string
     * @param end - End point serialized as a string
     */
    constructor(start: string, end: string) {
        this.addFillStop = this.addFillStop.bind(this);
        this.start = start;
        this.end = end;
        this.stops = [];
        this.type = 'linearGradient';
        this.toString = this.toString.bind(this);
    }

    public clone(): LinearGradientFill {
        const lgr = new LinearGradientFill(this.start, this.end);
        for (const stop of this.stops) {
            lgr.addFillStop(stop.color, stop.offset);
        }
        return lgr;
    }

    /**
     * Adds a fill stop to the gradient fill stops array
     * @param color - Fill stop color
     * @param offset - Fill stop offset
     */
    public addFillStop(color: string, offset: number) {
        this.stops.push(new GradientFillStop(color, offset));
    }

    public toString(): string {
        return 'linear gradient';
    }
}
