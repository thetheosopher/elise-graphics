import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { IPointContainer } from '../core/point-container';
import { PointDepth } from '../core/point-depth';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { WindingMode } from '../core/winding-mode';
import { FillFactory } from '../fill/fill-factory';
import { ElementBase } from './element-base';
import { InvalidIndexException } from './invalid-index-exception';

export class PolygonElement extends ElementBase implements IPointContainer {
    /**
     * Polygon element factory function
     * @returns New polygon
     */
    public static create(): PolygonElement {
        const e = new PolygonElement();
        return e;
    }

    /**
     * Computed bounding region
     */
    public bounds?: Region;

    /**
     * True when in point editing mode
     */
    public editPoints: boolean = false;

    /**
     * Point array
     */
    private _points?: Point[];

    /**
     * Fill winding mode
     */
    private _winding?: WindingMode;

    /**
     * Constructs a polygon element
     * @classdesc Renders connected, stroked and/or filled line segments between three or more points
     * @extends Elise.Drawing.ElementBase
     */
    constructor() {
        super('polygon');
        this.addPoint = this.addPoint.bind(this);
        this.getPoints = this.getPoints.bind(this);
        this.setPoints = this.setPoints.bind(this);
        this.setWinding = this.setWinding.bind(this);
    }

    /**
     * Points get accessor as string. Serializes point array into string.
     * @returns Serialized point array
     */
    get points(): string | undefined {
        if (!this._points) {
            return undefined;
        }
        else {
            let result = '';
            let isFirst = true;
            for (const p of this._points) {
                if(isFirst) {
                    isFirst = false;
                }
                else {
                    result += ' ';
                }
                result += p.toString();
            }
            return result;
        }
    }


    /**
     * Points set accessor as string.  Parses serialized string of points.
     * @param pointString - Serialized point array
     */
    set points(pointString: string | undefined) {
        if (!pointString) {
            this._points = undefined;
        }
        else {
            this._points = [];
            const parts = pointString.split(' ');
            for (const part of parts) {
                this._points.push(Point.parse(part));
            }
        }
        this.bounds = undefined;
    }

    /**
     * Sets point array as either serialized points string or Point array.
     * @param pointsSource - Point source as either string of Point array
     * @return This polygon element
     */
    public setPoints(pointsSource: string | Point[]) {
        if (typeof pointsSource === 'string') {
            this.points = pointsSource;
        }
        else {
            this._points = pointsSource.slice(0);
        }
        this.bounds = undefined;
        return this;
    }

    /**
     * Gets point array
     * @return Copy of internal points array
     */
    public getPoints(): Point[] | undefined {
        if (this._points) {
            return this._points.slice(0);
        }
        else {
            return undefined;
        }
    }

    /**
     * Copies properties of another object to this instance
     * @param o - Source object
     */
    public parse(o: any): void {
        super.parse(o);
        if (o.points) {
            this.points = o.points;
        }
        if (o.winding) {
            this.winding = o.winding;
        }
        this.bounds = undefined;
    }

    /**
     * Serializes persistent properties to new object instance
     * @returns Serialized element
     */
    public serialize(): any {
        const o = super.serialize();
        o.size = undefined;
        o.location = undefined;
        if (this.points) {
            o.points = this.points;
        }
        if (this.winding && this.winding === WindingMode.EvenOdd) {
            o.winding = this.winding;
        }
        return o;
    }

    /**
     * Clones this polygon element to a new instance
     * @returns Cloned polygon instance
     */
    public clone() {
        const e: PolygonElement = PolygonElement.create();
        super.cloneTo(e);
        if(this.points) {
            e.points = this.points;
        }
        if(this.winding) {
            e.winding = this.winding;
        }
        return e;
    }

    /**
     * Render polygon to canvas context
     * @param c - Rendering context
     */
    public draw(c: CanvasRenderingContext2D): void {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!this._points) {
            throw new Error(ErrorMessages.NoPointsAreDefined);
        }
        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, bounds.location);
        }
        c.beginPath();
        c.moveTo(this._points[0].x, this._points[0].y);
        const pl = this._points.length;
        for (let i = 1; i < pl; i++) {
            const p: Point = this._points[i];
            c.lineTo(p.x, p.y);
        }
        c.closePath();
        if (FillFactory.setElementFill(c, this)) {
            const loc = bounds.location;
            if (this.fillOffsetX || this.fillOffsetY) {
                const fillOffsetX = this.fillOffsetX || 0;
                const fillOffsetY = this.fillOffsetY || 0;
                c.translate(loc.x + fillOffsetX, loc.y + fillOffsetY);
                if (this._winding && this._winding === WindingMode.EvenOdd) {
                    c.fill('evenodd');
                }
                else {
                    c.fill('nonzero');
                }
                c.translate(-(loc.x + fillOffsetX), -(loc.y + fillOffsetY));
            }
            else {
                c.translate(loc.x, loc.y);
                if (this._winding && this._winding === WindingMode.EvenOdd) {
                    c.fill('evenodd');
                }
                else {
                    c.fill('nonzero');
                }
                c.translate(-loc.x, -loc.y);
            }
        }
        if (model.setElementStroke(c, this)) {
            c.stroke();
        }
        c.restore();
    }

    /**
     * Hit test polygon.  Return true if point is within polygon interior
     * @param c - Rendering context
     * @param tx - X coordinate of point
     * @param ty - Y coordinate of point
     * @returns True if point is within polygon
     */
    public hitTest(c: CanvasRenderingContext2D, tx: number, ty: number): boolean {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!this._points) {
            throw new Error(ErrorMessages.NoPointsAreDefined);
        }
        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, bounds.location);
        }
        c.beginPath();
        c.moveTo(this._points[0].x, this._points[0].y);
        const pl = this._points.length;
        for (let i = 1; i < pl; i++) {
            c.lineTo(this._points[i].x, this._points[i].y);
        }
        c.closePath();
        let hit: boolean;
        if (this._winding && this._winding === WindingMode.EvenOdd) {
            hit = c.isPointInPath(tx, ty, 'evenodd');
        }
        else {
            hit = c.isPointInPath(tx, ty, 'nonzero');
        }
        c.restore();
        return hit;
    }

    /**
     * Returns string description of polygon
     * @returns Description
     */
    public toString(): string {
        if (this._points) {
            return this.type + ' -  ' + this._points.length + ' Points';
        }
        else {
            return this.type + ' -  0 Points';
        }
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

    /**
     * Polygons can be moved using mouse
     * @returns True
     */
    public canMove(): boolean {
        return true;
    }

    /**
     * Polygons can be sized unless in point editing mode
     * @returns True unless in point editing mode
     */
    public canResize(): boolean {
        if (this.editPoints) {
            return false;
        }
        return true;
    }

    /**
     * Polygons can be nudged with the keyboard
     * @returns True
     */
    public canNudge(): boolean {
        return true;
    }

    /**
     * Polygons support individual point movement when in point editing mode
     * @returns True if in point editing mode
     */
    public canMovePoint(): boolean {
        if (this.editPoints) {
            return true;
        }
        return false;
    }

    /**
     * Polygons support point editing mode
     * @returns True
     */
    public canEditPoints(): boolean {
        return true;
    }

    /**
     * Nudges size of polygon by a given width and height offset
     * @param offsetX - X offset
     * @param offsetY - Y offset
     * @returns This polygon
     */
    public nudgeSize(offsetX: number, offsetY: number) {
        if (!this._points) {
            return this;
        }
        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let newWidth = bounds.width + offsetX;
        if (newWidth < 1) {
            newWidth = 1;
        }
        let newHeight = bounds.height + offsetY;
        if (newHeight < 1) {
            newHeight = 1;
        }

        if (this.aspectLocked) {
            if (offsetX === 0) {
                this.scale(newHeight / bounds.height, newHeight / bounds.height);
            }
            else {
                this.scale(newWidth / bounds.width, newWidth / bounds.width);
            }
        }
        else {
            this.scale(newWidth / bounds.width, newHeight / bounds.height);
        }
        this.bounds = undefined;
        return this;
    }

    /**
     * Scales polygon points by given horizontal and vertical scaling factors
     * @param scaleX - Horizontal scaling factor
     * @param scaleY - Vertical scaling factor
     * @returns This polygon element
     */
    public scale(scaleX: number, scaleY: number) {
        if (!this._points) {
            return this;
        }
        const newPoints: Point[] = [];
        const location = this.getLocation();
        if (!location) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        for (const point of this._points) {
            newPoints.push(Point.scale(point, scaleX, scaleY, location.x, location.y));
        }
        this._points = newPoints;
        this.bounds = undefined;
        return this;
    }

    /**
     * Moves this polygon element by the given X and Y offsets
     * @param offsetX - X size offset
     * @param offsetY - Y size offset
     * @returns This polygon
     */
    public translate(offsetX: number, offsetY: number) {
        if (!this._points) {
            return this;
        }
        const newPoints: Point[] = [];
        for (const point of this._points) {
            newPoints.push(Point.translate(point, offsetX, offsetY));
        }
        this._points = newPoints;
        this.bounds = undefined;
        return this;
    }

    /**
     * Computes (if undefined) and returns rectangular bounding region
     * @returns Polygon bounding region
     */
    public getBounds(): Region | undefined {
        if (this.bounds) {
            return this.bounds;
        }
        if (!this._points) {
            return undefined;
        }
        let minX: number | undefined;
        let minY: number | undefined;
        let maxX: number | undefined;
        let maxY: number | undefined;
        for (const p of this._points) {
            if (!minX) {
                minX = p.x;
            }
            else if (p.x < minX) {
                minX = p.x;
            }
            if (!minY) {
                minY = p.y;
            }
            else if (p.y < minY) {
                minY = p.y;
            }
            if (!maxX) {
                maxX = p.x;
            }
            else if (p.x > maxX) {
                maxX = p.x;
            }
            if (!maxY) {
                maxY = p.y;
            }
            else if (p.y > maxY) {
                maxY = p.y;
            }
        }
        if (minX !== undefined && minY !== undefined && maxX !== undefined && maxY !== undefined) {
            this.bounds = new Region(minX, minY, maxX - minX, maxY - minY);
            this._location = new Point(minX, minY);
            this._size = new Size(this.bounds.width, this.bounds.height);
            return this.bounds;
        }
        return undefined;
    }

    /**
     * Moves polygon
     * @param pointSource - New location
     * @returns This polygon
     */
    public setLocation(pointSource: string | Point) {
        if(!this._points) {
            return this;
        }
        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let pt: Point;
        if (typeof pointSource === 'string') {
            pt = Point.parse(pointSource);
        }
        else {
            pt = new Point(pointSource.x, pointSource.y);
        }
        const deltaX = pt.x - bounds.x;
        const deltaY = pt.y - bounds.y;
        this.translate(deltaX, deltaY);
        return this;
    }

    /**
     * Resizes polygon
     * @param size - New size
     * @returns This polygon
     */
    public setSize(sizeSource: string | Size) {
        const size = Size.parse(sizeSource);
        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        const scaleX = size.width / bounds.width;
        const scaleY = size.height / bounds.height;
        this.scale(scaleX, scaleY);
        return this;
    }

    /**
     * Returns number of points in polygon
     * @returns Number of points
     */
    public pointCount(): number {
        if (this._points) {
            return this._points.length;
        }
        return 0;
    }

    /**
     * Returns point at a given index (0 to # points - 1)
     * @param index - Point index (0 to # points - 1)
     * @param depth - Not applicable
     * @returns Requested point
     */
    public getPointAt(index: number, depth?: PointDepth): Point {
        if(!this._points) {
            throw new Error(ErrorMessages.NoPointsAreDefined);
        }
        if (index >= 0 && index < this._points.length) {
            return this._points[index];
        }
        throw new InvalidIndexException(index);
    }

    /**
     * Sets point at a given index (0 to # points - 1)
     * @param index - Point index (0 to # points - 1)
     * @param value - New point value
     * @param depth - Not applicable to this element
     * @returns This polygon
     */
    public setPointAt(index: number, value: Point, depth: PointDepth) {
        if(!this._points) {
            throw new Error(ErrorMessages.NoPointsAreDefined);
        }
        if (index >= 0 && index < this._points.length) {
            this._points[index] = value;
            this.bounds = undefined;
            return this;
        }
        throw new InvalidIndexException(index);
    }

    /**
     * Adds a new point to this polygon
     * @param point - New point
     * @returns This polygon
     */
    public addPoint(point: Point) {
        if (!this._points) {
            this._points = [];
        }
        this._points.push(point);
        this.bounds = undefined;
        return this;
    }

    /**
     * Winding mode get accessor
     * @returns Fill winding mode
     */
    get winding(): WindingMode | undefined {
        return this._winding;
    }

    /**
     * Winding mode set accessor
     * @param newValue - New fill winding mode
     */
    set winding(newValue: WindingMode | undefined) {
        this._winding = newValue;
    }

    /**
     * Sets fill winding mode
     * @param winding - Fill winding mode
     * @returns This polygon
     */
    public setWinding(winding: WindingMode) {
        this._winding = winding;
        return this;
    }
}
