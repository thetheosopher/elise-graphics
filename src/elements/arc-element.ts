import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import type { SerializedData } from '../core/serialization';
import { Size } from '../core/size';
import { StrokeInfo } from '../core/stroke-info';
import { PathBackedElementBase } from './path-backed-element-base';
import {
    angleFromEllipsePoint,
    buildEllipticalArcCommands,
    getBoundsCenter,
    getEllipsePointForBounds,
    pointToPolylineDistance,
    positiveSweepDegrees,
    resolveEllipseHandleSize,
    sampleEllipticalArc,
    setBoundsFromCenter,
} from './primitive-shape-utils';

export class ArcElement extends PathBackedElementBase {
    public startAngle: number = 0;

    public endAngle: number = 90;

    public static create(x?: number, y?: number, width?: number, height?: number): ArcElement {
        const element = new ArcElement();
        if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
            element._location = new Point(x, y);
            element._size = new Size(width, height);
        }
        return element;
    }

    constructor() {
        super('arc');
    }

    public parse(o: SerializedData): void {
        super.parse(o);
        if (o.startAngle !== undefined) {
            this.startAngle = Number(o.startAngle) || 0;
        }
        if (o.endAngle !== undefined) {
            this.endAngle = Number(o.endAngle) || 0;
        }
    }

    public serialize(): SerializedData {
        const data = super.serialize();
        if (this.startAngle !== 0) {
            data.startAngle = this.startAngle;
        }
        if (this.endAngle !== 90) {
            data.endAngle = this.endAngle;
        }
        return data;
    }

    public clone(): ArcElement {
        const element = ArcElement.create();
        super.cloneTo(element);
        element.startAngle = this.startAngle;
        element.endAngle = this.endAngle;
        return element;
    }

    protected buildPathCommands(): string[] {
        const location = this.getLocation();
        const size = this.getSize();
        if (!location || !size) {
            return [];
        }
        return buildEllipticalArcCommands(location, size, this.startAngle, this.endAngle);
    }

    public hitTest(c: CanvasRenderingContext2D, tx: number, ty: number): boolean {
        const location = this.getLocation();
        const size = this.getSize();
        if (!location || !size) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        const strokeWidth = StrokeInfo.getStrokeInfo(this).strokeWidth || 1;
        const polyline = sampleEllipticalArc(location, size, this.startAngle, this.endAngle, 48);
        const hit = pointToPolylineDistance(new Point(tx, ty), polyline) <= Math.max(4, strokeWidth + 2);
        if (!hit) {
            return false;
        }
        return this.isPointWithinClipPath(c, tx, ty);
    }

    public pointCount(): number {
        return 3;
    }

    public getPointAt(index: number, _depth?: PointDepth): Point {
        const location = this.getLocation();
        const size = this.getSize();
        if (!location || !size) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        if (index === 0) {
            return getEllipsePointForBounds(location, size, this.startAngle);
        }
        if (index === 1) {
            return getEllipsePointForBounds(location, size, this.endAngle);
        }
        if (index === 2) {
            return getEllipsePointForBounds(location, size, this.startAngle + positiveSweepDegrees(this.startAngle, this.endAngle) / 2);
        }
        throw new Error('Index out of range.');
    }

    public setPointAt(index: number, value: Point, _depth: PointDepth): void {
        const location = this.getLocation();
        const size = this.getSize();
        if (!location || !size) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        const center = getBoundsCenter(location, size);
        if (index === 0) {
            this.startAngle = angleFromEllipsePoint(center, size, value);
        }
        else if (index === 1) {
            this.endAngle = angleFromEllipsePoint(center, size, value);
        }
        else if (index === 2) {
            const newSize = resolveEllipseHandleSize(center, size, this.startAngle + positiveSweepDegrees(this.startAngle, this.endAngle) / 2, value);
            const bounds = setBoundsFromCenter(center, newSize.width / 2, newSize.height / 2);
            this._location = bounds.location;
            this._size = bounds.size;
        }
        else {
            throw new Error('Index out of range.');
        }
        this.bounds = undefined;
    }

    public canFill(): boolean {
        return false;
    }
}