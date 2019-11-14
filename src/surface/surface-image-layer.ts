import { CommonEvent } from '../core/common-event';
import { ErrorMessages } from '../core/error-messages';
import { Surface } from './surface';
import { SurfaceLayer } from './surface-layer';

/**
 * Renders a bitmap image into an HTML image element
 */
export class SurfaceImageLayer extends SurfaceLayer {
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
        clickListener: (image: SurfaceImageLayer | undefined) => void
    ) {
        const layer = new SurfaceImageLayer(id, left, top, width, height, source, clickListener);
        return layer;
    }

    /**
     * Image source
     */
    public source: string;

    /**
     * Clicked event
     */
    public clicked: CommonEvent<SurfaceImageLayer> = new CommonEvent<SurfaceImageLayer>();

    /**
     * HTML image element
     */
    public element?: HTMLImageElement;

    /**
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
        clickListener: (image: SurfaceImageLayer | undefined) => void
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
            throw new Error(ErrorMessages.SourceUndefined);
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
        if (!self.element) {
            throw new Error(ErrorMessages.ElementUndefined);
        }
        if (!self.surface) {
            throw new Error(ErrorMessages.SurfaceIsUndefined);
        }
        if (!self.surface.div) {
            throw new Error(ErrorMessages.SurfaceDivIsUndefined);
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
            this.element = undefined;
        }
        this.surface = undefined;
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

    public onload(): void {}

    public onunload(): void {}
}
