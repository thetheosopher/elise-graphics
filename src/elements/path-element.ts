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

    /**
     * Constructs a path element
     * @classdesc Renders series of stroked and/or filled drawing commands
     * @extends Elise.Drawing.ElementBase
     */
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
        if (commandString) {
            this._commands = commandString.split(' ');
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
    public parse(o: any): void {
        super.parse(o);
        if (o.commands) {
            const commandString: string = o.commands;
            this._commands = commandString.split(' ');
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
        return hit;
    }

    /**
     * Returns string description of path element
     * @returns Description
     */
    public toString(): string {
        if (this._commands) {
            return this.type + ' -  ' + this._commands.length + ' Commands';
        }
        else {
            return this.type + ' -  0 Commands';
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
        if(!this._commands) {
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
        if (this.aspectLocked) {
            if (offsetX === 0) {
                this.scale(newHeight / b.height, newHeight / b.height);
            }
            else {
                this.scale(newWidth / b.width, newWidth / b.width);
            }
        }
        else {
            this.scale(newWidth / b.width, newHeight / b.height);
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
        for(const command of this._commands) {
            if (command.charAt(0) === 'm') {
                newCommands.push(
                    'm' +
                    Point.scale(
                        Point.parse(command.substring(1, command.length)),
                        scaleX,
                        scaleY,
                        location.x,
                        location.y
                    ).toString());
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
                    ).toString());
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
        for(const command of this._commands) {
            if (command.charAt(0) === 'm') {
                newCommands.push(
                    'm' +
                    Point.translate(Point.parse(command.substring(1, command.length)), offsetX, offsetY).toString());
            }
            else if (command.charAt(0) === 'l') {
                newCommands.push(
                    'l' +
                    Point.translate(Point.parse(command.substring(1, command.length)), offsetX, offsetY).toString());
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
                p = new Point(parseFloat(parts[4]), parseFloat(parts[5]));
            }
            if (p) {
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
        if(!this._commands) {
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
     * @param size - New size
     * @returns This path element
     */
    public setSize(sizeSource: Size | string) {
        const size = Size.parse(sizeSource);
        const b = this.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        const scaleX = size.width / b.width;
        const scaleY = size.height / b.height;
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
        }
        throw new InvalidIndexException(index);
    }

    /**
     * Adds a new command to this path element
     * @param command - New drawing command
     * @returns This path element
     */
    public add(command: string) {
        if (!this._commands) {
            this._commands = [];
        }
        this._commands.push(command);
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
