import {CommonEvent} from '../core/common-event';
import {Surface} from './surface';
import {SurfaceLayer} from './surface-layer';

export class SurfaceHiddenLayer extends SurfaceLayer {
    /**
     * Creates a hidden div layer
     * @param id - Hidden layer id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param source - Image source URL
     * @param clickListener - Click event listener
     * @returns New hidden layer
     */
    public static create(
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        clickListener: (hiddenLayer: SurfaceHiddenLayer | undefined) => void
    ) {
        const layer = new SurfaceHiddenLayer(id, left, top, width, height, clickListener);
        return layer;
    }

    /**
     * Clicked event
     */
    public clicked: CommonEvent<SurfaceHiddenLayer> = new CommonEvent<SurfaceHiddenLayer>();

    /**
     * HTML div element
     */
    public element?: HTMLDivElement;

    /**
     * Renders a transparent HTML div element for capturing click event
     * @param id - Layer id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param clickListener - Click event listener
     */
    constructor(
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        clickListener: (hiddenLayer: SurfaceHiddenLayer | undefined) => void
    ) {
        super(id, left, top, width, height);
        if (clickListener) {
            this.clicked.add(clickListener);
        }
    }

    /**
     * Adds hidden layer to parent surface
     * @param surface - Parent surface
     */
    public addToSurface(surface: Surface) {
        this.surface = surface;

        // Create div element
        const hiddenLayer = document.createElement('div');
        hiddenLayer.setAttribute('id', this.id + '_div');
        hiddenLayer.style.position = 'absolute';
        hiddenLayer.style.left = this.translateX + this.left * surface.scale + 'px';
        hiddenLayer.style.top = this.translateY + this.top * surface.scale + 'px';
        hiddenLayer.style.width = this.width * surface.scale + 'px';
        hiddenLayer.style.height = this.height * surface.scale + 'px';
        this.element = hiddenLayer;
    }

    /**
     * Attaches click event handler
     * @param callback - Completion callback (success: boolean)
     */
    public prepare(callback: (success: boolean) => void) {
        const self = this;
        if (self.element && self.surface && self.surface.div) {
            self.surface.div.appendChild(self.element);
            self.element.onclick = () => {
                self.clicked.trigger(self);
            };
        }
        self.isPrepared = true;
        if (callback) {
            callback(true);
        }
    }

    /**
     * Unloads div element
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
        const layer = this.element as HTMLDivElement;
        layer.style.left = this.translateX + this.left * scale + 'px';
        layer.style.top = this.translateY + this.top * scale + 'px';
        layer.style.width = this.width * scale + 'px';
        layer.style.height = this.height * scale + 'px';
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

    public onload() {}

    public onunload() {}
}
