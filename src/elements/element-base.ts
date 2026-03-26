import { Color } from '../core/color';
import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { IPointContainer } from '../core/point-container';
import { PointDepth } from '../core/point-depth';
import { Region } from '../core/region';
import type { SerializedData } from '../core/serialization';
import type { ScalingInfo } from '../core/scaling-info';
import { Size } from '../core/size';
import { WindingMode } from '../core/winding-mode';
import { ElementAnimator, ElementTween, type TweenOptions, type TweenPropertyName, type TweenTargetValues } from '../animation/element-tween';
import { LinearGradientFill } from '../fill/linear-gradient-fill';
import { RadialGradientFill } from '../fill/radial-gradient-fill';

export interface ElementModel {
    resourceManager: {
        get(key: string, localeId?: string): unknown;
    };
    add(el: ElementBase): number;
    getSize(): Size | undefined;
    getFillScale(el: ElementBase): ScalingInfo;
    setElementStroke(c: CanvasRenderingContext2D, el: ElementBase): boolean;
    setRenderTransform(c: CanvasRenderingContext2D, transform: string, location: Point): void;
}

interface ElementResourceManager {
    register(key: string): void;
}

export interface ElementClipPath {
    commands: string[];
    winding?: WindingMode;
    transform?: string;
    units?: 'userSpaceOnUse' | 'objectBoundingBox';
}

/**
 * Base class for renderable model elements
 */
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
     * Optional stroke dash pattern
     */
    public strokeDash?: number[];

    /**
     * Stroke line cap style
     */
    public lineCap?: CanvasLineCap;

    /**
     * Stroke line join style
     */
    public lineJoin?: CanvasLineJoin;

    /**
     * Element opacity (0 transparent to 1 opaque)
     */
    public opacity: number = 1;

    /**
     * Should element be rendered and participate in hit testing
     */
    public visible: boolean = true;

    /**
     * Transform property
     */
    public transform?: string;

    /**
     * Optional clip path geometry applied during rendering and export.
     */
    public clipPath?: ElementClipPath;

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
    public model?: ElementModel;

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
    public tag: unknown;

    /**
     * Size
     */
    protected _size?: Size;

    /**
     * Location
     */
    protected _location?: Point;

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
        this.cloneToFluent = this.cloneToFluent.bind(this);
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
        this.parseFluent = this.parseFluent.bind(this);
        this.pointCount = this.pointCount.bind(this);
        this.registerResources = this.registerResources.bind(this);
        this.scale = this.scale.bind(this);
        this.serialize = this.serialize.bind(this);
        this.setFill = this.setFill.bind(this);
        this.setFillOffsetX = this.setFillOffsetX.bind(this);
        this.setFillOffsetY = this.setFillOffsetY.bind(this);
        this.setFillScale = this.setFillScale.bind(this);
        this.setInteractive = this.setInteractive.bind(this);
        this.setClipPath = this.setClipPath.bind(this);
        this.setLocation = this.setLocation.bind(this);
        this.setOpacity = this.setOpacity.bind(this);
        this.setPointAt = this.setPointAt.bind(this);
        this.setSize = this.setSize.bind(this);
        this.setStroke = this.setStroke.bind(this);
        this.setStrokeDash = this.setStrokeDash.bind(this);
        this.setLineCap = this.setLineCap.bind(this);
        this.setLineJoin = this.setLineJoin.bind(this);
        this.setTransform = this.setTransform.bind(this);
        this.setVisible = this.setVisible.bind(this);
        this.applyRenderOpacity = this.applyRenderOpacity.bind(this);
        this.withClipPath = this.withClipPath.bind(this);
        this.isPointWithinClipPath = this.isPointWithinClipPath.bind(this);
        this.animate = this.animate.bind(this);
        this.cancelAnimations = this.cancelAnimations.bind(this);
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
        } else {
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
        } else {
            this._size = Size.parse(sizeString);
        }
    }

    /**
     * Size get accessor as typed value.
     * @returns Size object
     */
    get sizeValue(): Size | undefined {
        return this.getSize();
    }

    /**
     * Size set accessor as typed value.
     * @param size - Size object
     */
    set sizeValue(size: Size | undefined) {
        if (!size) {
            this._size = undefined;
        } else {
            this._size = Size.parse(size);
        }
    }

    /**
     * Location set accessor as string
     * @returns Location as string
     */
    get location(): string | undefined {
        if (!this._location) {
            return undefined;
        } else {
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
        } else {
            this._location = Point.parse(locationString);
        }
    }

    /**
     * Location get accessor as typed value.
     * @returns Location as point
     */
    get locationValue(): Point | undefined {
        return this.getLocation();
    }

    /**
     * Location set accessor as typed value.
     * @param location - Location as point
     */
    set locationValue(location: Point | undefined) {
        if (!location) {
            this._location = undefined;
        } else {
            this._location = Point.parse(location);
        }
    }

    /**
     * Copies properies of another element instance to this instance
     * @param o element
     */
    public parse(o: SerializedData): void {
        if (o.type) {
            this.type = String(o.type);
        }
        if (o.id) {
            this.id = String(o.id);
        }
        if (o.size) {
            this._size = Size.parse(o.size as string);
        }
        if (o.location) {
            this._location = Point.parse(o.location as string);
        }
        if (o.locked) {
            this.locked = o.locked as boolean;
        } else {
            this.locked = false;
        }
        if (o.aspectLocked) {
            this.aspectLocked = o.aspectLocked as boolean;
        } else {
            this.aspectLocked = false;
        }
        if (o.fill) {
            if (typeof o.fill === 'string') {
                this.fill = o.fill;
            } else if ((o.fill as { type?: string }).type === 'linearGradient') {
                const lgr1 = o.fill as LinearGradientFill;
                const lgr2 = new LinearGradientFill(lgr1.start, lgr1.end);
                for (const stop of lgr1.stops) {
                    lgr2.addFillStop(stop.color, stop.offset);
                }
                this.fill = lgr2;
            } else if ((o.fill as { type?: string }).type === 'radialGradient') {
                const rgr1 = o.fill as RadialGradientFill;
                const rgr2 = new RadialGradientFill(rgr1.center, rgr1.focus, rgr1.radiusX, rgr1.radiusY);
                for (const stop of rgr1.stops) {
                    rgr2.addFillStop(stop.color, stop.offset);
                }
                this.fill = rgr2;
            } else {
                this.fill = o.fill as string;
            }
        }
        if (o.fillScale) {
            this.fillScale = o.fillScale as number;
        }
        if (o.fillOffsetX) {
            this.fillOffsetX = o.fillOffsetX as number;
        }
        if (o.fillOffsetY) {
            this.fillOffsetY = o.fillOffsetY as number;
        }
        if (o.stroke) {
            this.stroke = o.stroke as string;
        }
        if (o.strokeDash !== undefined) {
            if (Array.isArray(o.strokeDash)) {
                this.strokeDash = o.strokeDash
                    .map((value) => Number(value))
                    .filter((value) => Number.isFinite(value) && value >= 0);
                if (this.strokeDash.length === 0) {
                    this.strokeDash = undefined;
                }
            }
            else if (typeof o.strokeDash === 'string') {
                const parsedStrokeDash = o.strokeDash
                    .split(/[\s,]+/)
                    .map((value) => Number(value))
                    .filter((value) => Number.isFinite(value) && value >= 0);
                this.strokeDash = parsedStrokeDash.length > 0 ? parsedStrokeDash : undefined;
            }
        }
        if (o.lineCap === 'butt' || o.lineCap === 'round' || o.lineCap === 'square') {
            this.lineCap = o.lineCap;
        }
        if (o.lineJoin === 'bevel' || o.lineJoin === 'miter' || o.lineJoin === 'round') {
            this.lineJoin = o.lineJoin;
        }
        if (o.opacity !== undefined) {
            this.opacity = o.opacity as number;
        }
        if (o.visible !== undefined) {
            this.visible = Boolean(o.visible);
        }
        if (o.transform) {
            this.transform = o.transform as string;
        }
        if (o.clipPath) {
            const clipPathValue = o.clipPath as { commands?: string | string[]; winding?: WindingMode; transform?: string; units?: 'userSpaceOnUse' | 'objectBoundingBox' };
            if (clipPathValue.commands) {
                this.clipPath = {
                    commands: Array.isArray(clipPathValue.commands)
                        ? clipPathValue.commands.slice()
                        : String(clipPathValue.commands).trim().split(/\s+/),
                    winding: clipPathValue.winding,
                    transform: clipPathValue.transform,
                    units: clipPathValue.units,
                };
            }
        }
        if (o.mouseDown) {
            this.mouseDown = o.mouseDown as string;
            this.interactive = true;
        }
        if (o.mouseUp) {
            this.mouseUp = o.mouseUp as string;
            this.interactive = true;
        }
        if (o.mouseEnter) {
            this.mouseEnter = o.mouseEnter as string;
            this.interactive = true;
        }
        if (o.mouseLeave) {
            this.mouseLeave = o.mouseLeave as string;
            this.interactive = true;
        }
        if (o.click) {
            this.click = o.click as string;
            this.interactive = true;
        }
    }

    /**
     * Fluent parse wrapper that returns this instance.
     * @param o - Serialized element data
     * @returns This element
     */
    public parseFluent(o: SerializedData): this {
        this.parse(o);
        return this;
    }

    /**
     * Serializes persistent properties to new object instance
     * @returns Serialized element
     */
    public serialize(): SerializedData {
        const o: SerializedData = { type: this.type };
        if (this.id) {
            o.id = String(this.id);
        }
        if (this.size) {
            o.size = this.size;
        }
        if (this.location) {
            o.location = this.location;
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
        if (this.strokeDash && this.strokeDash.length > 0) {
            o.strokeDash = this.strokeDash.slice();
        }
        if (this.lineCap) {
            o.lineCap = this.lineCap;
        }
        if (this.lineJoin) {
            o.lineJoin = this.lineJoin;
        }
        if (this.opacity !== 1) {
            o.opacity = this.opacity;
        }
        if (!this.visible) {
            o.visible = false;
        }
        if (this.transform) {
            o.transform = this.transform;
        }
        if (this.clipPath) {
            o.clipPath = {
                commands: this.clipPath.commands.join(' '),
                winding: this.clipPath.winding,
                transform: this.clipPath.transform,
                units: this.clipPath.units,
            };
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
    public cloneTo(e: ElementBase): void {
        if (this.type) {
            e.type = this.type;
        }
        if (this.id) {
            e.id = this.id;
        }
        if (this.size) {
            e.size = this.size;
        }
        if (this.location) {
            e.location = this.location;
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
        if (this.strokeDash && this.strokeDash.length > 0) {
            e.strokeDash = this.strokeDash.slice();
        }
        e.lineCap = this.lineCap;
        e.lineJoin = this.lineJoin;
        e.opacity = this.opacity;
        e.visible = this.visible;
        if (this.transform) {
            e.transform = this.transform;
        }
        if (this.clipPath) {
            e.clipPath = {
                commands: this.clipPath.commands.slice(),
                winding: this.clipPath.winding,
                transform: this.clipPath.transform,
                units: this.clipPath.units,
            };
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
     * Fluent clone wrapper that returns the provided target element.
     * @param e - Target element instance
     * @returns Target element
     */
    public cloneToFluent<T extends ElementBase>(e: T): T {
        this.cloneTo(e);
        return e;
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
     * Can element be rotated
     * @returns Can rotate
     */
    public canRotate(): boolean {
        return true;
    }

    /**
     * Register any required resources with the provided resource manager
     * @param rm - Resource manager
     */
    public registerResources(rm: ElementResourceManager): void {
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
        void c;
        return;
    }

    /**
     * Determines if given x/y coordinate is contained within element
     * @param c context
     * @param tx - X coordinate
     * @param ty - Y coordinate
     * @returns True if coordinate is contained within element
     */
    public hitTest(c: CanvasRenderingContext2D, tx: number, ty: number): boolean {
        if (!this.visible) {
            return false;
        }
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
        let hit = c.isPointInPath(tx, ty);
        c.closePath();
        c.restore();
        if (hit) {
            hit = this.isPointWithinClipPath(c, tx, ty);
        }
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
        if (newWidth < 1) {
            newWidth = 1;
        }
        if (newHeight < 1) {
            newHeight = 1;
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
        this._location = Point.scale(this._location, scaleX, scaleY);
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
        let location = this._location;
        if (location === undefined) {
            location = new Point(0, 0);
        }
        return new Region(location.x, location.y, this._size.width, this._size.height);
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
        } else {
            this.stroke = stroke;
        }
        return this;
    }

    /**
     * Sets stroke dash pattern.
     * @param strokeDash - Dash/gap pattern or undefined to clear
     * @returns This element
     */
    public setStrokeDash(strokeDash: number[] | undefined) {
        if (!strokeDash || strokeDash.length === 0) {
            this.strokeDash = undefined;
            return this;
        }
        const normalized = strokeDash
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value >= 0);
        this.strokeDash = normalized.length > 0 ? normalized : undefined;
        return this;
    }

    /**
     * Sets stroke line cap style.
     * @param lineCap - Line cap style
     * @returns This element
     */
    public setLineCap(lineCap: CanvasLineCap | undefined) {
        this.lineCap = lineCap;
        return this;
    }

    /**
     * Sets stroke line join style.
     * @param lineJoin - Line join style
     * @returns This element
     */
    public setLineJoin(lineJoin: CanvasLineJoin | undefined) {
        this.lineJoin = lineJoin;
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
        } else {
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
     * Sets an optional clip path applied to this element.
     * @param clipPath - Clip path description
     * @returns This element
     */
    public setClipPath(clipPath: ElementClipPath | undefined) {
        if (!clipPath) {
            this.clipPath = undefined;
        }
        else {
            this.clipPath = {
                commands: clipPath.commands.slice(),
                winding: clipPath.winding,
                transform: clipPath.transform,
                units: clipPath.units,
            };
        }
        return this;
    }

    /**
     * Sets element opacity in the range of 0-1.
     * @param opacity - Rendering opacity
     * @returns This element
     */
    public setOpacity(opacity: number) {
        if (opacity < 0) {
            this.opacity = 0;
        }
        else if (opacity > 1) {
            this.opacity = 1;
        }
        else {
            this.opacity = opacity;
        }
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
     * Sets element visibility used for rendering and hit testing.
     * @param visible - Visibility flag
     * @returns This element
     */
    public setVisible(visible: boolean) {
        this.visible = visible;
        return this;
    }

    /**
     * Applies this element's opacity to the current canvas state.
     * @param c - Rendering context
     */
    public applyRenderOpacity(c: CanvasRenderingContext2D): void {
        if (this.opacity >= 0 && this.opacity < 1) {
            c.globalAlpha *= this.opacity;
        }
        else if (this.opacity <= 0) {
            c.globalAlpha = 0;
        }
    }

    /**
     * Executes drawing commands within this element's clip path if one exists.
     * @param c - Rendering context
     * @param drawAction - Drawing callback executed within the clip
     */
    protected withClipPath(c: CanvasRenderingContext2D, drawAction: () => void): void {
        if (!this.clipPath || !this.model) {
            drawAction();
            return;
        }

        const bounds = this.getBounds();
        if (!bounds) {
            drawAction();
            return;
        }

        c.save();
        if (this.clipPath.units === 'objectBoundingBox') {
            c.translate(bounds.x, bounds.y);
            c.scale(bounds.width, bounds.height);
        }
        if (this.clipPath.transform) {
            this.model.setRenderTransform(c, this.clipPath.transform, bounds.location);
        }
        c.beginPath();
        ElementBase.tracePathCommands(c, this.clipPath.commands);
        if (this.clipPath.winding === WindingMode.EvenOdd) {
            c.clip('evenodd');
        }
        else {
            c.clip('nonzero');
        }
        drawAction();
        c.restore();
    }

    /**
     * Determines whether a point is inside this element's clip path.
     * @param c - Rendering context
     * @param tx - X coordinate
     * @param ty - Y coordinate
     * @returns True when the point is inside the clip path or no clip exists
     */
    protected isPointWithinClipPath(c: CanvasRenderingContext2D, tx: number, ty: number): boolean {
        if (!this.clipPath || !this.model) {
            return true;
        }

        const bounds = this.getBounds();
        if (!bounds) {
            return true;
        }

        c.save();
        if (this.transform) {
            this.model.setRenderTransform(c, this.transform, bounds.location);
        }
        if (this.clipPath.units === 'objectBoundingBox') {
            c.translate(bounds.x, bounds.y);
            c.scale(bounds.width, bounds.height);
        }
        if (this.clipPath.transform) {
            this.model.setRenderTransform(c, this.clipPath.transform, bounds.location);
        }
        c.beginPath();
        ElementBase.tracePathCommands(c, this.clipPath.commands);
        const hit = this.clipPath.winding === WindingMode.EvenOdd
            ? c.isPointInPath(tx, ty, 'evenodd')
            : c.isPointInPath(tx, ty, 'nonzero');
        c.restore();
        return hit;
    }

    private static tracePathCommands(c: CanvasRenderingContext2D, commands: string[]): void {
        for (const command of commands) {
            if (command.charAt(0) === 'm') {
                const point = Point.parse(command.substring(1));
                c.moveTo(point.x, point.y);
            }
            else if (command.charAt(0) === 'l') {
                const point = Point.parse(command.substring(1));
                c.lineTo(point.x, point.y);
            }
            else if (command.charAt(0) === 'c') {
                const parts = command.substring(1).split(',');
                c.bezierCurveTo(
                    parseFloat(parts[0]),
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3]),
                    parseFloat(parts[4]),
                    parseFloat(parts[5])
                );
            }
            else if (command.charAt(0) === 'z') {
                c.closePath();
            }
        }
    }

    /**
     * Creates and starts a property tween for this element.
     * @param properties - Target property values
     * @param options - Tween options
     * @returns Running tween instance
     */
    public animate(properties: TweenTargetValues, options?: TweenOptions): ElementTween {
        return ElementAnimator.animate(this, properties, options);
    }

    /**
     * Cancels active tweens on this element.
     * @param propertyNames - Optional property subset to cancel
     * @returns This element
     */
    public cancelAnimations(propertyNames?: TweenPropertyName[]) {
        ElementAnimator.cancel(this, propertyNames);
        return this;
    }

    /**
     * Gets current rotation angle in degrees from element transform
     * @returns Rotation angle in degrees, or 0 if no rotation
     */
    public getRotation(): number {
        if (!this.transform) {
            return 0;
        }
        const t = this.transform.trim();
        if (t.length > 7 && t.substring(0, 7).toLowerCase() === 'rotate(') {
            let command = t.substring(7, t.length - 1);
            if (command.indexOf('(') !== -1) {
                command = command.substring(0, command.indexOf('('));
            }
            return parseFloat(command);
        }
        if (t.length > 7 && t.substring(0, 7).toLowerCase() === 'matrix(') {
            let command = t.substring(7, t.length - 1);
            if (command.indexOf('(') !== -1) {
                command = command.substring(0, command.indexOf('('));
            }
            const parts = command.split(',');
            const m11 = parseFloat(parts[0]);
            const m12 = parseFloat(parts[1]);
            return (Math.atan2(m12, m11) * 180) / Math.PI;
        }
        return 0;
    }

    /**
     * Gets rotation center point from element transform
     * @returns Rotation center relative to element position, or undefined if default
     */
    public getRotationCenter(): Point | undefined {
        if (!this.transform) {
            return undefined;
        }
        const t = this.transform.trim();
        if (t.length > 7 && t.substring(0, 7).toLowerCase() === 'rotate(') {
            const command = t.substring(7, t.length - 1);
            if (command.indexOf('(') !== -1) {
                const centerString = command.substring(command.indexOf('(') + 1, command.length - 1);
                return Point.parse(centerString);
            }
        }
        if (t.length > 7 && t.substring(0, 7).toLowerCase() === 'matrix(') {
            const command = t.substring(7, t.length - 1);
            if (command.indexOf('(') !== -1) {
                const centerString = command.substring(command.indexOf('(') + 1, command.length - 1);
                return Point.parse(centerString);
            }
        }
        return undefined;
    }

    /**
     * Returns true if the current transform is a pure rotation (or undefined).
     * Returns false for scale, skew, translate, matrix, or any non-rotation transform.
     */
    public isSimpleRotation(): boolean {
        if (!this.transform) {
            return true;
        }
        const t = this.transform.trim();
        return t.length > 7 && t.substring(0, 7).toLowerCase() === 'rotate(';
    }

    /**
     * Sets rotation angle and optional center point on element transform.
     * Format: rotate(degrees) or rotate(degrees(cx,cy)) to match setRenderTransform.
     * @param degrees - Rotation angle in degrees
     * @param cx - Optional center X relative to element position
     * @param cy - Optional center Y relative to element position
     * @returns This element
     */
    public setRotation(degrees: number, cx?: number, cy?: number) {
        if (cx !== undefined && cy !== undefined) {
            this.transform = `rotate(${degrees}(${cx},${cy}))`;
        } else {
            this.transform = `rotate(${degrees})`;
        }
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
        void index;
        void depth;
        throw new Error(ErrorMessages.NotImplemented);
    }

    /**
     * Sets value of point at given index
     * @param index - Point index
     * @param value - New point value
     * @param depth - Point depth (simple or complex)
     */
    public setPointAt(index: number, value: Point, depth: PointDepth) {
        void index;
        void value;
        void depth;
        throw new Error(ErrorMessages.NotImplemented);
    }

    /**
     * Adds element to the designated parent model.
     * @param model - Parent model
     * @returns This element
     */
    public addTo(model: ElementModel) {
        model.add(this);
        return this;
    }
}
