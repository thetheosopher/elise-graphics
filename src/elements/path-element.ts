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
import {
    iteratePathCommands,
    normalizePathCommands,
    parsePathCommandString,
    scalePathCommands,
    tracePathCommands,
    translatePathCommands,
} from './path-command-utils';

type ArcEditGeometry = {
    center: Point;
    radiusX: number;
    radiusY: number;
    xAxisUnit: Point;
    yAxisUnit: Point;
};

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
        let pointCount = 0;
        if (this._commands) {
            iteratePathCommands(this._commands, (command) => {
                if (command.type === 'm' || command.type === 'l' || command.type === 'H' || command.type === 'V' || command.type === 'T' || command.type === 'A') {
                    pointCount++;
                }
                else if (command.type === 'c' || command.type === 'Q' || command.type === 'S') {
                    pointCount += 2;
                    if (command.type === 'c') {
                        pointCount++;
                    }
                }
            });
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
        let foundPoint: Point | undefined;
        iteratePathCommands(this._commands, (command) => {
            if (foundPoint) {
                return;
            }
            if (command.type === 'm' || command.type === 'l' || command.type === 'H' || command.type === 'V' || command.type === 'T' || command.type === 'A') {
                current++;
                if (current === index) {
                    foundPoint = command.end;
                }
                if (command.type === 'A' && depth === PointDepth.Full) {
                    const geometry = PathElement.resolveArcEditGeometry(
                        command.start,
                        command.radiusX,
                        command.radiusY,
                        command.xAxisRotation,
                        command.largeArc,
                        command.sweep,
                        command.end,
                    );
                    current++;
                    if (current === index) {
                        foundPoint = PathElement.getArcAxisHandlePoint(geometry, 'x');
                    }
                    current++;
                    if (current === index) {
                        foundPoint = PathElement.getArcAxisHandlePoint(geometry, 'y');
                    }
                }
                return;
            }
            if (command.type === 'c') {
                current++;
                if (current === index) {
                    foundPoint = command.end;
                }
                if (depth === PointDepth.Full) {
                    current++;
                    if (current === index) {
                        foundPoint = command.cp1;
                    }
                    current++;
                    if (current === index) {
                        foundPoint = command.cp2;
                    }
                }
                return;
            }
            if (command.type === 'Q' || command.type === 'S') {
                current++;
                if (current === index) {
                    foundPoint = command.end;
                }
                if (depth === PointDepth.Full) {
                    current++;
                    if (current === index) {
                        foundPoint = command.type === 'Q' ? command.controlPoint : command.cp2;
                    }
                }
            }
        });
        if (foundPoint) {
            return foundPoint;
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
        let currentPoint = Point.Origin;
        for (let i = 0; i < cl; i++) {
            const command = this._commands[i];
            if (command.charAt(0) === 'm') {
                current++;
                if (current === index) {
                    this._commands[i] = 'm' + value.toString();
                    this.bounds = undefined;
                    return this;
                }
                currentPoint = Point.parse(command.substring(1, command.length));
            }
            else if (command.charAt(0) === 'l') {
                current++;
                if (current === index) {
                    this._commands[i] = 'l' + value.toString();
                    this.bounds = undefined;
                    return this;
                }
                currentPoint = Point.parse(command.substring(1, command.length));
            }
            else if (command.charAt(0) === 'H') {
                current++;
                if (current === index) {
                    this._commands[i] = value.y === currentPoint.y ? 'H' + value.x : 'l' + value.toString();
                    this.bounds = undefined;
                    return this;
                }
                currentPoint = new Point(parseFloat(command.substring(1, command.length)), currentPoint.y);
            }
            else if (command.charAt(0) === 'V') {
                current++;
                if (current === index) {
                    this._commands[i] = value.x === currentPoint.x ? 'V' + value.y : 'l' + value.toString();
                    this.bounds = undefined;
                    return this;
                }
                currentPoint = new Point(currentPoint.x, parseFloat(command.substring(1, command.length)));
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
                currentPoint = endPoint;
            }
            else if (command.charAt(0) === 'S') {
                const parts = command.substring(1, command.length).split(',');
                let cp2 = new Point(parseFloat(parts[0]), parseFloat(parts[1]));
                let endPoint = new Point(parseFloat(parts[2]), parseFloat(parts[3]));
                current++;
                if (current === index) {
                    endPoint = value;
                    this._commands[i] = 'S' + cp2.toString() + ',' + endPoint.toString();
                    this.bounds = undefined;
                    return this;
                }
                if (depth === PointDepth.Full) {
                    current++;
                    if (current === index) {
                        cp2 = value;
                        this._commands[i] = 'S' + cp2.toString() + ',' + endPoint.toString();
                        this.bounds = undefined;
                        return this;
                    }
                }
                currentPoint = endPoint;
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
                currentPoint = endPoint;
            }
            else if (command.charAt(0) === 'T') {
                const endPoint = Point.parse(command.substring(1, command.length));
                current++;
                if (current === index) {
                    this._commands[i] = 'T' + value.toString();
                    this.bounds = undefined;
                    return this;
                }
                currentPoint = endPoint;
            }
            else if (command.charAt(0) === 'A') {
                const parts = command.substring(1, command.length).split(',');
                let radiusX = parseFloat(parts[0]);
                let radiusY = parseFloat(parts[1]);
                const rotation = parseFloat(parts[2]);
                const largeArc = parts[3] !== '0';
                const sweep = parts[4] !== '0';
                let endPoint = new Point(parseFloat(parts[5]), parseFloat(parts[6]));
                current++;
                if (current === index) {
                    this._commands[i] = 'A' + [radiusX, radiusY, rotation, largeArc ? 1 : 0, sweep ? 1 : 0, value.x, value.y].join(',');
                    this.bounds = undefined;
                    return this;
                }
                if (depth === PointDepth.Full) {
                    const geometry = PathElement.resolveArcEditGeometry(currentPoint, radiusX, radiusY, rotation, largeArc, sweep, endPoint);
                    current++;
                    if (current === index) {
                        radiusX = PathElement.resolveArcHandleRadius(geometry.center, geometry.xAxisUnit, value);
                        this._commands[i] = 'A' + [radiusX, radiusY, rotation, largeArc ? 1 : 0, sweep ? 1 : 0, endPoint.x, endPoint.y].join(',');
                        this.bounds = undefined;
                        return this;
                    }
                    current++;
                    if (current === index) {
                        radiusY = PathElement.resolveArcHandleRadius(geometry.center, geometry.yAxisUnit, value);
                        this._commands[i] = 'A' + [radiusX, radiusY, rotation, largeArc ? 1 : 0, sweep ? 1 : 0, endPoint.x, endPoint.y].join(',');
                        this.bounds = undefined;
                        return this;
                    }
                }
                currentPoint = endPoint;
            }
            else if (command.charAt(0) === 'z') {
                const normalized = normalizePathCommands(this._commands.slice(0, i + 1));
                const lastMove = normalized
                    .slice()
                    .reverse()
                    .find((entry) => entry.charAt(0) === 'm');
                if (lastMove) {
                    currentPoint = Point.parse(lastMove.substring(1));
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

    private static resolveArcEditGeometry(
        startPoint: Point,
        radiusX: number,
        radiusY: number,
        xAxisRotation: number,
        largeArc: boolean,
        sweep: boolean,
        endPoint: Point,
    ): ArcEditGeometry {
        const absoluteRadiusX = Math.max(1, Math.abs(radiusX) || 1);
        const absoluteRadiusY = Math.max(1, Math.abs(radiusY) || 1);
        const phi = (xAxisRotation * Math.PI) / 180;
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);
        const xAxisUnit = new Point(cosPhi, sinPhi);
        const yAxisUnit = new Point(-sinPhi, cosPhi);

        if (startPoint.x === endPoint.x && startPoint.y === endPoint.y) {
            return {
                center: new Point(startPoint.x, startPoint.y),
                radiusX: absoluteRadiusX,
                radiusY: absoluteRadiusY,
                xAxisUnit,
                yAxisUnit,
            };
        }

        let adjustedRadiusX = absoluteRadiusX;
        let adjustedRadiusY = absoluteRadiusY;
        const dx = (startPoint.x - endPoint.x) / 2;
        const dy = (startPoint.y - endPoint.y) / 2;
        const x1p = cosPhi * dx + sinPhi * dy;
        const y1p = -sinPhi * dx + cosPhi * dy;
        const lambda = (x1p * x1p) / (adjustedRadiusX * adjustedRadiusX) + (y1p * y1p) / (adjustedRadiusY * adjustedRadiusY);

        if (lambda > 1) {
            const scale = Math.sqrt(lambda);
            adjustedRadiusX *= scale;
            adjustedRadiusY *= scale;
        }

        const radiusXSquared = adjustedRadiusX * adjustedRadiusX;
        const radiusYSquared = adjustedRadiusY * adjustedRadiusY;
        const x1pSquared = x1p * x1p;
        const y1pSquared = y1p * y1p;
        const numerator = radiusXSquared * radiusYSquared - radiusXSquared * y1pSquared - radiusYSquared * x1pSquared;
        const denominator = radiusXSquared * y1pSquared + radiusYSquared * x1pSquared;

        if (denominator === 0) {
            return {
                center: new Point((startPoint.x + endPoint.x) / 2, (startPoint.y + endPoint.y) / 2),
                radiusX: adjustedRadiusX,
                radiusY: adjustedRadiusY,
                xAxisUnit,
                yAxisUnit,
            };
        }

        const factor = Math.sqrt(Math.max(0, numerator / denominator));
        const sign = largeArc === sweep ? -1 : 1;
        const cxp = sign * factor * ((adjustedRadiusX * y1p) / adjustedRadiusY);
        const cyp = sign * factor * ((-adjustedRadiusY * x1p) / adjustedRadiusX);
        const center = new Point(
            cosPhi * cxp - sinPhi * cyp + (startPoint.x + endPoint.x) / 2,
            sinPhi * cxp + cosPhi * cyp + (startPoint.y + endPoint.y) / 2,
        );

        return {
            center,
            radiusX: adjustedRadiusX,
            radiusY: adjustedRadiusY,
            xAxisUnit,
            yAxisUnit,
        };
    }

    private static getArcAxisHandlePoint(geometry: ArcEditGeometry, axis: 'x' | 'y'): Point {
        if (axis === 'x') {
            return new Point(
                geometry.center.x + geometry.xAxisUnit.x * geometry.radiusX,
                geometry.center.y + geometry.xAxisUnit.y * geometry.radiusX,
            );
        }

        return new Point(
            geometry.center.x + geometry.yAxisUnit.x * geometry.radiusY,
            geometry.center.y + geometry.yAxisUnit.y * geometry.radiusY,
        );
    }

    private static resolveArcHandleRadius(center: Point, axisUnit: Point, value: Point): number {
        const projection = (value.x - center.x) * axisUnit.x + (value.y - center.y) * axisUnit.y;
        return Math.max(1, Math.abs(projection));
    }
}
