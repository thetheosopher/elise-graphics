import { GradientFillStop } from './gradient-fill-stop';

/**
 * Describes a radial gradient fill
 */
export class RadialGradientFill {
    /**
     * Radial gradient factory function
     * @param center - Gradient center point serialized as string
     * @param focus - Gradient focal point serialized as string
     * @param radiusX - Horizontal radius
     * @param radiusY - Vertical radius
     * @returns New radial gradient fill
     */
    public static create(center: string, focus: string, radiusX: number, radiusY: number) {
        return new RadialGradientFill(center, focus, radiusX, radiusY);
    }

    /**
     * Gradient type tag (radialGradient)
     */
    public type: string;

    /**
     * Gradient center point as string
     */
    public center: string;

    /**
     * Gradient focal point as string
     */
    public focus: string;

    /**
     * Gradient horizontal radius
     */
    public radiusX: number;

    /**
     * Gradient vertical radius
     */
    public radiusY: number;

    /**
     * Array of gradient fill stops
     */
    public stops: GradientFillStop[];

    /**
     * @param center - Gradient center point serialized as string
     * @param focus - Gradient focal point serialized as string
     * @param radiusX - Horizontal radius
     * @param radiuxY - Vertical radius
     */
    constructor(center: string, focus: string, radiusX: number, radiusY: number) {
        this.addFillStop = this.addFillStop.bind(this);
        this.center = center;
        this.focus = focus;
        this.radiusX = radiusX;
        this.radiusY = radiusY;
        this.stops = [];
        this.type = 'radialGradient';
    }

    /**
     * Adds a fill stop to the gradient fill stops array
     * @param color - Fill stop color
     * @param offset - Fill stop offset
     */
    public addFillStop(color: string, offset: number) {
        this.stops.push(new GradientFillStop(color, offset));
    }

    public clone(): RadialGradientFill {
        const rgf = new RadialGradientFill(this.center, this.focus, this.radiusX, this.radiusY);
        for (const stop of this.stops) {
            rgf.addFillStop(stop.color, stop.offset);
        }
        return rgf;
    }
}
