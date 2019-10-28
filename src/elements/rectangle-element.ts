import { Point } from '../core/point';
import { Size } from '../core/size';
import { FillFactory } from '../fill/fill-factory';
import { ElementBase } from './element-base';

export class RectangleElement extends ElementBase {

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
        if (x && y && width && height) {
            e._location = new Point(x, y);
            e._size = new Size(width, height);
        }
        return e;
    }

    /**
     * Constructs a rectangle element
     * @classdesc Renders stroked and/or filled rectangle
     * @extends Elise.Drawing.ElementBase
     */
    constructor() {
        super();
        this.type = 'rectangle';
    }

    /**
     * Copies properties of another object to this instance
     * @param o - Source element
     */
    public parse(o: any): void {
        super.parse(o);
        if (!this._location) {
            this._location = new Point(0, 0);
        }
    }

    /**
     * Serializes persistent properties to new object instance
     * @returns Serialized element
     */
    public serialize(): any {
        const o = super.serialize();
        return o;
    }

    /**
     * Clones this rectangle element to a new instance
     * @returns Cloned rectangle instance
     */
    public clone(): RectangleElement {
        const e: RectangleElement = RectangleElement.create();
        super.cloneTo(e);
        return e;
    }

    /**
     * Render rectangle element to canvas context
     * @param c - Rendering context
     */
    public draw(c: CanvasRenderingContext2D) {
        const model = this.model;
        if(!model) {
            return;
        }
        const bounds = this.getBounds();
        if(!bounds) {
            return;
        }
        const x = bounds.location.x;
        const y = bounds.location.y;
        const w = bounds.size.width;
        const h = bounds.size.height;
        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, bounds.location);
        }
        if (FillFactory.setElementFill(c, this)) {
            if (this.fillOffsetX || this.fillOffsetY) {
                const fillOffsetX = this.fillOffsetX || 0;
                const fillOffsetY = this.fillOffsetY || 0;
                c.translate(x + fillOffsetX, y + fillOffsetY);
                c.fillRect(-fillOffsetX, -fillOffsetY, w, h);
                c.translate(-(x + fillOffsetX), -(y + fillOffsetY));
            }
            else {
                c.translate(x, y);
                c.fillRect(0, 0, w, h);
                c.translate(-x, -y);
            }
        }
        if (model.setElementStroke(c, this)) {
            c.strokeRect(x, y, w, h);
        }
        c.restore();
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
}
