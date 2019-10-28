import { EliseException } from '../core/elise-exception';
import { Point } from '../core/point';
import { IPointContainer } from '../core/point-container';
import { PointDepth } from '../core/point-depth';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { ElementBase } from './element-base';
import { InvalidIndexException } from './invalid-index-exception';

export class PolylineElement extends ElementBase implements IPointContainer {

    /**
     * Polyline element factory function
     * @returns New polyline
     */
    public static create(): PolylineElement {
        const e = new PolylineElement();
        return e;
    }

    /**
     *  Computed bounding region
     */
    public bounds?: Region;

    /**
     * True when in point editing mode
     */
    public editPoints: boolean = false;

    /**
     * True to smooth points
     */
    public smoothPoints: boolean = false;

    /**
     * Point array
     */
    private _points?: Point[];

    /**
     * Constructs a polyline element
     * @classdesc Renders connected, stroked line segments between two or more points
     * @extends Elise.Drawing.ElementBase
     */
    constructor() {
        super();
        this.type = 'polyline';
        this.setPoints = this.setPoints.bind(this);
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
            const pl = this._points.length;
            for (let i = 0; i < pl; i++) {
                const p = this._points[i];
                if (i > 0) {
                    result += ' ';
                }
                result += p.toString();
            }
            return result;
        }
    }

    /**
     * Points set accessor as string.  Parses serialized string of points.
     * @param newValue - Serialized point array
     */
    set points(newValue: string | undefined) {
        if (!newValue) {
            this._points = undefined;
        }
        else {
            this._points = [];
            const parts = newValue.split(' ');
            const pl = parts.length;
            for (let i = 0; i < pl; i++) {
                this._points.push(Point.parse(parts[i]));
            }
        }
        this.bounds = undefined;
    }

    /**
     * Sets point array as either serialized points string or Point array.
     * @param pointsSource - Point source as either string of Point array
     * @return This polyline element
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
        if (o.smoothPoints) {
            this.smoothPoints = o.smoothPoints;
        }
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
        if (this.smoothPoints) {
            o.smoothPoints = this.smoothPoints;
        }
        return o;
    }

    /**
     * Clones this polyline element to a new instance
     * @returns Cloned polyline instance
     */
    public clone(): PolylineElement {
        const e: PolylineElement = PolylineElement.create();
        super.cloneTo(e);
        if (this.points) {
            e.points = this.points;
        }
        if (this.smoothPoints) {
            e.smoothPoints = this.smoothPoints;
        }
        return e;
    }

    /**
     * Render polyline to canvas context
     * @param c - Rendering context
     */
    public draw(c: CanvasRenderingContext2D): void {
        const model = this.model;
        if(!model) {
            return;
        }
        if(!this._points) {
            return;
        }
        const bounds = this.getBounds();
        if(!bounds) {
            return;
        }
        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, bounds.location);
        }
        c.beginPath();
        if (this.smoothPoints) {
            c.moveTo(this._points[0].x, this._points[0].y);
            let i;
            for (i = 1; i < this._points.length - 2; i++) {
                const xc = (this._points[i].x + this._points[i + 1].x) / 2;
                const yc = (this._points[i].y + this._points[i + 1].y) / 2;
                c.quadraticCurveTo(this._points[i].x, this._points[i].y, xc, yc);
            }
            c.lineCap = 'round';
            c.lineTo(this._points[i + 1].x, this._points[i + 1].y);
            // c.quadraticCurveTo(this._points[i].x, this._points[i].y, this._points[i+1].x, this._points[i+1].y);
        }
        else {
            c.moveTo(this._points[0].x, this._points[0].y);
            const pl = this._points.length;
            for (let i = 1; i < pl; i++) {
                const p = this._points[i];
                c.lineTo(p.x, p.y);
            }
        }
        if (model.setElementStroke(c, this)) {
            c.stroke();
        }
        c.restore();
    }

    /**
     * Hit test polyline.  Return true if point is on polyline
     * @param c - Rendering context
     * @param tx - X coordinate of point
     * @param ty - Y coordinate of point
     * @returns True if point is on polyline
     */
    public hitTest(c: CanvasRenderingContext2D, tx: number, ty: number): boolean {
        let hit = false;
        if(!this.model) {
            return false;
        }
        if(!this._points) {
            return false;
        }
        const bounds = this.getBounds();
        if(!bounds) {
            return false;
        }
        c.save();
        if (this.transform) {
            this.model.setRenderTransform(c, this.transform, bounds.location);
        }
        c.beginPath();
        if (this.smoothPoints) {
            c.moveTo(this._points[0].x, this._points[0].y);
            let i;
            for (i = 1; i < this._points.length - 2; i++) {
                const xc = (this._points[i].x + this._points[i + 1].x) / 2;
                const yc = (this._points[i].y + this._points[i + 1].y) / 2;
                c.quadraticCurveTo(this._points[i].x, this._points[i].y, xc, yc);
            }
            c.quadraticCurveTo(this._points[i].x, this._points[i].y, this._points[i + 1].x, this._points[i + 1].y);
        }
        else {
            c.moveTo(this._points[0].x, this._points[0].y);
            const pl = this._points.length;
            for (let i = 1; i < pl; i++) {
                c.lineTo(this._points[i].x, this._points[i].y);
            }
        }
        hit = c.isPointInPath(tx, ty);
        c.restore();
        return hit;
    }

    /**
     * Returns string description of polyline
     * @returns Description
     */
    public toString(): string {
        if(this._points) {
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
     * Polylines can be moved using mouse
     * @returns True
     */
    public canMove(): boolean {
        return true;
    }

    /**
     * Polylines can be sized unless in point editing mode
     * @returns True unless in point editing mode
     */
    public canResize(): boolean {
        if (this.editPoints) {
            return false;
        }
        return true;
    }

    /**
     * Polylines can be nudged with the keyboard
     * @returns True
     */
    public canNudge(): boolean {
        return true;
    }

    /**
     * Polylines support individual point movement when in point editing mode
     * @returns True if in point editing mode
     */
    public canMovePoint(): boolean {
        if (this.editPoints) {
            return true;
        }
        return false;
    }

    /**
     * Polylines support point editing mode
     * @returns True
     */
    public canEditPoints(): boolean {
        return true;
    }

    /**
     * Nudges size of polylinw by a given width and height offset
     * @param offsetX - X offset
     * @param offsetY - Y offset
     * @returns This polyline
     */
    public nudgeSize(offsetX: number, offsetY: number) {
        const bounds = this.getBounds();
        if(!bounds) {
            return;
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
     * Scales polyline points by given horizontal and vertical scaling factors
     * @param scaleX - Horizontal scaling factor
     * @param scaleY - Vertical scaling factor
     * @returns This polyline element
     */
    public scale(scaleX: number, scaleY: number) {
        if(!this._points) {
            return;
        }
        const newPoints: Point[] = [];
        const pl = this._points.length;
        const location = this.getLocation();
        if(!location) {
            return;
        }
        for (let i = 0; i < pl; i++) {
            newPoints.push(Point.scale(this._points[i], scaleX, scaleY, location.x, location.y));
        }
        this._points = newPoints;
        this.bounds = undefined;
        return this;
    }

    /**
     * Moves this polyline element by the given X and Y offsets
     * @param offsetX - X size offset
     * @param offsetY - Y size offset
     * @returns This polyline
     */
    public translate(offsetX: number, offsetY: number) {
        if(!this._points) {
            return;
        }
        const newPoints: Point[] = [];
        const pl = this._points.length;
        for (let i = 0; i < pl; i++) {
            newPoints.push(Point.translate(this._points[i], offsetX, offsetY));
        }
        this._points = newPoints;
        this.bounds = undefined;
        return this;
    }

    /**
     * Computes (if undefined) and returns rectangular bounding region
     * @returns Polyline bounding region
     */
    public getBounds(): Region | undefined {
        if (this.bounds) {
            return this.bounds;
        }
        if(!this._points) {
            return undefined;
        }
        let minX: number | undefined;
        let minY: number | undefined;
        let maxX: number | undefined;
        let maxY: number | undefined;
        const pl = this._points.length;
        for (let i = 0; i < pl; i++) {
            const p: Point = this._points[i];
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
        if(minX !== undefined && minY !== undefined && maxX !== undefined && maxY !== undefined) {
            this.bounds = new Region(minX, minY, maxX - minX, maxY - minY);
            this._location = new Point(minX, minY);
            this._size = new Size(this.bounds.width, this.bounds.height);
            return this.bounds;
        }
        return undefined;
    }

    /**
     * Moves polyline
     * @param pointSource - New location
     * @returns This polyline
     */
    public setLocation(pointSource: string | Point) {
        const bounds = this.getBounds();
        if(!bounds) {
            return this;
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
     * Resizes polyline
     * @param size - New size
     * @returns This polyline
     */
    public setSize(size: Size): PolylineElement {
        const bounds = this.getBounds();
        if(!bounds) {
            return this;
        }
        const scaleX = size.width / bounds.width;
        const scaleY = size.height / bounds.height;
        this.scale(scaleX, scaleY);
        return this;
    }

    /**
     * Returns number of points in polyline
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
        if (this._points && index < this._points.length) {
            return this._points[index];
        }
        throw new InvalidIndexException(index);
    }

    /**
     * Sets point at a given index (0 to # points - 1)
     * @param index - Point index (0 to # points - 1)
     * @param value - New point value
     * @param depth - Not applicable to this element
     */
    public setPointAt(index: number, value: Point, depth: PointDepth) {
        if (this._points && index < this._points.length) {
            this._points[index] = value;
            this.bounds = undefined;
            return this;
        }
        throw new InvalidIndexException(index);
    }

    /**
     * Adds a new point to this polyline
     * @param point - New point
     * @returns This polyline
     */
    public addPoint(point: Point): PolylineElement {
        if (!this._points) {
            this._points = [];
        }
        this._points.push(point);
        this.bounds = undefined;
        return this;
    }
}
