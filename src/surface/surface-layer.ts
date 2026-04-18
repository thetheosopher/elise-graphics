import type { SerializedData } from '../core/serialization';
import { SurfaceElement, type SurfaceLike } from './surface-element';

/**
 * Base class for layered surface elements
 */
export abstract class SurfaceLayer extends SurfaceElement {
    /**
     * True after item has been initialized
     */
    public isPrepared: boolean;

    /**
     * DOM Element
     */
    public element?: HTMLElement = undefined;

    /**
     * Layer opacity
     */
    public opacity: number;

    /**
     * Layer X Translation
     */
    public translateX: number;

    /**
     * Layer Y Translation
     */
    public translateY: number;

    /**
     * @param id - Item id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     */
    constructor(id: string, left: number, top: number, width: number, height: number) {
        super(id, left, top, width, height);
        this.addToSurface = this.addToSurface.bind(this);
        this.prepare = this.prepare.bind(this);
        this.destroy = this.destroy.bind(this);
        this.onload = this.onload.bind(this);
        this.onunload = this.onunload.bind(this);
        this.setScale = this.setScale.bind(this);
        this.setOpacity = this.setOpacity.bind(this);
        this.setTranslateX = this.setTranslateX.bind(this);
        this.setTranslateY = this.setTranslateY.bind(this);
        this.isPrepared = false;
        this.opacity = 1;
        this.translateX = 0;
        this.translateY = 0;
    }

    /**
     * Adds layer to parent surface
     * @param surface - Parent surface
     */
    public abstract addToSurface(surface: SurfaceLike): void;

    /**
     * Loads required requires and calls completion callback
     */
    public abstract prepare(callback: (result: boolean) => void): void;

    /**
     * Tears down and destroys visual elements
     */
    public abstract destroy(): void;

    /**
     * Onload initialization
     */
    public abstract onload(): void;

    /**
     * Onunload teardown
     */
    public abstract onunload(): void;

    /**
     * Sets rendering scale
     */
    public setScale(_scale: number | undefined) {
        return this;
    }

    /**
     * Sets rendering opacity
     */
    public setOpacity(opacity: number) {
        this.opacity = opacity;
        return this;
    }

    /**
     * Sets X translation
     */
    public setTranslateX(translateX: number) {
        this.translateX = translateX;
        return this;
    }

    /**
     * Sets Y translation
     */
    public setTranslateY(translateY: number) {
        this.translateY = translateY;
        return this;
    }

    /**
     * Serializes persistent layer properties to a new object
     * @returns Serialized layer data
     */
    public serialize(): SerializedData {
        const o = super.serialize();
        if (this.opacity !== 1) {
            o.opacity = this.opacity;
        }
        if (this.translateX !== 0) {
            o.translateX = this.translateX;
        }
        if (this.translateY !== 0) {
            o.translateY = this.translateY;
        }
        return o;
    }

    /**
     * Parses serialized data into layer properties
     * @param o - Serialized layer data
     */
    public parse(o: SerializedData): void {
        super.parse(o);
        if (o.opacity !== undefined) {
            this.opacity = o.opacity as number;
        }
        if (o.translateX !== undefined) {
            this.translateX = o.translateX as number;
        }
        if (o.translateY !== undefined) {
            this.translateY = o.translateY as number;
        }
    }
}
