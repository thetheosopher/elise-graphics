export class Point {
    public static ORIGIN: Point = new Point(0, 0);

    /**
     * Point factory function
     * @param x - X coordinate
     * @param y - Y coordinate
     * @returns New point
     */
    public static create(x: number, y: number): Point {
        return new Point(x, y);
    }

    /**
     * Parses a point described as a string or clones existing point
     * @param pointSource - Point string description or point to clone
     * @returns Parsed or cloned point object
     */
    public static parse(pointSource: string | Point): Point {
        if (typeof pointSource === 'string') {
            const parts = pointSource.split(',');
            const x = parseFloat(parts[0]);
            const y = parseFloat(parts[1]);
            return new Point(x, y);
        }
        else {
            return new Point(pointSource.x, pointSource.y);
        }
    }

    /**
     * Scales a point by specified scaling factors.  Scaling reference can be optionally specified.
     * @param point - Point to be scaled.
     * @param scaleX - X scaling factor
     * @param scaleY - Y scaling factor
     * @param baseX - Optional x reference point
     * @param baseY - Optional y reference point
     * @returns Scaled point
     */
    public static scale(point: Point, scaleX: number, scaleY: number, baseX?: number, baseY?: number): Point {
        if (baseX !== undefined && baseY !== undefined) {
            return new Point((point.x - baseX) * scaleX + baseX, (point.y - baseY) * scaleY + baseY);
        }
        else {
            return new Point(point.x * scaleX, point.y * scaleY);
        }
    }

    /**
     * Returns a new point from a given point translated by a given offset
     * @param point - Original point
     * @param offsetX - X offset
     * @param offsetY - Y offset
     * @returns Translated point
     */
    public static translate(point: Point, offsetX: number, offsetY: number): Point {
        return new Point(point.x + offsetX, point.y + offsetY);
    }

    private _x: number;
    private _y: number;

    /**
     * Describes a point in 2D space
     * @param x - X Coordinate
     * @param y - Y Coordinate
     */
    constructor(x: number, y: number) {
        this._x = x;
        this._y = y;
        this.clone = this.clone.bind(this);
        this.equals = this.equals.bind(this);
        this.toString = this.toString.bind(this);
    }

    /**
     * Clones this point into a new instance
     * @returns Clone of point
     */
    public clone(): Point {
        return new Point(this.x, this.y);
    }

    /**
     * Returns x coordinate
     * @returns X coordinate
     */
    get x(): number {
        return this._x;
    }

    /**
     * Sets x coordinate
     * @param value - X coordinate
     */
    set x(value: number) {
        this._x = value;
    }

    /**
     * Returns y coordinate
     * @returns Y coordinate
     */
    get y(): number {
        return this._y;
    }

    /**
     * Sets y coordinate
     * @param value - Y coordinate
     */
    set y(value: number) {
        this._y = value;
    }

    /**
     * Compares this point with another for equality
     * @param that - Point to compare with this
     * @returns True if point given matches this
     */
    public equals(that: Point): boolean {
        return that !== null && this.x === that.x && this.y === that.y;
    }

    /**
     * Describes point as a string
     * @returns Description of point
     */
    public toString(): string {
        return this.x.toFixed(0) + ',' + this.y.toFixed(0);
    }
}
