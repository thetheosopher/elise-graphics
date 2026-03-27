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
        e._commands = PathElement.parseCommandString(pathData, false);
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
            this._commands = PathElement.parseCommandString(commandString, true);
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
            this._commands = PathElement.parseCommandString(commandString, true);
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
            for (const command of commands) {
                if (command.charAt(0) === 'm') {
                    const point = Point.parse(command.substring(1, command.length));
                    c.moveTo(point.x, point.y);
                }
                else if (command.charAt(0) === 'l') {
                    const point = Point.parse(command.substring(1, command.length));
                    c.lineTo(point.x, point.y);
                }
                else if (command.charAt(0) === 'c') {
                    const parts = command.substring(1, command.length).split(',');
                    c.bezierCurveTo(
                        parseFloat(parts[0]),
                        parseFloat(parts[1]),
                        parseFloat(parts[2]),
                        parseFloat(parts[3]),
                        parseFloat(parts[4]),
                        parseFloat(parts[5])
                    );
                }
                else if (command.charAt(0) === 'q' || command.charAt(0) === 'Q') {
                    const parts = command.substring(1, command.length).split(',');
                    c.quadraticCurveTo(
                        parseFloat(parts[0]),
                        parseFloat(parts[1]),
                        parseFloat(parts[2]),
                        parseFloat(parts[3])
                    );
                }
                else if (command.charAt(0) === 'z') {
                    c.closePath();
                }
            }
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
        for (const command of this._commands) {
            if (command.charAt(0) === 'm') {
                const point = Point.parse(command.substring(1, command.length));
                c.moveTo(point.x, point.y);
            }
            else if (command.charAt(0) === 'l') {
                const point = Point.parse(command.substring(1, command.length));
                c.lineTo(point.x, point.y);
            }
            else if (command.charAt(0) === 'c') {
                const parts = command.substring(1, command.length).split(',');
                c.bezierCurveTo(
                    parseFloat(parts[0]),
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3]),
                    parseFloat(parts[4]),
                    parseFloat(parts[5])
                );
            }
            else if (command.charAt(0) === 'q' || command.charAt(0) === 'Q') {
                const parts = command.substring(1, command.length).split(',');
                c.quadraticCurveTo(
                    parseFloat(parts[0]),
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3])
                );
            }
            else if (command.charAt(0) === 'z') {
                c.closePath();
            }
        }
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
        const newCommands: string[] = [];
        for (const command of this._commands) {
            if (command.charAt(0) === 'm') {
                newCommands.push(
                    'm' +
                        Point.scale(
                            Point.parse(command.substring(1, command.length)),
                            scaleX,
                            scaleY,
                            location.x,
                            location.y
                        ).toString()
                );
            }
            else if (command.charAt(0) === 'l') {
                newCommands.push(
                    'l' +
                        Point.scale(
                            Point.parse(command.substring(1, command.length)),
                            scaleX,
                            scaleY,
                            location.x,
                            location.y
                        ).toString()
                );
            }
            else if (command.charAt(0) === 'c') {
                const parts = command.substring(1, command.length).split(',');
                const cp1 = Point.scale(
                    new Point(parseFloat(parts[0]), parseFloat(parts[1])),
                    scaleX,
                    scaleY,
                    location.x,
                    location.y
                );
                const cp2 = Point.scale(
                    new Point(parseFloat(parts[2]), parseFloat(parts[3])),
                    scaleX,
                    scaleY,
                    location.x,
                    location.y
                );
                const endPoint = Point.scale(
                    new Point(parseFloat(parts[4]), parseFloat(parts[5])),
                    scaleX,
                    scaleY,
                    location.x,
                    location.y
                );
                newCommands.push('c' + cp1.toString() + ',' + cp2.toString() + ',' + endPoint.toString());
            }
            else if (command.charAt(0) === 'q' || command.charAt(0) === 'Q') {
                const parts = command.substring(1, command.length).split(',');
                const controlPoint = Point.scale(
                    new Point(parseFloat(parts[0]), parseFloat(parts[1])),
                    scaleX,
                    scaleY,
                    location.x,
                    location.y
                );
                const endPoint = Point.scale(
                    new Point(parseFloat(parts[2]), parseFloat(parts[3])),
                    scaleX,
                    scaleY,
                    location.x,
                    location.y
                );
                newCommands.push('Q' + controlPoint.toString() + ',' + endPoint.toString());
            }
            else {
                newCommands.push(command);
            }
        }
        this._commands = newCommands;
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
        const newCommands: string[] = [];
        for (const command of this._commands) {
            if (command.charAt(0) === 'm') {
                newCommands.push(
                    'm' +
                        Point.translate(Point.parse(command.substring(1, command.length)), offsetX, offsetY).toString()
                );
            }
            else if (command.charAt(0) === 'l') {
                newCommands.push(
                    'l' +
                        Point.translate(Point.parse(command.substring(1, command.length)), offsetX, offsetY).toString()
                );
            }
            else if (command.charAt(0) === 'c') {
                const parts = command.substring(1, command.length).split(',');
                const cp1 = Point.translate(new Point(parseFloat(parts[0]), parseFloat(parts[1])), offsetX, offsetY);
                const cp2 = Point.translate(new Point(parseFloat(parts[2]), parseFloat(parts[3])), offsetX, offsetY);
                const endPoint = Point.translate(
                    new Point(parseFloat(parts[4]), parseFloat(parts[5])),
                    offsetX,
                    offsetY
                );
                newCommands.push('c' + cp1.toString() + ',' + cp2.toString() + ',' + endPoint.toString());
            }
            else if (command.charAt(0) === 'q' || command.charAt(0) === 'Q') {
                const parts = command.substring(1, command.length).split(',');
                const controlPoint = Point.translate(new Point(parseFloat(parts[0]), parseFloat(parts[1])), offsetX, offsetY);
                const endPoint = Point.translate(
                    new Point(parseFloat(parts[2]), parseFloat(parts[3])),
                    offsetX,
                    offsetY
                );
                newCommands.push('Q' + controlPoint.toString() + ',' + endPoint.toString());
            }
            else {
                newCommands.push(command);
            }
        }
        this._commands = newCommands;
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
        for (const command of this._commands) {
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
        let pointCount = 0;
        if (this._commands) {
            for (const command of this._commands) {
                if (command.charAt(0) === 'm') {
                    pointCount++;
                }
                else if (command.charAt(0) === 'l') {
                    pointCount++;
                }
                else if (command.charAt(0) === 'c') {
                    pointCount += 3;
                }
                else if (command.charAt(0) === 'q' || command.charAt(0) === 'Q') {
                    pointCount += 2;
                }
            }
        }
        return pointCount;
    }

    /**
     * Returns point at a given index (0 to # points - 1)
     * @param index - Point index (0 to # points - 1)
     * @param depth - Point depth
     * @returns Requested point
     */
    public getPointAt(index: number, depth?: PointDepth): Point {
        let current = -1;
        if (!this._commands) {
            throw new InvalidIndexException(index);
        }
        for (const command of this._commands) {
            if (command.charAt(0) === 'm') {
                current++;
                if (current === index) {
                    return Point.parse(command.substring(1, command.length));
                }
            }
            else if (command.charAt(0) === 'l') {
                current++;
                if (current === index) {
                    return Point.parse(command.substring(1, command.length));
                }
            }
            else if (command.charAt(0) === 'c') {
                const parts = command.substring(1, command.length).split(',');
                const cp1 = new Point(parseFloat(parts[0]), parseFloat(parts[1]));
                const cp2 = new Point(parseFloat(parts[2]), parseFloat(parts[3]));
                const endPoint = new Point(parseFloat(parts[4]), parseFloat(parts[5]));
                current++;
                if (current === index) {
                    return endPoint;
                }
                if (depth === PointDepth.Full) {
                    current++;
                    if (current === index) {
                        return cp1;
                    }
                    current++;
                    if (current === index) {
                        return cp2;
                    }
                }
            }
            else if (command.charAt(0) === 'q' || command.charAt(0) === 'Q') {
                const parts = command.substring(1, command.length).split(',');
                const controlPoint = new Point(parseFloat(parts[0]), parseFloat(parts[1]));
                const endPoint = new Point(parseFloat(parts[2]), parseFloat(parts[3]));
                current++;
                if (current === index) {
                    return endPoint;
                }
                if (depth === PointDepth.Full) {
                    current++;
                    if (current === index) {
                        return controlPoint;
                    }
                }
            }
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
        let current = -1;
        if (!this._commands) {
            throw new Error(ErrorMessages.NoCommandsAreDefined);
        }
        const cl = this._commands.length;
        for (let i = 0; i < cl; i++) {
            const command = this._commands[i];
            if (command.charAt(0) === 'm') {
                current++;
                if (current === index) {
                    this._commands[i] = 'm' + value.toString();
                    this.bounds = undefined;
                    return this;
                }
            }
            else if (command.charAt(0) === 'l') {
                current++;
                if (current === index) {
                    this._commands[i] = 'l' + value.toString();
                    this.bounds = undefined;
                    return this;
                }
            }
            else if (command.charAt(0) === 'c') {
                const parts = command.substring(1, command.length).split(',');
                let cp1 = new Point(parseFloat(parts[0]), parseFloat(parts[1]));
                let cp2 = new Point(parseFloat(parts[2]), parseFloat(parts[3]));
                let endPoint = new Point(parseFloat(parts[4]), parseFloat(parts[5]));
                current++;
                if (current === index) {
                    endPoint = value;
                    this._commands[i] = 'c' + cp1.toString() + ',' + cp2.toString() + ',' + endPoint.toString();
                    this.bounds = undefined;
                    return this;
                }
                if (depth === PointDepth.Full) {
                    current++;
                    if (current === index) {
                        cp1 = value;
                        this._commands[i] = 'c' + cp1.toString() + ',' + cp2.toString() + ',' + endPoint.toString();
                        this.bounds = undefined;
                        return this;
                    }
                    current++;
                    if (current === index) {
                        cp2 = value;
                        this._commands[i] = 'c' + cp1.toString() + ',' + cp2.toString() + ',' + endPoint.toString();
                        this.bounds = undefined;
                        return this;
                    }
                }
            }
            else if (command.charAt(0) === 'q' || command.charAt(0) === 'Q') {
                const parts = command.substring(1, command.length).split(',');
                let controlPoint = new Point(parseFloat(parts[0]), parseFloat(parts[1]));
                let endPoint = new Point(parseFloat(parts[2]), parseFloat(parts[3]));
                current++;
                if (current === index) {
                    endPoint = value;
                    this._commands[i] = 'Q' + controlPoint.toString() + ',' + endPoint.toString();
                    this.bounds = undefined;
                    return this;
                }
                if (depth === PointDepth.Full) {
                    current++;
                    if (current === index) {
                        controlPoint = value;
                        this._commands[i] = 'Q' + controlPoint.toString() + ',' + endPoint.toString();
                        this.bounds = undefined;
                        return this;
                    }
                }
            }
        }
        throw new InvalidIndexException(index);
    }

    /**
     * Adds a new command to this path element
     * @param command - New drawing command
     * @returns This path element
     */
    public add(command: string) {
        const existingCommands = this.commands;
        if (existingCommands) {
            this._commands = PathElement.parseCommandString(existingCommands + ' ' + command, true);
        }
        else {
            this._commands = PathElement.parseCommandString(command, true);
        }
        this.bounds = undefined;
        return this;
    }

    private static parseCommandString(commandString: string, legacyLowercaseAbsolute: boolean): string[] {
        const trimmed = commandString.trim();
        if (trimmed.length === 0) {
            return [];
        }

        const tokens = trimmed.match(/[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g);
        if (!tokens || tokens.length === 0) {
            throw new Error('Path string is invalid.');
        }

        const commands: string[] = [];
        let index = 0;
        let command = '';
        let current = Point.Origin;
        let subpathStart = Point.Origin;
        let lastCubicControl: Point | undefined;
        let lastQuadraticControl: Point | undefined;
        let previousCommand = '';

        const isCommandToken = (value: string): boolean => /^[AaCcHhLlMmQqSsTtVvZz]$/.test(value);
        const hasNextNumber = (): boolean => index < tokens.length && !isCommandToken(tokens[index]);
        const readNumber = (): number => {
            if (index >= tokens.length) {
                throw new Error('Path string is invalid.');
            }
            const token = tokens[index++];
            if (isCommandToken(token)) {
                throw new Error('Path string is invalid.');
            }
            const value = parseFloat(token);
            if (isNaN(value)) {
                throw new Error('Path string is invalid.');
            }
            return value;
        };
        const readPoint = (relative: boolean): Point => {
            const x = readNumber();
            const y = readNumber();
            if (relative) {
                return new Point(current.x + x, current.y + y);
            }
            return new Point(x, y);
        };
        const pushMove = (point: Point): void => {
            commands.push('m' + point.toString());
            current = point;
            subpathStart = point;
            lastCubicControl = undefined;
            lastQuadraticControl = undefined;
        };
        const pushLine = (point: Point): void => {
            commands.push('l' + point.toString());
            current = point;
            lastCubicControl = undefined;
            lastQuadraticControl = undefined;
        };
        const pushCubic = (cp1: Point, cp2: Point, endPoint: Point): void => {
            commands.push('c' + cp1.toString() + ',' + cp2.toString() + ',' + endPoint.toString());
            current = endPoint;
            lastCubicControl = cp2;
            lastQuadraticControl = undefined;
        };
        const reflectControl = (control: Point | undefined): Point => {
            if (!control) {
                return current;
            }
            return new Point(current.x * 2 - control.x, current.y * 2 - control.y);
        };
        const vectorAngle = (ux: number, uy: number, vx: number, vy: number): number => {
            return Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
        };
        const arcToCubics = (
            startPoint: Point,
            radiusX: number,
            radiusY: number,
            xAxisRotation: number,
            largeArc: boolean,
            sweep: boolean,
            endPoint: Point,
        ): Array<[Point, Point, Point]> => {
            let rx = Math.abs(radiusX);
            let ry = Math.abs(radiusY);
            if ((startPoint.x === endPoint.x && startPoint.y === endPoint.y) || rx === 0 || ry === 0) {
                return [];
            }

            const phi = (xAxisRotation * Math.PI) / 180;
            const cosPhi = Math.cos(phi);
            const sinPhi = Math.sin(phi);
            const dx = (startPoint.x - endPoint.x) / 2;
            const dy = (startPoint.y - endPoint.y) / 2;
            const x1p = cosPhi * dx + sinPhi * dy;
            const y1p = -sinPhi * dx + cosPhi * dy;
            const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);

            if (lambda > 1) {
                const scale = Math.sqrt(lambda);
                rx *= scale;
                ry *= scale;
            }

            const rx2 = rx * rx;
            const ry2 = ry * ry;
            const x1p2 = x1p * x1p;
            const y1p2 = y1p * y1p;
            const numerator = rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2;
            const denominator = rx2 * y1p2 + ry2 * x1p2;
            const factor = denominator === 0 ? 0 : Math.sqrt(Math.max(0, numerator / denominator));
            const sign = largeArc === sweep ? -1 : 1;
            const cxp = sign * factor * ((rx * y1p) / ry);
            const cyp = sign * factor * ((-ry * x1p) / rx);
            const centerX = cosPhi * cxp - sinPhi * cyp + (startPoint.x + endPoint.x) / 2;
            const centerY = sinPhi * cxp + cosPhi * cyp + (startPoint.y + endPoint.y) / 2;
            const startVectorX = (x1p - cxp) / rx;
            const startVectorY = (y1p - cyp) / ry;
            const endVectorX = (-x1p - cxp) / rx;
            const endVectorY = (-y1p - cyp) / ry;
            let startAngle = vectorAngle(1, 0, startVectorX, startVectorY);
            let sweepAngle = vectorAngle(startVectorX, startVectorY, endVectorX, endVectorY);

            if (!sweep && sweepAngle > 0) {
                sweepAngle -= Math.PI * 2;
            }
            else if (sweep && sweepAngle < 0) {
                sweepAngle += Math.PI * 2;
            }

            const segmentCount = Math.ceil(Math.abs(sweepAngle) / (Math.PI / 2));
            const segmentAngle = sweepAngle / segmentCount;
            const curves: Array<[Point, Point, Point]> = [];

            for (let segment = 0; segment < segmentCount; segment++) {
                const theta1 = startAngle;
                const theta2 = theta1 + segmentAngle;
                const delta = theta2 - theta1;
                const alpha = (4 / 3) * Math.tan(delta / 4);
                const cosTheta1 = Math.cos(theta1);
                const sinTheta1 = Math.sin(theta1);
                const cosTheta2 = Math.cos(theta2);
                const sinTheta2 = Math.sin(theta2);

                const p1 = new Point(
                    centerX + rx * cosPhi * cosTheta1 - ry * sinPhi * sinTheta1,
                    centerY + rx * sinPhi * cosTheta1 + ry * cosPhi * sinTheta1,
                );
                const p2 = new Point(
                    centerX + rx * cosPhi * cosTheta2 - ry * sinPhi * sinTheta2,
                    centerY + rx * sinPhi * cosTheta2 + ry * cosPhi * sinTheta2,
                );
                const d1 = new Point(
                    -rx * cosPhi * sinTheta1 - ry * sinPhi * cosTheta1,
                    -rx * sinPhi * sinTheta1 + ry * cosPhi * cosTheta1,
                );
                const d2 = new Point(
                    -rx * cosPhi * sinTheta2 - ry * sinPhi * cosTheta2,
                    -rx * sinPhi * sinTheta2 + ry * cosPhi * cosTheta2,
                );
                const cp1 = new Point(p1.x + alpha * d1.x, p1.y + alpha * d1.y);
                const cp2 = new Point(p2.x - alpha * d2.x, p2.y - alpha * d2.y);
                curves.push([cp1, cp2, p2]);
                startAngle = theta2;
            }

            return curves;
        };

        while (index < tokens.length) {
            if (isCommandToken(tokens[index])) {
                command = tokens[index++];
            }
            else if (!command) {
                throw new Error('Path string is invalid.');
            }

            switch (command) {
                case 'M':
                case 'm': {
                    const relative = command === 'm' && !legacyLowercaseAbsolute;
                    let isFirstMove = true;
                    while (hasNextNumber()) {
                        const point = readPoint(relative);
                        if (isFirstMove) {
                            pushMove(point);
                            isFirstMove = false;
                        }
                        else {
                            pushLine(point);
                        }
                    }
                    break;
                }
                case 'L':
                case 'l': {
                    const relative = command === 'l' && !legacyLowercaseAbsolute;
                    while (hasNextNumber()) {
                        pushLine(readPoint(relative));
                    }
                    break;
                }
                case 'H':
                case 'h': {
                    const relative = command === 'h';
                    while (hasNextNumber()) {
                        const x = readNumber();
                        pushLine(new Point(relative ? current.x + x : x, current.y));
                    }
                    break;
                }
                case 'V':
                case 'v': {
                    const relative = command === 'v';
                    while (hasNextNumber()) {
                        const y = readNumber();
                        pushLine(new Point(current.x, relative ? current.y + y : y));
                    }
                    break;
                }
                case 'C':
                case 'c': {
                    const relative = command === 'c' && !legacyLowercaseAbsolute;
                    while (hasNextNumber()) {
                        const cp1 = readPoint(relative);
                        const cp2 = readPoint(relative);
                        const endPoint = readPoint(relative);
                        pushCubic(cp1, cp2, endPoint);
                    }
                    break;
                }
                case 'S':
                case 's': {
                    const relative = command === 's' && !legacyLowercaseAbsolute;
                    while (hasNextNumber()) {
                        const cp1 = previousCommand.match(/[CcSs]/) ? reflectControl(lastCubicControl) : current;
                        const cp2 = readPoint(relative);
                        const endPoint = readPoint(relative);
                        pushCubic(cp1, cp2, endPoint);
                    }
                    break;
                }
                case 'Q':
                case 'q': {
                    const relative = command === 'q' && !legacyLowercaseAbsolute;
                    while (hasNextNumber()) {
                        const controlPoint = readPoint(relative);
                        const endPoint = readPoint(relative);
                        commands.push('Q' + controlPoint.toString() + ',' + endPoint.toString());
                        current = endPoint;
                        lastQuadraticControl = controlPoint;
                        lastCubicControl = undefined;
                    }
                    break;
                }
                case 'T':
                case 't': {
                    const relative = command === 't' && !legacyLowercaseAbsolute;
                    while (hasNextNumber()) {
                        const controlPoint = previousCommand.match(/[QqTt]/) ? reflectControl(lastQuadraticControl) : current;
                        const endPoint = readPoint(relative);
                        commands.push('Q' + controlPoint.toString() + ',' + endPoint.toString());
                        current = endPoint;
                        lastQuadraticControl = controlPoint;
                        lastCubicControl = undefined;
                    }
                    break;
                }
                case 'A':
                case 'a': {
                    const relative = command === 'a';
                    while (hasNextNumber()) {
                        const rx = readNumber();
                        const ry = readNumber();
                        const rotation = readNumber();
                        const largeArc = readNumber() !== 0;
                        const sweep = readNumber() !== 0;
                        const endPoint = readPoint(relative);
                        if (rx === 0 || ry === 0) {
                            pushLine(endPoint);
                        }
                        else {
                            const startPoint = current;
                            const segments = arcToCubics(startPoint, rx, ry, rotation, largeArc, sweep, endPoint);
                            if (segments.length === 0) {
                                current = endPoint;
                                lastCubicControl = undefined;
                                lastQuadraticControl = undefined;
                            }
                            else {
                                for (const [cp1, cp2, segmentEnd] of segments) {
                                    pushCubic(cp1, cp2, segmentEnd);
                                }
                            }
                        }
                    }
                    break;
                }
                case 'Z':
                case 'z': {
                    commands.push('z');
                    current = subpathStart;
                    lastCubicControl = undefined;
                    lastQuadraticControl = undefined;
                    break;
                }
                default:
                    throw new Error('Path string is invalid.');
            }

            previousCommand = command;
        }

        return commands;
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
