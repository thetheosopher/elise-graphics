import { CommonEvent } from '../core/common-event';
import { EliseException } from '../core/elise-exception';
import { LayeredSurfaceElement } from './layered-surface-element';
import { Surface } from './surface';

export class ImageLayer extends LayeredSurfaceElement {
    /**
     * Creates an image layer
     * @param id - Image id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param source - Image source URL
     * @param clickListener - Click event listener
     * @returns New image layer
     */
    public static create(
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        source: string,
        clickListener: (image: ImageLayer | undefined) => void
    ) {
        const layer = new ImageLayer(id, left, top, width, height, source, clickListener);
        return layer;
    }

    /**
     * Image source
     */
    public source: string;

    /**
     * Clicked event
     */
    public clicked: CommonEvent<ImageLayer> = new CommonEvent<ImageLayer>();

    /**
     * HTML image element
     */
    public element?: HTMLImageElement;

    /**
     * Constructs an image layer
     * @classdesc Renders an image into an HTML image element
     * @extends Elise.Player.LayeredSurfaceElement
     * @param id - Image layer id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param source - Image source URL
     * @param clickListener - Click event listener
     */
    constructor(
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        source: string,
        clickListener: (image: ImageLayer | undefined) => void
    ) {
        super(id, left, top, width, height);
        this.source = source;
        if (clickListener) {
            this.clicked.add(clickListener);
        }
    }

    /**
     * Adds image layer to parent surface
     * @param surface - Parent surface
     */
    public addToSurface(surface: Surface) {
        this.surface = surface;

        // If no source
        if (!this.source) {
            throw new EliseException('No source defined.');
        }

        // Create Image element
        const imageLayer = document.createElement('img');
        imageLayer.setAttribute('id', this.id + '_image');
        imageLayer.style.position = 'absolute';
        imageLayer.style.left = this.translateX + this.left * surface.scale + 'px';
        imageLayer.style.top = this.translateY + this.top * surface.scale + 'px';
        imageLayer.style.width = this.width * surface.scale + 'px';
        imageLayer.style.height = this.height * surface.scale + 'px';
        imageLayer.style.opacity = (this.surface.opacity * this.opacity).toString();
        this.element = imageLayer;
    }

    /**
     * Sets image source and attaches click event handler
     * @param callback - Completion callback (success: boolean)
     */
    public prepare(callback: (success: boolean) => void) {
        const self = this;
        if(!self.element) {
            throw new Error('Element is undefined.');
        }
        if(!self.surface) {
            throw new Error('Surface is undefined.');
        }
        if(!self.surface.div) {
            throw new Error('Surface div is undefined.');
        }
        const imageLayer = self.element;
        self.surface.div.appendChild(self.element);
        self.element.src = self.source;
        imageLayer.onclick = () => {
            self.clicked.trigger(self);
        };
        self.isPrepared = true;
        if (callback) {
            callback(true);
        }
    }

    /**
     * Unloads image layer and destroys visual elements
     */
    public destroy() {
        if (this.element && this.element.parentElement) {
            this.element.parentElement.removeChild(this.element);
            delete this.element;
        }
        delete this.surface;
    }

    /**
     * Sets rendering scale
     */
    public setScale(scale: number | undefined) {
        if (!this.element || !scale) {
            return this;
        }
        const layer = this.element as HTMLImageElement;
        layer.style.left = this.translateX + this.left * scale + 'px';
        layer.style.top = this.translateY + this.top * scale + 'px';
        layer.style.width = this.width * scale + 'px';
        layer.style.height = this.height * scale + 'px';
        return this;
    }

    /**
     * Sets rendering opacity
     */
    public setOpacity(opacity: number) {
        this.opacity = opacity;
        if (this.element && this.surface) {
            this.element.style.opacity = (this.surface.opacity * this.opacity).toString();
        }
        return this;
    }

    /**
     * Sets X translation
     */
    public setTranslateX(translateX: number) {
        this.translateX = translateX;
        if (this.element && this.surface) {
            this.element.style.left = (this.translateX + this.left) * this.surface.scale + 'px';
        }
        return this;
    }

    /**
     * Sets Y translation
     */
    public setTranslateY(translateY: number) {
        this.translateY = translateY;
        if (this.element && this.surface) {
            this.element.style.top = (this.translateY + this.top) * this.surface.scale + 'px';
        }
        return this;
    }

    public addTo(surface: Surface) {
        surface.layers.push(this);
        return this;
    }

    public onload(): void {
    }

    public onunload(): void {
    }
}
