import { Color } from '../core/color';
import { ErrorMessages } from '../core/error-messages';
import { Model } from '../core/model';
import { Point } from '../core/point';
import { IPointContainer } from '../core/point-container';
import { PointDepth } from '../core/point-depth';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { LinearGradientFill } from '../fill/linear-gradient-fill';
import { RadialGradientFill } from '../fill/radial-gradient-fill';
import { ResourceManager } from '../resource/resource-manager';

export class ElementBase implements IPointContainer {
    /**
     * Element type tag
     */
    public type: string;

    /**
     * Element ID
     */
    public id?: string;

    /**
     * True if individual points can be edited
     */
    public editPoints: boolean = false;

    /**
     * Should element disallow moving/sizing
     */
    public locked: boolean = false;

    /**
     * Should aspect ratio be maintained during resizing
     */
    public aspectLocked: boolean = false;

    /**
     * Fill property
     */
    public fill?: string | LinearGradientFill | RadialGradientFill;

    /**
     * Fill scaling factor
     */
    public fillScale: number = 1;

    /**
     * Fill X Offset
     */
    public fillOffsetX: number = 0;

    /**
     * Fill Y Offset
     */
    public fillOffsetY: number = 0;

    /**
     * Stroke property
     */
    public stroke?: string;

    /**
     * Transform property
     */
    public transform?: string;

    /**
     * Should element support interaction
     */
    public interactive: boolean = false;

    /**
     * Mouse down command handler tag
     */
    public mouseDown?: string;

    /**
     * Mouse up command handler tag
     */
    public mouseUp?: string;

    /**
     * Mouse enter command handler tag
     */
    public mouseEnter?: string;

    /**
     * Mouse leave command handler tag
     */
    public mouseLeave?: string;

    /**
     * Click command handler tag
     */
    public click?: string;

    /**
     * Timer command handler tag
     */
    public timer?: string;

    /**
     * Owner model
     */
    public model?: Model;

    /**
     * Parent element
     */
    public parent?: ElementBase;

    /**
     * Element fill stack
     */
    public fillStack?: Array<string | LinearGradientFill | RadialGradientFill> = [];

    /**
     * Element stroke stack
     */
    public strokeStack?: string[];

    /**
     * Associated object
     */
    public tag: any;

    /**
     * Size
     */
    protected _size?: Size;

    /**
     * Location
     */
    protected _location?: Point;

    /**
     * Base class for all model elements
     */
    constructor(type: string) {
        this.type = type;

        this.addTo = this.addTo.bind(this);
        this.canEditPoints = this.canEditPoints.bind(this);
        this.canFill = this.canFill.bind(this);
        this.canMove = this.canMove.bind(this);
        this.canMovePoint = this.canMovePoint.bind(this);
        this.canNudge = this.canNudge.bind(this);
        this.canResize = this.canResize.bind(this);
        this.canStroke = this.canStroke.bind(this);
        this.clearBounds = this.clearBounds.bind(this);
        this.clone = this.clone.bind(this);
        this.cloneTo = this.cloneTo.bind(this);
        this.describe = this.describe.bind(this);
        this.draw = this.draw.bind(this);
        this.getBounds = this.getBounds.bind(this);
        this.getLocation = this.getLocation.bind(this);
        this.getPointAt = this.getPointAt.bind(this);
        this.getResourceKeys = this.getResourceKeys.bind(this);
        this.getSize = this.getSize.bind(this);
        this.hitTest = this.hitTest.bind(this);
        this.nudgeSize = this.nudgeSize.bind(this);
        this.parse = this.parse.bind(this);
        this.pointCount = this.pointCount.bind(this);
        this.registerResources = this.registerResources.bind(this);
        this.scale = this.scale.bind(this);
        this.serialize = this.serialize.bind(this);
        this.setFill = this.setFill.bind(this);
        this.setFillOffsetX = this.setFillOffsetX.bind(this);
        this.setFillOffsetY = this.setFillOffsetY.bind(this);
        this.setFillScale = this.setFillScale.bind(this);
        this.setInteractive = this.setInteractive.bind(this);
        this.setLocation = this.setLocation.bind(this);
        this.setPointAt = this.setPointAt.bind(this);
        this.setSize = this.setSize.bind(this);
        this.setStroke = this.setStroke.bind(this);
        this.setTransform = this.setTransform.bind(this);
        this.toString = this.toString.bind(this);
        this.translate = this.translate.bind(this);
    }

    /**
     * Size get accessor as string
     * @returns Size as string
     */
    get size(): string | undefined {
        if (!this._size) {
            return undefined;
        }
        else {
            return this._size.toString();
        }
    }

    /**
     * Size set accessor as string
     * @param sizeString - Size as string
     */
    set size(sizeString: string | undefined) {
        if (!sizeString) {
            this._size = undefined;
        }
        else {
            this._size = Size.parse(sizeString);
        }
    }

    /**
     * Location set accessor as string
     * @returns Location as string
     */
    get location(): string | undefined {
        if (!this._location) {
            return undefined;
        }
        else {
            return this._location.toString();
        }
    }
    /**
     * Location set accessor as string
     * @param locationString - Location as string
     */
    set location(locationString: string | undefined) {
        if (!locationString) {
            this._location = undefined;
        }
        else {
            this._location = Point.parse(locationString);
        }
    }

    /**
     * Copies properies of another element instance to this instance
     * @param Source element
     */
    public parse(o: any): void {
        if (o.type) {
            this.type = String(o.type);
        }
        if (o.id) {
            this.id = String(o.id);
        }
        if (o.size) {
            this._size = Size.parse(o.size);
        }
        if (o.location) {
            this._location = Point.parse(o.location);
        }
        if (o.locked) {
            this.locked = o.locked;
        }
        else {
            this.locked = false;
        }
        if (o.aspectLocked) {
            this.aspectLocked = o.aspectLocked;
        }
        else {
            this.aspectLocked = false;
        }
        if (o.fill) {
            if (typeof o.fill === 'string') {
                this.fill = o.fill;
            }
            else if (o.fill.type instanceof LinearGradientFill) {
                const lgr1 = o.fill as LinearGradientFill;
                const lgr2 = new LinearGradientFill(lgr1.start, lgr1.end);
                for (const stop of lgr1.stops) {
                    lgr2.addFillStop(stop.color, stop.offset);
                }
                this.fill = lgr2;
            }
            else if (o.fill.type instanceof RadialGradientFill) {
                const rgr1 = o.fill as RadialGradientFill;
                const rgr2 = new RadialGradientFill(rgr1.center, rgr1.focus, rgr1.radiusX, rgr1.radiusY);
                for (const stop of rgr1.stops) {
                    rgr2.addFillStop(stop.color, stop.offset);
                }
                this.fill = rgr2;
            }
            else {
                this.fill = o.fill;
            }
        }
        if (o.fillScale) {
            this.fillScale = o.fillScale;
        }
        if (o.fillOffsetX) {
            this.fillOffsetX = o.fillOffsetX;
        }
        if (o.fillOffsetY) {
            this.fillOffsetY = o.fillOffsetY;
        }
        if (o.stroke) {
            this.stroke = o.stroke;
        }
        if (o.transform) {
            this.transform = o.transform;
        }
        if (o.mouseDown) {
            this.mouseDown = o.mouseDown;
            this.interactive = true;
        }
        if (o.mouseUp) {
            this.mouseUp = o.mouseUp;
            this.interactive = true;
        }
        if (o.mouseEnter) {
            this.mouseEnter = o.mouseEnter;
            this.interactive = true;
        }
        if (o.mouseLeave) {
            this.mouseLeave = o.mouseLeave;
            this.interactive = true;
        }
        if (o.click) {
            this.click = o.click;
            this.interactive = true;
        }
    }

    /**
     * Serializes persistent properties to new object instance
     * @returns Serialized element
     */
    public serialize(): any {
        const o: any = {};
        o.type = this.type;
        if (this.id) {
            o.id = String(this.id);
        }
        if (this.size) {
            o.size = this.size.toString();
        }
        if (this.location) {
            o.location = this.location.toString();
        }
        if (this.locked) {
            o.locked = this.locked;
        }
        if (this.aspectLocked) {
            o.aspectLocked = this.aspectLocked;
        }
        if (this.fill) {
            o.fill = this.fill;
        }
        if (this.fillScale && this.fillScale !== 1) {
            o.fillScale = this.fillScale;
        }
        if (this.fillOffsetX) {
            o.fillOffsetX = this.fillOffsetX;
        }
        if (this.fillOffsetY) {
            o.fillOffsetY = this.fillOffsetY;
        }
        if (this.stroke) {
            o.stroke = this.stroke;
        }
        if (this.transform) {
            o.transform = this.transform;
        }
        if (this.mouseDown) {
            o.mouseDown = this.mouseDown;
        }
        if (this.mouseUp) {
            o.mouseUp = this.mouseUp;
        }
        if (this.mouseEnter) {
            o.mouseEnter = this.mouseEnter;
        }
        if (this.mouseLeave) {
            o.mouseLeave = this.mouseLeave;
        }
        if (this.click) {
            o.click = this.click;
        }
        return o;
    }

    /**
     * Clones this element to a new instance
     * @returns Cloned element instance
     */
    public clone() {
        const e: ElementBase = new ElementBase(this.type);
        this.cloneTo(e);
        return e;
    }

    /**
     * Copies properties of this instance to another instance
     * @param e - Target element instance
     */
    public cloneTo(e: any): void {
        if (this.type) {
            e.type = this.type;
        }
        if (this.id) {
            e.id = this.id;
        }
        if (this.size) {
            e.size = this.size.toString();
        }
        if (this.location) {
            e.location = this.location.toString();
        }
        if (this.locked) {
            e.locked = this.locked;
        }
        if (this.aspectLocked) {
            e.aspectLocked = this.aspectLocked;
        }
        if (this.fill) {
            e.fill = this.fill;
        }
        if (this.fillScale && this.fillScale !== 1) {
            e.fillScale = this.fillScale;
        }
        if (this.fillOffsetX) {
            e.fillOffsetX = this.fillOffsetX;
        }
        if (this.fillOffsetY) {
            e.fillOffsetY = this.fillOffsetY;
        }
        if (this.stroke) {
            e.stroke = this.stroke;
        }
        if (this.transform) {
            e.transform = this.transform;
        }
        if (this.mouseDown) {
            e.mouseDown = this.mouseDown;
        }
        if (this.mouseUp) {
            e.mouseUp = this.mouseUp;
        }
        if (this.mouseEnter) {
            e.mouseEnter = this.mouseEnter;
        }
        if (this.mouseLeave) {
            e.mouseLeave = this.mouseLeave;
        }
        if (this.click) {
            e.click = this.click;
        }
    }

    /**
     * Returns string description of element
     * @returns Element description
     */
    public toString(): string {
        let description = this.type;
        if (this._location) {
            description += ` - (${this._location.x},${this._location.y})`;
        }
        if (this._size) {
            description += ` [${this._size.width}x${this._size.height}]`;
        }
        return description;
    }

    /**
     * Returns detailed string description
     * @returns Detailed description
     */
    public describe(): string {
        let desc = this.toString();
        if (this.stroke) {
            desc = this.stroke.toString() + ' stroked ' + desc;
        }
        if (this.fill) {
            desc = this.fill.toString() + ' filled ' + desc;
        }
        return desc;
    }

    /**
     * Can element be stroked
     * @returns Can stroke
     */
    public canStroke(): boolean {
        return false;
    }

    /**
     * Can element be filled
     * @returns Can fill
     */
    public canFill(): boolean {
        return false;
    }

    /**
     * Can element be moved
     * @returns Can move
     */
    public canMove(): boolean {
        return true;
    }

    /**
     * Can element be resized
     * @returns Can resize
     */
    public canResize(): boolean {
        return true;
    }

    /**
     * Can element be nudged with keyboard commands
     * @returns Can nudge
     */
    public canNudge(): boolean {
        return true;
    }

    /**
     * Can individual element points be moved
     * @returns Can move point
     */
    public canMovePoint(): boolean {
        return false;
    }

    /**
     * Can element points be edited
     * @returns Can edit points
     */
    public canEditPoints(): boolean {
        return false;
    }

    /**
     * Register any required resources with the provided resource manager
     * @param rm - Resource manager
     */
    public registerResources(rm: ResourceManager): void {
        let key: string;

        // If an image or model fill, then register referenced resource
        if (this.fill && typeof this.fill === 'string') {
            const fillString: string = this.fill as string;
            if (
                fillString.toLowerCase().substring(0, 6) === 'image(' ||
                fillString.toLowerCase().substring(0, 6) === 'model('
            ) {
                key = fillString.substring(6, fillString.length - 1);
                if (key.indexOf(';') !== -1) {
                    const parts = key.split(';');
                    key = parts[1];
                }
                rm.register(key);
            }
        }
    }

    /**
     * Returns list of keys referenced by element
     */
    public getResourceKeys() {
        const keys = [];
        let key: string;

        // If an image or model fill, then register referenced resource
        if (this.fill && typeof this.fill === 'string') {
            const fillString: string = this.fill as string;
            if (
                fillString.toLowerCase().substring(0, 6) === 'image(' ||
                fillString.toLowerCase().substring(0, 6) === 'model('
            ) {
                key = fillString.substring(6, fillString.length - 1);
                if (key.indexOf(';') !== -1) {
                    const parts = key.split(';');
                    key = parts[1];
                }
                keys.push(key);
            }
        }
        return keys;
    }

    /**
     * Render the element to the HTML5 rendering context provided
     * @param c - Rendering context
     */
    public draw(c: CanvasRenderingContext2D) {
        return;
    }

    /**
     * Determines if given x/y coordinate is contained within element
     * @param Rendering context
     * @param tx - X coordinate
     * @param ty - Y coordinate
     * @returns True if coordinate is contained within element
     */
    public hitTest(c: CanvasRenderingContext2D, tx: number, ty: number): boolean {
        if (this._size === undefined) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if (this._location === undefined) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        if (this.model === undefined) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const model = this.model;
        const x = this._location.x;
        const y = this._location.y;
        const w = this._size.width;
        const h = this._size.height;
        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, this._location);
        }
        c.beginPath();
        c.rect(x, y, w, h);
        const hit = c.isPointInPath(tx, ty);
        c.closePath();
        c.restore();
        return hit;
    }

    /**
     * Resizes element by a given width and height amount
     * @param widthDelta - Width adjustment
     * @param heightDelta Height adjustment
     * @returns Resized element
     */
    public nudgeSize(widthDelta: number, heightDelta: number) {
        if (this._size === undefined) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        let newWidth = this._size.width + widthDelta;
        let newHeight = this._size.height + heightDelta;
        if (newWidth < 0) {
            newWidth = 0;
        }
        if (newHeight < 0) {
            newHeight = 0;
        }
        this._size = new Size(newWidth, newHeight);
        return this;
    }

    /**
     * Moves element by a given horizontal and vertical offset
     * @param offsetX - Horizontal offset
     * @param offsetY - Vertical offset
     * @returns Relocated element
     */
    public translate(offsetX: number, offsetY: number) {
        if (this._location === undefined) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        this._location = new Point(this._location.x + offsetX, this._location.y + offsetY);
        return this;
    }

    /**
     * Scales element by a given horizontal and vertical scaling factor
     * @param scaleX - Horizontal scaling factor
     * @param scaleY - Vertical scaling factor
     * @returns Scaled element
     */
    public scale(scaleX: number, scaleY: number) {
        if (this._size === undefined) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if (this._location === undefined) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        this._size = Size.scale(this._size, scaleX, scaleY);
        this._location = Point.scale(this._location, scaleY, scaleY);
        return this;
    }

    /**
     * Element bounding region. Returns rectangular region that completely encloses the element
     * @returns Rectangular element bounding region
     */
    public getBounds(): Region | undefined {
        if (this._size === undefined) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if (this._location === undefined) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        return new Region(this._location.x, this._location.y, this._size.width, this._size.height);
    }

    /**
     * Clears the interal bounds of the associated complex element, forcing
     * the bounds to be recomputed on the next request.
     */
    public clearBounds() {
        this._location = undefined;
        this._size = undefined;
    }

    /**
     * Location get accessor
     */
    public getLocation(): Point | undefined {
        if (this._location === undefined) {
            const bounds = this.getBounds();
            if (bounds) {
                this._location = bounds.location;
            }
        }
        return this._location;
    }

    /**
     * Location set accessor.  Sets location value as string or Point
     * @param pointSource - Location as Point object or string
     * @returns This element
     */
    public setLocation(pointSource: string | Point) {
        this._location = Point.parse(pointSource);
        return this;
    }

    /**
     * Size get accessor
     * @returns Size of element bounding region
     */
    public getSize(): Size | undefined {
        if (this._size === undefined) {
            const bounds = this.getBounds();
            if (bounds) {
                this._size = bounds.size;
            }
        }
        return this._size;
    }

    /**
     * Size set accessor. Sets size of element as string or Size object
     * @param sizeSource - Size as Size object or string
     * @returns This element
     */
    public setSize(sizeSource: string | Size) {
        this._size = Size.parse(sizeSource);
        return this;
    }

    /**
     * Sets stroke used to draw element outline
     * @param stroke - Stroke definition
     * @returns This element
     */
    public setStroke(stroke: string | Color | undefined) {
        if (stroke instanceof Color) {
            this.stroke = stroke.toString();
        }
        else {
            this.stroke = stroke;
        }
        return this;
    }

    /**
     * Sets fill used to fill element interior
     * @param fill - Fill definition
     * @returns This element
     */
    public setFill(fill: string | Color | LinearGradientFill | RadialGradientFill | undefined) {
        if (fill instanceof Color) {
            this.fill = fill.toString();
        }
        else {
            this.fill = fill;
        }
        return this;
    }

    /**
     * Sets fill scale used to alter fill rendering
     * @param scale - Fill scale - Default 1
     * @returns This element
     */
    public setFillScale(scale: number) {
        this.fillScale = scale;
        return this;
    }

    /**
     * Sets fill X offset used to alter fill rendering
     * @param offset - Fill X Offset
     * @returns This element
     */
    public setFillOffsetX(offset: number) {
        this.fillOffsetX = offset;
        return this;
    }

    /**
     * Sets fill Y offset used to alter fill rendering
     * @param offset - Fill Y Offset
     * @returns This element
     */
    public setFillOffsetY(offset: number) {
        this.fillOffsetY = offset;
        return this;
    }

    /**
     * Sets user interface interactivity for element
     * @param interactive - Interactive flag value
     * @returns This element
     */
    public setInteractive(interactive: boolean) {
        this.interactive = interactive;
        return this;
    }

    /**
     * Sets affine transform used for rendering element
     * @param transform - Transform definition
     * @returns This element
     */
    public setTransform(transform: string) {
        this.transform = transform;
        return this;
    }

    /**
     * Retrieves number of points in element
     * @returns Number of points
     */
    public pointCount(): number {
        throw new Error(ErrorMessages.NotImplemented);
    }

    /**
     * Gets value of point at given index
     * @param index - Point index
     * @param depth - Point depth (simple or complex)
     * @returns Point at index
     */
    public getPointAt(index: number, depth?: PointDepth): Point {
        throw new Error(ErrorMessages.NotImplemented);
    }

    /**
     * Sets value of point at given index
     * @param index - Point index
     * @param value - New point value
     * @param depth - Point depth (simple or complex)
     */
    public setPointAt(index: number, value: Point, depth: PointDepth) {
        throw new Error(ErrorMessages.NotImplemented);
    }

    /**
     * Adds element to the designated parent model.
     * @param model - Parent model
     * @returns This element
     */
    public addTo(model: Model) {
        model.add(this);
        return this;
    }
}
