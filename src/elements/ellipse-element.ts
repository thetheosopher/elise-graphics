import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { FillFactory } from '../fill/fill-factory';
import { ElementBase } from './element-base';

/**
 * Renders stroked and/or filled ellipse element
 */
export class EllipseElement extends ElementBase {
    /**
     * Ellipse element factory function
     * @param x - Center point x coordinate
     * @param y - Center point y coordinate
     * @param rx - Horizontal radius
     * @param ry - Vertical radius
     * @returns New ellipse element
     */
    public static create(x?: number, y?: number, rx?: number, ry?: number) {
        const e = new EllipseElement();
        if (x !== undefined && y !== undefined && rx !== undefined && ry !== undefined) {
            e._center = new Point(x, y);
            e.radiusX = rx;
            e.radiusY = ry;
        }
        else if (x !== undefined && y !== undefined && rx !== undefined) {
            e._center = new Point(x, y);
            e.radiusX = rx;
            e.radiusY = rx;
        }
        return e;
    }

    /**
     * Horizontal radius
     */
    public radiusX?: number;

    /**
     * Vertical radius
     */
    public radiusY?: number;

    /**
     * Center point
     */
    private _center?: Point;

    constructor() {
        super('ellipse');
        this.getCenter = this.getCenter.bind(this);
        this.setCenter = this.setCenter.bind(this);
    }

    /**
     * Center point get accessor as string
     */
    get center(): string | undefined {
        if (!this._center) {
            return undefined;
        }
        else {
            return this._center.toString();
        }
    }

    /**
     * Center point set accessor as string
     * @param newValue - New center point as string
     */
    set center(newValue: string | undefined) {
        if (!newValue) {
            this._center = undefined;
        }
        else {
            this._center = Point.parse(newValue);
        }
    }

    /**
     * Center point get accessor as Point
     * @returns Center point
     */
    public getCenter(): Point | undefined {
        return this._center;
    }

    /**
     * Center point set accessor as string or Point
     * @param pointSource - Center point as string or Point
     */
    public setCenter(pointSource: string | Point | undefined) {
        if (pointSource) {
            this._center = Point.parse(pointSource);
        }
        else {
            this._center = undefined;
        }
    }

    /**
     * Copies properties of another object to this instance
     * @param o - Source object
     */
    public parse(o: any): void {
        super.parse(o);
        if (o.center) {
            this._center = Point.parse(o.center);
        }
        if (o.radiusX !== undefined) {
            this.radiusX = o.radiusX;
        }
        if (o.radiusY !== undefined) {
            this.radiusY = o.radiusY;
        }
    }

    /**
     * Serializes persistent properties to new object instance
     * @returns Serialized element
     */
    public serialize(): any {
        const o = super.serialize();
        if (this._center) {
            o.center = this._center.toString();
        }
        if (this.radiusX !== undefined) {
            o.radiusX = this.radiusX;
        }
        if (this.radiusY !== undefined) {
            o.radiusY = this.radiusY;
        }
        o.location = undefined;
        o.size = undefined;
        return o;
    }

    /**
     * Clones this ellipse element to a new instance
     * @returns Cloned ellipse element
     */
    public clone() {
        const e = EllipseElement.create();
        super.cloneTo(e);
        e.location = undefined;
        e.size = undefined;
        if (this._center) {
            e.center = this._center.toString();
        }
        if (this.radiusX !== undefined) {
            e.radiusX = this.radiusX;
        }
        if (this.radiusY !== undefined) {
            e.radiusY = this.radiusY;
        }
        return e;
    }

    /**
     * Render ellipse element to canvas context
     * @param c - Rendering context
     */
    public draw(c: CanvasRenderingContext2D): void {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (this._center === undefined || this.radiusX === undefined || this.radiusY === undefined) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        c.save();
        if (this.transform) {
            model.setRenderTransform(
                c,
                this.transform,
                new Point(this._center.x - this.radiusX, this._center.y - this.radiusY)
            );
        }
        const scaleY = this.radiusY / this.radiusX;
        c.save();
        c.beginPath();
        c.translate(this._center.x, this._center.y);
        c.scale(1.0, scaleY);
        c.arc(0, 0, this.radiusX, 0, Math.PI * 2, false);
        c.closePath();
        c.restore();
        if (FillFactory.setElementFill(c, this)) {
            const loc = this.getLocation();
            if (loc) {
                if (this.fillOffsetX || this.fillOffsetY) {
                    const fillOffsetX = this.fillOffsetX || 0;
                    const fillOffsetY = this.fillOffsetY || 0;
                    c.translate(loc.x + fillOffsetX, loc.y + fillOffsetY);
                    c.fill();
                    c.translate(-(loc.x + fillOffsetX), -(loc.y + fillOffsetY));
                }
                else {
                    c.translate(loc.x, loc.y);
                    c.fill();
                    c.translate(-loc.x, -loc.y);
                }
            }
        }
        if (model.setElementStroke(c, this)) {
            c.stroke();
        }
        c.restore();
    }

    /**
     * Hit test ellipse element.  Return true if point is within ellipse interior
     * @param c - Rendering context
     * @param tx - X coordinate of point
     * @param ty - Y coordinate of point
     * @returns True if point is within ellipse
     */
    public hitTest(c: CanvasRenderingContext2D, tx: number, ty: number): boolean {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (this._center === undefined || this.radiusX === undefined || this.radiusY === undefined) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        c.save();
        if (this.transform) {
            model.setRenderTransform(
                c,
                this.transform,
                new Point(this._center.x - this.radiusX, this._center.y - this.radiusY)
            );
        }
        const scaleY = this.radiusY / this.radiusX;
        c.save();
        c.beginPath();
        c.translate(this._center.x, this._center.y);
        c.scale(1.0, scaleY);
        c.arc(0, 0, this.radiusX, 0, Math.PI * 2, false);
        c.closePath();
        const hit = c.isPointInPath(tx, ty);
        c.restore();
        c.restore();
        return hit;
    }

    /**
     * Returns string description of ellipse element
     * @returns Description
     */
    public toString(): string {
        if (this._center === undefined || this.radiusX === undefined || this.radiusX === undefined) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        return (
            this.type +
            ' - c(' +
            this._center.x +
            ',' +
            this._center.y +
            '), rx:' +
            this.radiusX +
            ', ry:' +
            this.radiusY
        );
    }

    /**
     * Nudges size of ellipse element by a given width and height offset
     * @param offsetX - Width adjustment
     * @param offsetY - Height adjustment
     * @returns This ellipse element
     */
    public nudgeSize(offsetX: number, offsetY: number) {
        if (!this.radiusX || !this.radiusY) {
            return this;
        }
        let newRadiusX = this.radiusX + offsetX / 2;
        if (newRadiusX < 0) {
            newRadiusX = 0;
        }
        let newRadiusY = this.radiusY + offsetY / 2;
        if (newRadiusY < 0) {
            newRadiusY = 0;
        }
        this.radiusX = newRadiusX;
        this.radiusY = newRadiusY;
        return this;
    }

    /**
     * Scales ellipse element by given horizontal and vertical scaling factors
     * @param scaleX - Horizontal scaling factor
     * @param scaleY - Vertical scaling factor
     * @returns This ellipse element
     */
    public scale(scaleX: number, scaleY: number) {
        if (this.radiusX === undefined || this.radiusY === undefined || this._center === undefined) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        this.radiusX *= scaleX;
        this.radiusY *= scaleY;
        this._center = Point.scale(this._center, scaleX, scaleY);
        return this;
    }

    /**
     * Moves this ellipse element by the given X and Y offsets
     * @param offsetX - X size offset
     * @param offsetY - Y size offset
     * @returns This ellipse element
     */
    public translate(offsetX: number, offsetY: number) {
        if (!this._center) {
            return this;
        }
        this._center = Point.translate(this._center, offsetX, offsetY);
        return this;
    }

    /**
     * Return rectangular bounding region
     * @returns Ellipse element bounding region
     */
    public getBounds(): Region | undefined {
        if (!this.radiusX || !this.radiusY || !this._center) {
            return undefined;
        }
        const x = this._center.x - this.radiusX;
        const y = this._center.y - this.radiusY;
        return new Region(x, y, this.radiusX * 2, this.radiusY * 2);
    }

    /**
     * Moves ellipse element
     * @param point - New location
     * @returns This ellipse element
     */
    public setLocation(point: Point) {
        if (this.radiusX !== undefined && this.radiusY !== undefined) {
            this._center = new Point(point.x + this.radiusX, point.y + this.radiusY);
        }
        return this;
    }

    /**
     * Returns upper left shape coordinate
     */
    public getLocation(): Point {
        if(this.radiusX !== undefined && this.radiusY !== undefined && this._center !== undefined) {
            return new Point(this._center.x - this.radiusX, this._center.y - this.radiusY);
        }
        throw new Error(ErrorMessages.PointsAreInvalid);
    }

    /**
     * Resizes ellipse element
     * @param size - New size
     * @returns This ellipse element
     */
    public setSize(size: Size) {
        if (this.radiusX === undefined || this.radiusY === undefined || this._center === undefined) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        const x = this._center.x - this.radiusX;
        const y = this._center.y - this.radiusY;
        this.radiusX = size.width / 2;
        this.radiusY = size.height / 2;
        this._center = new Point(x + this.radiusX, y + this.radiusY);
        return this;
    }

    /**
     * Can element be stroked
     * @returns Can stroke
     */
    public canStroke(): boolean {
        return true;
    }

    /**
     * Can element be filled
     * @returns Can fill
     */
    public canFill(): boolean {
        return true;
    }
}
