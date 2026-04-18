import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import type { SerializedData } from '../core/serialization';
import { Size } from '../core/size';
import { PathBackedElementBase } from './path-backed-element-base';
import {
    angleFromEllipsePoint,
    clampPrimitiveValue,
    ellipseScaleForPoint,
    getBoundsCenter,
    getBoundsRadii,
    getEllipsePointForBounds,
    normalizeDegrees,
    resolveEllipseHandleSize,
    setBoundsFromCenter,
} from './primitive-shape-utils';

export class RegularPolygonElement extends PathBackedElementBase {
    public sides: number = 5;

    public innerRadiusScale: number = 1;

    public rotation: number = -90;

    public static create(x?: number, y?: number, width?: number, height?: number): RegularPolygonElement {
        const element = new RegularPolygonElement();
        if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
            element._location = new Point(x, y);
            element._size = new Size(width, height);
        }
        return element;
    }

    constructor() {
        super('regularPolygon');
        this.setSides = this.setSides.bind(this);
        this.setInnerRadiusScale = this.setInnerRadiusScale.bind(this);
        this.setShapeRotation = this.setShapeRotation.bind(this);
    }

    /**
     * Sets the number of polygon sides.
     * @param sides - Number of sides (minimum 3)
     * @returns This regular polygon element
     */
    public setSides(sides: number) {
        this.sides = Math.max(3, Math.round(sides));
        this.bounds = undefined;
        return this;
    }

    /**
     * Sets inner radius scale for star shapes.
     * @param innerRadiusScale - Inner radius scale (0.05 to 1)
     * @returns This regular polygon element
     */
    public setInnerRadiusScale(innerRadiusScale: number) {
        this.innerRadiusScale = clampPrimitiveValue(innerRadiusScale, 0.05, 1);
        this.bounds = undefined;
        return this;
    }

    /**
     * Sets shape rotation angle in degrees.
     * @param rotation - Rotation angle in degrees
     * @returns This regular polygon element
     */
    public setShapeRotation(rotation: number) {
        this.rotation = rotation;
        this.bounds = undefined;
        return this;
    }

    public parse(o: SerializedData): void {
        super.parse(o);
        if (o.sides !== undefined) {
            this.sides = Math.max(3, Math.round(Number(o.sides) || 3));
        }
        if (o.innerRadiusScale !== undefined) {
            this.innerRadiusScale = clampPrimitiveValue(Number(o.innerRadiusScale) || 1, 0.05, 1);
        }
        if (o.rotation !== undefined) {
            this.rotation = Number(o.rotation) || 0;
        }
    }

    public serialize(): SerializedData {
        const data = super.serialize();
        if (this.sides !== 5) {
            data.sides = this.sides;
        }
        if (this.innerRadiusScale !== 1) {
            data.innerRadiusScale = this.innerRadiusScale;
        }
        if (this.rotation !== -90) {
            data.rotation = this.rotation;
        }
        return data;
    }

    public clone(): RegularPolygonElement {
        const element = RegularPolygonElement.create();
        super.cloneTo(element);
        element.sides = this.sides;
        element.innerRadiusScale = this.innerRadiusScale;
        element.rotation = this.rotation;
        return element;
    }

    private isStar(): boolean {
        return this.innerRadiusScale < 0.999;
    }

    public getVertexPoints(): Point[] {
        const location = this.getLocation();
        const size = this.getSize();
        if (!location || !size) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        const points: Point[] = [];
        const step = 360 / this.sides;
        for (let index = 0; index < this.sides; index++) {
            points.push(getEllipsePointForBounds(location, size, this.rotation + index * step));
            if (this.isStar()) {
                points.push(getEllipsePointForBounds(location, size, this.rotation + index * step + step / 2, this.innerRadiusScale));
            }
        }
        return points;
    }

    protected buildPathCommands(): string[] {
        const points = this.getVertexPoints();
        if (points.length === 0) {
            return [];
        }
        const commands = ['m' + points[0].toString()];
        for (let index = 1; index < points.length; index++) {
            commands.push('l' + points[index].toString());
        }
        commands.push('z');
        return commands;
    }

    public pointCount(): number {
        return this.getVertexPoints().length;
    }

    public getPointAt(index: number, _depth?: PointDepth): Point {
        const points = this.getVertexPoints();
        if (index < 0 || index >= points.length) {
            throw new Error('Index out of range.');
        }
        return points[index];
    }

    public setPointAt(index: number, value: Point, _depth: PointDepth): void {
        const location = this.getLocation();
        const size = this.getSize();
        if (!location || !size) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        const center = getBoundsCenter(location, size);
        const step = 360 / this.sides;
        const isInnerHandle = this.isStar() && index % 2 === 1;
        if (isInnerHandle) {
            this.innerRadiusScale = clampPrimitiveValue(ellipseScaleForPoint(center, size, value), 0.05, 0.95);
        }
        else {
            const vertexIndex = this.isStar() ? Math.floor(index / 2) : index;
            const vertexAngle = angleFromEllipsePoint(center, size, value);
            this.rotation = normalizeDegrees(vertexAngle - vertexIndex * step);
            const newSize = resolveEllipseHandleSize(center, size, vertexAngle, value);
            const bounds = setBoundsFromCenter(center, newSize.width / 2, newSize.height / 2);
            this._location = bounds.location;
            this._size = bounds.size;
        }
        this.bounds = undefined;
    }

    public setSize(size: Size) {
        super.setSize(size);
        this.bounds = undefined;
        return this;
    }

    public canFill(): boolean {
        return true;
    }
}