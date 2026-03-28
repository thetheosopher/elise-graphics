import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import type { SerializedData } from '../core/serialization';
import { Size } from '../core/size';
import { PathBackedElementBase } from './path-backed-element-base';
import {
    buildEllipticalArcCommands,
    clampPrimitiveValue,
    getBoundsCenter,
    getEllipsePointForBounds,
    resolveEllipseHandleSize,
    setBoundsFromCenter,
} from './primitive-shape-utils';

export class RingElement extends PathBackedElementBase {
    public innerRadiusScale: number = 0.55;

    public static create(x?: number, y?: number, width?: number, height?: number): RingElement {
        const element = new RingElement();
        if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
            element._location = new Point(x, y);
            element._size = new Size(width, height);
        }
        return element;
    }

    constructor() {
        super('ring');
    }

    public parse(o: SerializedData): void {
        super.parse(o);
        if (o.innerRadiusScale !== undefined) {
            this.innerRadiusScale = clampPrimitiveValue(Number(o.innerRadiusScale) || 0.55, 0.05, 0.95);
        }
    }

    public serialize(): SerializedData {
        const data = super.serialize();
        if (this.innerRadiusScale !== 0.55) {
            data.innerRadiusScale = this.innerRadiusScale;
        }
        return data;
    }

    public clone(): RingElement {
        const element = RingElement.create();
        super.cloneTo(element);
        element.innerRadiusScale = this.innerRadiusScale;
        return element;
    }

    protected buildPathCommands(): string[] {
        const location = this.getLocation();
        const size = this.getSize();
        if (!location || !size) {
            return [];
        }
        const outer = buildEllipticalArcCommands(location, size, 0, 360);
        const innerStart = getEllipsePointForBounds(location, size, 0, this.innerRadiusScale);
        return [
            ...outer,
            'z',
            'm' + innerStart.toString(),
            ...buildEllipticalArcCommands(location, size, 0, 360, this.innerRadiusScale, false, false),
            'z',
        ];
    }

    public pointCount(): number {
        return 2;
    }

    public getPointAt(index: number, _depth?: PointDepth): Point {
        const location = this.getLocation();
        const size = this.getSize();
        if (!location || !size) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        if (index === 0) {
            return getEllipsePointForBounds(location, size, 0);
        }
        if (index === 1) {
            return getEllipsePointForBounds(location, size, 0, this.innerRadiusScale);
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
            const newSize = resolveEllipseHandleSize(center, size, 0, value);
            const bounds = setBoundsFromCenter(center, newSize.width / 2, newSize.height / 2);
            this._location = bounds.location;
            this._size = bounds.size;
        }
        else if (index === 1) {
            const outerPoint = getEllipsePointForBounds(location, size, 0);
            const outerRadius = Math.max(1, outerPoint.x - center.x);
            this.innerRadiusScale = clampPrimitiveValue(Math.abs(value.x - center.x) / outerRadius, 0.05, 0.95);
        }
        else {
            throw new Error('Index out of range.');
        }
        this.bounds = undefined;
    }

    public canFill(): boolean {
        return true;
    }
}