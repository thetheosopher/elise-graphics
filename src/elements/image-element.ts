import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { Size } from '../core/size';
import { BitmapResource } from '../resource/bitmap-resource';
import { ResourceManager } from '../resource/resource-manager';
import { ElementBase } from './element-base';

/**
 * Renders a bitmap based image element
 */
export class ImageElement extends ElementBase {
    /**
     * Image element factory function
     * @param source - Bitmap resource key or bitmap resource
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param width - Width
     * @param height - Height
     * @returns New image element
     */
    public static create(
        source?: string | BitmapResource,
        x?: number,
        y?: number,
        width?: number,
        height?: number
    ): ImageElement {
        const e = new ImageElement();
        if (source) {
            if (typeof source === 'string') {
                e.source = source;
            }
            else {
                e.source = source.key;
            }
            if (x !== undefined && y !== undefined) {
                e._location = new Point(x, y);
            }
            if (width !== undefined && height !== undefined) {
                e._size = new Size(width, height);
            }
        }
        return e;
    }

    /**
     * Image resource key
     */
    public source?: string;

    /**
     *  Image opacity 0 (transparent) to 1 (opaque)
     */
    public opacity: number;

    constructor() {
        super('image');
        this.setOpacity = this.setOpacity.bind(this);
        this.opacity = 1.0;
    }

    /**
     * Copies properties of another object to this instance
     * @param o - Source element
     */
    public parse(o: any): void {
        super.parse(o);
        if (o.source) {
            this.source = o.source;
        }
        if (o.opacity !== undefined) {
            this.opacity = o.opacity;
        }
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
        if (this.source) {
            o.source = this.source;
        }
        if (this.opacity !== undefined && this.opacity !== 1) {
            o.opacity = this.opacity;
        }
        if (this._location) {
            o.location = this._location.toString();
        }
        return o;
    }

    /**
     * Clones this image element to a new instance
     * @returns Cloned image instance
     */
    public clone(): ImageElement {
        const e: ImageElement = ImageElement.create();
        super.cloneTo(e);
        if (this.source) {
            e.source = this.source;
        }
        if (this.opacity !== undefined) {
            e.opacity = this.opacity;
        }
        return e;
    }

    /**
     * Register image source with resource manager
     * @param rm - Resource manager
     */
    public registerResources(rm: ResourceManager): void {
        super.registerResources(rm);
        if (this.source) {
            rm.register(this.source);
        }
    }

    /**
     * Returns list of referenced resource keys
     */
    public getResourceKeys() {
        const keys = super.getResourceKeys();
        if (this.source) {
            keys.push(this.source);
        }
        return keys;
    }

    /**
     * Render image element to canvas context
     * @param c - Rendering context
     */
    public draw(c: CanvasRenderingContext2D) {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (this._location === undefined) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        if (this._size === undefined) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if (this.source === undefined) {
            throw new Error(ErrorMessages.SourceUndefined);
        }
        const res = model.resourceManager.get(this.source) as BitmapResource;
        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, this._location);
        }
        if (this.opacity !== undefined && this.opacity > 0 && this.opacity < 1.0) {
            const o = c.globalAlpha;
            c.globalAlpha = this.opacity;
            if (res.image) {
                c.drawImage(res.image, this._location.x, this._location.y, this._size.width, this._size.height);
            }
            c.globalAlpha = o;
        }
        else if (res.image !== undefined) {
            try {
                c.drawImage(res.image, this._location.x, this._location.y, this._size.width, this._size.height);
            } catch (ignore) {
                console.log('Error rendering image in ImageElement.draw.');
            }
        }
        if (model.setElementStroke(c, this)) {
            c.strokeRect(this._location.x, this._location.y, this._size.width, this._size.height);
        }
        c.restore();
    }

    /**
     * Set image opacity
     * @param opacity - Image opacity in the range of 0-1
     * @returns This element
     */
    public setOpacity(opacity: number) {
        this.opacity = opacity;
        return this;
    }

    /**
     * Can element be stroked
     * @returns Can stroke
     */
    public canStroke(): boolean {
        return true;
    }

    /**
     * Returns string description of image
     * @returns Element description
     */
    public toString(): string {
        let description = this.type;
        if(this.source) {
            description += `(${this.source})`;
        }
        if (this._location) {
            description += ` - (${this._location.x},${this._location.y})`;
        }
        if (this._size) {
            description += ` [${this._size.width}x${this._size.height}]`;
        }
        return description;
    }
}
