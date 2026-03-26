import { ErrorMessages } from '../core/error-messages';
import type { SerializedData } from '../core/serialization';
import { Point } from '../core/point';
import { Size } from '../core/size';
import { FillFactory } from '../fill/fill-factory';
import { ElementBase } from './element-base';

/**
 * Renders stroked and/or filled rectangle
 */
export class RectangleElement extends ElementBase {
    /**
     * Per-corner radii in top-left, top-right, bottom-right, bottom-left order.
     */
    public cornerRadii?: [number, number, number, number];

    /**
     * Rectangle element factory function
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param width - Width
     * @param height - Height
     * @returns New rectangle element
     */
    public static create(x?: number, y?: number, width?: number, height?: number) {
        const e = new RectangleElement();
        if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
            e._location = new Point(x, y);
            e._size = new Size(width, height);
        }
        return e;
    }

    constructor() {
        super('rectangle');

        this.setCornerRadius = this.setCornerRadius.bind(this);
        this.setCornerRadii = this.setCornerRadii.bind(this);
        this.getCornerRadii = this.getCornerRadii.bind(this);
        this.tracePath = this.tracePath.bind(this);
    }

    /**
     * Copies properties of another object to this instance
     * @param o - Source element
     */
    public parse(o: SerializedData): void {
        super.parse(o);
        if (o.cornerRadius !== undefined) {
            this.setCornerRadius(Number(o.cornerRadius));
        }
        else if (o.cornerRadii !== undefined) {
            const parsed = RectangleElement.parseCornerRadii(o.cornerRadii);
            if (parsed) {
                this.cornerRadii = parsed;
            }
        }
        if (!this._location) {
            this._location = new Point(0, 0);
        }
    }

    /**
     * Serializes persistent properties to new object instance
     * @returns Serialized element
     */
    public serialize(): SerializedData {
        const o = super.serialize();
        if (this.cornerRadii) {
            if (RectangleElement.areCornerRadiiUniform(this.cornerRadii)) {
                o.cornerRadius = this.cornerRadii[0];
            }
            else {
                o.cornerRadii = this.cornerRadii.slice();
            }
        }
        return o;
    }

    /**
     * Clones this rectangle element to a new instance
     * @returns Cloned rectangle instance
     */
    public clone(): RectangleElement {
        const e: RectangleElement = RectangleElement.create();
        super.cloneTo(e);
        if (this.cornerRadii) {
            e.cornerRadii = this.cornerRadii.slice() as [number, number, number, number];
        }
        return e;
    }

    /**
     * Sets a uniform corner radius on all rectangle corners.
     * @param radius - Corner radius
     * @returns This rectangle
     */
    public setCornerRadius(radius: number) {
        return this.setCornerRadii(radius, radius, radius, radius);
    }

    /**
     * Sets individual rectangle corner radii.
     * @param topLeft - Top-left radius
     * @param topRight - Top-right radius
     * @param bottomRight - Bottom-right radius
     * @param bottomLeft - Bottom-left radius
     * @returns This rectangle
     */
    public setCornerRadii(topLeft: number, topRight: number = topLeft, bottomRight: number = topLeft, bottomLeft: number = topLeft) {
        const radii: [number, number, number, number] = [topLeft, topRight, bottomRight, bottomLeft].map((value) => {
            const numeric = Number.isFinite(value) ? value : 0;
            return Math.max(0, numeric);
        }) as [number, number, number, number];

        if (radii.every((value) => value === 0)) {
            this.cornerRadii = undefined;
        }
        else {
            this.cornerRadii = radii;
        }
        return this;
    }

    /**
     * Returns normalized corner radii clamped to the provided size.
     * @param size - Optional size override
     * @returns Corner radii in top-left, top-right, bottom-right, bottom-left order
     */
    public getCornerRadii(size?: Size): [number, number, number, number] {
        const input: [number, number, number, number] = this.cornerRadii
            ? [this.cornerRadii[0], this.cornerRadii[1], this.cornerRadii[2], this.cornerRadii[3]]
            : [0, 0, 0, 0];
        const effectiveSize = size || this.getSize();
        if (!effectiveSize) {
            return input;
        }

        const width = Math.max(0, effectiveSize.width);
        const height = Math.max(0, effectiveSize.height);
        if (width === 0 || height === 0) {
            return [0, 0, 0, 0];
        }

        const radii = input.map((value) => Math.max(0, value)) as [number, number, number, number];
        const widthScaleTop = radii[0] + radii[1] > 0 ? width / (radii[0] + radii[1]) : 1;
        const widthScaleBottom = radii[3] + radii[2] > 0 ? width / (radii[3] + radii[2]) : 1;
        const heightScaleLeft = radii[0] + radii[3] > 0 ? height / (radii[0] + radii[3]) : 1;
        const heightScaleRight = radii[1] + radii[2] > 0 ? height / (radii[1] + radii[2]) : 1;
        const scale = Math.min(1, widthScaleTop, widthScaleBottom, heightScaleLeft, heightScaleRight);

        if (scale < 1) {
            return radii.map((value) => value * scale) as [number, number, number, number];
        }

        return radii;
    }

    /**
     * Traces the rectangle geometry as the current canvas path.
     * @param c - Rendering context
     * @param location - Optional location override
     * @param size - Optional size override
     */
    public tracePath(c: CanvasRenderingContext2D, location?: Point, size?: Size): void {
        const effectiveLocation = location || this.getLocation();
        const effectiveSize = size || this.getSize();
        if (!effectiveLocation) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        if (!effectiveSize) {
            throw new Error(ErrorMessages.SizeUndefined);
        }

        const x = effectiveLocation.x;
        const y = effectiveLocation.y;
        const width = effectiveSize.width;
        const height = effectiveSize.height;
        const radii = this.getCornerRadii(effectiveSize);

        if (radii[0] === 0 && radii[1] === 0 && radii[2] === 0 && radii[3] === 0) {
            c.rect(x, y, width, height);
            return;
        }

        c.moveTo(x + radii[0], y);
        c.lineTo(x + width - radii[1], y);
        if (radii[1] > 0) {
            c.quadraticCurveTo(x + width, y, x + width, y + radii[1]);
        }
        else {
            c.lineTo(x + width, y);
        }

        c.lineTo(x + width, y + height - radii[2]);
        if (radii[2] > 0) {
            c.quadraticCurveTo(x + width, y + height, x + width - radii[2], y + height);
        }
        else {
            c.lineTo(x + width, y + height);
        }

        c.lineTo(x + radii[3], y + height);
        if (radii[3] > 0) {
            c.quadraticCurveTo(x, y + height, x, y + height - radii[3]);
        }
        else {
            c.lineTo(x, y + height);
        }

        c.lineTo(x, y + radii[0]);
        if (radii[0] > 0) {
            c.quadraticCurveTo(x, y, x + radii[0], y);
        }
        else {
            c.lineTo(x, y);
        }
        c.closePath();
    }

    /**
     * Render rectangle element to canvas context
     * @param c - Rendering context
     */
    public draw(c: CanvasRenderingContext2D) {
        if (!this.visible) {
            return;
        }
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        const x = bounds.location.x;
        const y = bounds.location.y;
        const w = bounds.size.width;
        const h = bounds.size.height;
        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, bounds.location);
        }
        this.applyRenderOpacity(c);
        this.withClipPath(c, () => {
            if (FillFactory.setElementFill(c, this)) {
                if (this.fillOffsetX || this.fillOffsetY) {
                    const fillOffsetX = this.fillOffsetX || 0;
                    const fillOffsetY = this.fillOffsetY || 0;
                    c.translate(x + fillOffsetX, y + fillOffsetY);
                    c.beginPath();
                    this.tracePath(c, new Point(-fillOffsetX, -fillOffsetY), new Size(w, h));
                    c.fill();
                    c.translate(-(x + fillOffsetX), -(y + fillOffsetY));
                }
                else {
                    c.translate(x, y);
                    c.beginPath();
                    this.tracePath(c, Point.Origin, new Size(w, h));
                    c.fill();
                    c.translate(-x, -y);
                }
            }
            if (model.setElementStroke(c, this)) {
                c.beginPath();
                this.tracePath(c, bounds.location, bounds.size);
                c.stroke();
            }
        });
        c.restore();
    }

    /**
     * Hit test rectangle element.
     * @param c - Rendering context
     * @param tx - X coordinate of point
     * @param ty - Y coordinate of point
     * @returns True if point is within rectangle interior
     */
    public hitTest(c: CanvasRenderingContext2D, tx: number, ty: number): boolean {
        if (!this.visible) {
            return false;
        }
        const location = this.getLocation();
        const size = this.getSize();
        const model = this.model;
        if (!location) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, location);
        }
        c.beginPath();
        this.tracePath(c, location, size);
        let hit = c.isPointInPath(tx, ty);
        c.restore();
        if (hit) {
            hit = this.isPointWithinClipPath(c, tx, ty);
        }
        return hit;
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

    private static parseCornerRadii(value: unknown): [number, number, number, number] | undefined {
        if (Array.isArray(value) && value.length >= 4) {
            return [0, 1, 2, 3].map((index) => Math.max(0, Number(value[index]) || 0)) as [number, number, number, number];
        }

        if (typeof value === 'string') {
            const parts = value.split(/[\s,]+/).filter((part) => part.length > 0).map((part) => Number(part));
            if (parts.length === 4 && parts.every((part) => !isNaN(part))) {
                return parts.map((part) => Math.max(0, part)) as [number, number, number, number];
            }
        }

        return undefined;
    }

    private static areCornerRadiiUniform(radii: [number, number, number, number]): boolean {
        return radii[0] === radii[1] && radii[0] === radii[2] && radii[0] === radii[3];
    }
}
