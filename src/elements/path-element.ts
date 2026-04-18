import { ErrorMessages } from '../core/error-messages';
import type { SerializedData } from '../core/serialization';
import { Point } from '../core/point';
import { IPointContainer } from '../core/point-container';
import { PointDepth } from '../core/point-depth';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { WindingMode } from '../core/winding-mode';
import { FillFactory } from '../fill/fill-factory';
import { ElementBase } from './element-base';
import { InvalidIndexException } from './invalid-index-exception';
import { clearGeometryCache } from './path-geometry';
import {
    getPathCommandPointAt,
    getPathCommandPointCount,
    iteratePathCommands,
    normalizePathCommands,
    parsePathCommandString,
    scalePathCommands,
    setPathCommandPointAt,
    tracePathCommands,
    translatePathCommands,
} from './path-command-utils';

/**
 * Renders series of stroked and/or filled drawing commands
 */
export class PathElement extends ElementBase implements IPointContainer {
    /**
     * Path element factory function
     * @returns New path element
     */
    public static create(): PathElement {
        const e = new PathElement();
        return e;
    }

    /**
     * Creates a path element from standard SVG path data.
     * Quadratic commands are preserved as first-class persisted commands,
     * while shorthand and arc commands are still expanded as needed.
     * @param pathData - SVG path data string
     * @returns New path element
     */
    public static fromSVGPath(pathData: string): PathElement {
        const e = new PathElement();
        e._commands = parsePathCommandString(pathData, false);
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
     * Drawing commands array
     */
    private _commands?: string[];

    /**
     * Fill winding mode
     */
    private _winding?: WindingMode;

    constructor() {
        super('path');
        this.add = this.add.bind(this);
        this.getCommands = this.getCommands.bind(this);
        this.setWinding = this.setWinding.bind(this);
        this.setCommands = this.setCommands.bind(this);
    }

    /**
     * Commands get accessor as string. Serializes command array into string.
     * @returns Serialized command array
     */
    get commands(): string | undefined {
        if (!this._commands) {
            return undefined;
        }
        else {
            return this._commands.join(' ');
        }
    }

    /**
     * Commands set accessor as string.  Parses serialized string of commands.
     * @param commandString - Serialized command array
     */
    set commands(commandString: string | undefined) {
        if (commandString && commandString.trim().length > 0) {
            this._commands = parsePathCommandString(commandString, true);
        }
        else {
            this._commands = undefined;
        }
        this.bounds = undefined;
    }

    /**
     * Sets commands as serialized command string
     * @param commandString - Serialized command string
     * @returns This path element
     */
    public setCommands(commandString: string) {
        this.commands = commandString;
        this.bounds = undefined;
        return this;
    }

    /**
     * Commands get access as command string []
     * @returns Drawing command array
     */
    public getCommands(): string[] | undefined {
        return this._commands;
    }

    /**
     * Copies properties of another object to this instance
     * @param o - Source object
     */
    public parse(o: SerializedData): void {
        super.parse(o);
        if (o.commands) {
            const commandString: string = o.commands as string;
            this._commands = parsePathCommandString(commandString, true);
        }
        if (o.winding) {
            this.winding = o.winding as WindingMode;
        }
        this.bounds = undefined;
    }

    /**
     * Serializes persistent properties to new object instance
     * @returns Serialized element
     */
    public serialize(): SerializedData {
        const o = super.serialize();
        o.size = undefined;
        o.location = undefined;
        if (this._commands) {
            o.commands = this._commands.join(' ');
        }
        if (this.winding && this.winding === WindingMode.EvenOdd) {
            o.winding = this.winding;
        }
        return o;
    }

    /**
     * Clones this path element to a new instance
     * @returns Cloned path element
     */
    public clone() {
        const e: PathElement = PathElement.create();
        super.cloneTo(e);
        if (this._commands && this._commands.length > 0) {
            e.commands = this._commands.join(' ');
        }
        e.winding = this.winding;
        return e;
    }

    /**
     * Render path element to canvas context
     * @param c - Rendering context
     */
    public draw(c: CanvasRenderingContext2D): void {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!this._commands) {
            throw new Error(ErrorMessages.NoCommandsAreDefined);
        }
        const commands = this._commands;
        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, bounds.location);
        }
        this.applyRenderOpacity(c);
        this.withClipPath(c, () => {
            c.beginPath();
            tracePathCommands(c, commands);
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
        });
        c.restore();
    }

    /**
     * Hit test path element.  Return true if point is within path element interior
     * @param c - Rendering context
     * @param tx - X coordinate of point
     * @param ty - Y coordinate of point
     * @returns True if point is within path element interior
     */
    public hitTest(c: CanvasRenderingContext2D, tx: number, ty: number): boolean {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!this._commands) {
            return false;
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
        tracePathCommands(c, this._commands);
        let hit: boolean;
        if (this._winding && this._winding === WindingMode.EvenOdd) {
            hit = c.isPointInPath(tx, ty, 'evenodd');
        }
        else {
            hit = c.isPointInPath(tx, ty, 'nonzero');
        }
        c.restore();
        if (!hit) {
            return false;
        }
        return this.isPointWithinClipPath(c, tx, ty);
    }

    /**
     * Returns string description of path element
     * @returns Description
     */
    public toString(): string {
        if (this._commands) {
            return this.type + ' -  ' + this._commands.length + ' commands';
        }
        else {
            return this.type + ' -  0 commands';
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
     * Path elements can be moved using mouse
     * @returns True
     */
    public canMove(): boolean {
        return true;
    }

    /**
     * Path elements can be sized unless in point editing mode
     * @returns True unless in point editing mode
     */
    public canResize(): boolean {
        if (this.editPoints) {
            return false;
        }
        return true;
    }

    /**
     * Path elements can be nudged with the keyboard
     * @returns True
     */
    public canNudge(): boolean {
        return true;
    }

    /**
     * Path elements support individual point movement when in point editing mode
     * @returns True if in point editing mode
     */
    public canMovePoint(): boolean {
        if (this.editPoints) {
            return true;
        }
        return false;
    }

    /**
     * Path elements support point editing mode
     * @returns True
     */
    public canEditPoints(): boolean {
        return true;
    }

    /**
     * Nudges size of path element by a given width and height offset
     * @param offsetX - Width adjustment
     * @param offsetY - Height adjustment
     * @returns This path element
     */
    public nudgeSize(offsetX: number, offsetY: number) {
        if (!this._commands) {
            return this;
        }
        const b = this.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let newWidth = b.width + offsetX;
        if (newWidth < 1) {
            newWidth = 1;
        }
        let newHeight = b.height + offsetY;
        if (newHeight < 1) {
            newHeight = 1;
        }
        const safeScaleX = b.width !== 0 ? newWidth / b.width : 1;
        const safeScaleY = b.height !== 0 ? newHeight / b.height : 1;
        if (this.aspectLocked) {
            if (offsetX === 0) {
                this.scale(safeScaleY, safeScaleY);
            }
            else {
                this.scale(safeScaleX, safeScaleX);
            }
        }
        else {
            this.scale(safeScaleX, safeScaleY);
        }
        this.bounds = undefined;
        return this;
    }

    /**
     * Scales path element command points by given horizontal and vertical scaling factors
     * @param scaleX - Horizontal scaling factor
     * @param scaleY - Vertical scaling factor
     * @returns This path element
     */
    public scale(scaleX: number, scaleY: number) {
        if (!this._commands) {
            return this;
        }
        const location = this.getLocation();
        if (!location) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        this._commands = scalePathCommands(this._commands, scaleX, scaleY, location.x, location.y);
        this.bounds = undefined;
        return this;
    }

    /**
     * Moves this path element by the given X and Y offsets
     * @param offsetX - X size offset
     * @param offsetY - Y size offset
     * @returns This path element
     */
    public translate(offsetX: number, offsetY: number) {
        if (!this._commands) {
            return this;
        }
        this._commands = translatePathCommands(this._commands, offsetX, offsetY);
        this.bounds = undefined;
        return this;
    }

    /**
     * Computes (if undefined) and returns rectangular bounding region
     * @returns Path element bounding region
     */
    public getBounds(): Region | undefined {
        if (this.bounds) {
            return this.bounds;
        }
        if (!this._commands) {
            return undefined;
        }
        let minX: number | undefined;
        let minY: number | undefined;
        let maxX: number | undefined;
        let maxY: number | undefined;
        for (const command of normalizePathCommands(this._commands)) {
            let p: Point | undefined;
            if (command.charAt(0) === 'm') {
                p = Point.parse(command.substring(1, command.length));
            }
            else if (command.charAt(0) === 'l') {
                p = Point.parse(command.substring(1, command.length));
            }
            else if (command.charAt(0) === 'c') {
                const parts = command.substring(1, command.length).split(',');
                for (let ci = 0; ci < 6; ci += 2) {
                    const cx = parseFloat(parts[ci]);
                    const cy = parseFloat(parts[ci + 1]);
                    if (minX === undefined || cx < minX) { minX = cx; }
                    if (minY === undefined || cy < minY) { minY = cy; }
                    if (maxX === undefined || cx > maxX) { maxX = cx; }
                    if (maxY === undefined || cy > maxY) { maxY = cy; }
                }
            }
            else if (command.charAt(0) === 'q' || command.charAt(0) === 'Q') {
                const parts = command.substring(1, command.length).split(',');
                for (let qi = 0; qi < 4; qi += 2) {
                    const qx = parseFloat(parts[qi]);
                    const qy = parseFloat(parts[qi + 1]);
                    if (minX === undefined || qx < minX) { minX = qx; }
                    if (minY === undefined || qy < minY) { minY = qy; }
                    if (maxX === undefined || qx > maxX) { maxX = qx; }
                    if (maxY === undefined || qy > maxY) { maxY = qy; }
                }
            }
            if (p) {
                if (minX === undefined || p.x < minX) {
                    minX = p.x;
                }
                if (minY === undefined || p.y < minY) {
                    minY = p.y;
                }
                if (maxX === undefined || p.x > maxX) {
                    maxX = p.x;
                }
                if (maxY === undefined || p.y > maxY) {
                    maxY = p.y;
                }
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
     * Moves path element
     * @param pointSource - New location
     * @returns This path element
     */
    public setLocation(pointSource: string | Point) {
        if (!this._commands) {
            return this;
        }
        const b = this.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let pt: Point;
        if (typeof pointSource === 'string') {
            pt = Point.parse(pointSource);
        }
        else {
            pt = new Point(pointSource.x, pointSource.y);
        }
        const deltaX = pt.x - b.x;
        const deltaY = pt.y - b.y;
        this.translate(deltaX, deltaY);
        return this;
    }

    /**
     * Resizes path element
     * @param sizeSource - New size
     * @returns This path element
     */
    public setSize(sizeSource: Size | string) {
        const size = Size.parse(sizeSource);
        const b = this.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        const scaleX = b.width !== 0 ? size.width / b.width : 1;
        const scaleY = b.height !== 0 ? size.height / b.height : 1;
        this.scale(scaleX, scaleY);
        return this;
    }

    /**
     * Returns number of points in path element
     * @returns Number of points
     */
    public pointCount(): number {
        return this._commands ? getPathCommandPointCount(this._commands) : 0;
    }

    /**
     * Returns point at a given index (0 to # points - 1)
     * @param index - Point index (0 to # points - 1)
     * @param depth - Point depth
     * @returns Requested point
     */
    public getPointAt(index: number, depth?: PointDepth): Point {
        if (!this._commands) {
            throw new InvalidIndexException(index);
        }
        return getPathCommandPointAt(this._commands, index, depth);
    }

    /**
     * Sets point at a given index (0 to # points - 1)
     * @param index - Point index (0 to # points - 1)
     * @param value - New point value
     * @param depth - Point depth
     */
    public setPointAt(index: number, value: Point, depth: PointDepth) {
        if (!this._commands) {
            throw new Error(ErrorMessages.NoCommandsAreDefined);
        }
        setPathCommandPointAt(this._commands, index, value, depth);
        clearGeometryCache(this._commands);
        this.bounds = undefined;
        return this;
    }

    /**
     * Adds a new command to this path element
     * @param command - New drawing command
     * @returns This path element
     */
    public add(command: string) {
        const existingCommands = this.commands;
        if (existingCommands) {
            this._commands = parsePathCommandString(existingCommands + ' ' + command, true);
        }
        else {
            this._commands = parsePathCommandString(command, true);
        }
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
     * @returns This path element
     */
    public setWinding(winding: WindingMode) {
        this._winding = winding;
        return this;
    }
}
