import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import type { SerializedData } from '../core/serialization';
import { Size } from '../core/size';
import { PathBackedElementBase } from './path-backed-element-base';
import { clampPrimitiveValue } from './primitive-shape-utils';

export class ArrowElement extends PathBackedElementBase {
    public headLengthScale: number = 0.35;

    public headWidthScale: number = 0.7;

    public shaftWidthScale: number = 0.3;

    public static create(x?: number, y?: number, width?: number, height?: number): ArrowElement {
        const element = new ArrowElement();
        if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
            element._location = new Point(x, y);
            element._size = new Size(width, height);
        }
        return element;
    }

    constructor() {
        super('arrow');
    }

    public parse(o: SerializedData): void {
        super.parse(o);
        if (o.headLengthScale !== undefined) {
            this.headLengthScale = clampPrimitiveValue(Number(o.headLengthScale) || 0.35, 0.1, 0.9);
        }
        if (o.headWidthScale !== undefined) {
            this.headWidthScale = clampPrimitiveValue(Number(o.headWidthScale) || 0.7, 0.1, 1);
        }
        if (o.shaftWidthScale !== undefined) {
            this.shaftWidthScale = clampPrimitiveValue(Number(o.shaftWidthScale) || 0.3, 0.05, 1);
        }
    }

    public serialize(): SerializedData {
        const data = super.serialize();
        if (this.headLengthScale !== 0.35) {
            data.headLengthScale = this.headLengthScale;
        }
        if (this.headWidthScale !== 0.7) {
            data.headWidthScale = this.headWidthScale;
        }
        if (this.shaftWidthScale !== 0.3) {
            data.shaftWidthScale = this.shaftWidthScale;
        }
        return data;
    }

    public clone(): ArrowElement {
        const element = ArrowElement.create();
        super.cloneTo(element);
        element.headLengthScale = this.headLengthScale;
        element.headWidthScale = this.headWidthScale;
        element.shaftWidthScale = this.shaftWidthScale;
        return element;
    }

    public getArrowPoints(): Point[] {
        const location = this.getLocation();
        const size = this.getSize();
        if (!location || !size) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        const centerY = location.y + size.height / 2;
        const headLength = size.width * this.headLengthScale;
        const headBaseX = location.x + size.width - headLength;
        const headHalfHeight = (size.height * this.headWidthScale) / 2;
        const shaftHalfHeight = (size.height * this.shaftWidthScale) / 2;
        return [
            new Point(location.x, centerY - shaftHalfHeight),
            new Point(headBaseX, centerY - shaftHalfHeight),
            new Point(headBaseX, centerY - headHalfHeight),
            new Point(location.x + size.width, centerY),
            new Point(headBaseX, centerY + headHalfHeight),
            new Point(headBaseX, centerY + shaftHalfHeight),
            new Point(location.x, centerY + shaftHalfHeight),
        ];
    }

    protected buildPathCommands(): string[] {
        const points = this.getArrowPoints();
        const commands = ['m' + points[0].toString()];
        for (let index = 1; index < points.length; index++) {
            commands.push('l' + points[index].toString());
        }
        commands.push('z');
        return commands;
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
        const centerY = location.y + size.height / 2;
        const headLength = size.width * this.headLengthScale;
        const headBaseX = location.x + size.width - headLength;
        if (index === 0) {
            return new Point(headBaseX, centerY);
        }
        if (index === 1) {
            return new Point(headBaseX, centerY - (size.height * this.headWidthScale) / 2);
        }
        if (index === 2) {
            return new Point(location.x, centerY - (size.height * this.shaftWidthScale) / 2);
        }
        throw new Error('Index out of range.');
    }

    public setPointAt(index: number, value: Point, _depth: PointDepth): void {
        const location = this.getLocation();
        const size = this.getSize();
        if (!location || !size) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        const centerY = location.y + size.height / 2;
        if (index === 0) {
            this.headLengthScale = clampPrimitiveValue((location.x + size.width - value.x) / Math.max(1, size.width), 0.1, 0.9);
        }
        else if (index === 1) {
            const heightScale = (2 * Math.abs(value.y - centerY)) / Math.max(1, size.height);
            this.headWidthScale = clampPrimitiveValue(heightScale, Math.max(this.shaftWidthScale + 0.05, 0.1), 1);
        }
        else if (index === 2) {
            const heightScale = (2 * Math.abs(value.y - centerY)) / Math.max(1, size.height);
            this.shaftWidthScale = clampPrimitiveValue(heightScale, 0.05, Math.max(0.05, this.headWidthScale));
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