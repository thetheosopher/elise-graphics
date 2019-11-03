import { ErrorMessages } from '../core/error-messages';
import { Surface } from './surface';
import { SurfaceLayer } from './surface-layer';

export class SurfaceHtmlLayer extends SurfaceLayer {
    /**
     * Creates an HTML item
     * @param id - Hidden layer id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param source - HTML source URL
     * @returns New HTML layer
     */
    public static create(id: string, left: number, top: number, width: number, height: number, source: string) {
        const layer = new SurfaceHtmlLayer(id, left, top, width, height, source);
        return layer;
    }

    /**
     * HTML IFrame source
     */
    public source: string;

    /**
     * HTML IFrame scrolling attribute
     */
    public scrolling: string;

    /**
     * If true HTML IFrame sandbox is enabled
     */
    public sandbox: boolean;

    /**
     * If true HTML IFrame contents is scaled to parent surface scale factor
     */
    public scaleContent: boolean;

    /**
     * Host HTML IFrame element
     */
    public element?: HTMLIFrameElement;

    /**
     * Renders HTML content into an IFrame element
     * @param id - HTML layer id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param source - HTML source URL
     */
    constructor(id: string, left: number, top: number, width: number, height: number, source: string) {
        super(id, left, top, width, height);
        this.scrolling = 'auto';
        this.sandbox = true;
        this.source = source;
        this.scaleContent = true;
    }

    /**
     * Adds HTML layer to parent surface
     * @param surface - Parent surface
     */
    public addToSurface(surface: Surface) {
        this.surface = surface;

        // If no source
        if (!this.source) {
            throw new Error(ErrorMessages.SourceUndefined);
        }

        // Create iFrame for content
        const iframe = document.createElement('iframe');
        iframe.setAttribute('id', this.id + '_iframe');
        if (this.sandbox) {
            iframe.setAttribute('sandbox', 'allow-forms allow-popups allow-same-origin allow-scripts');
        }
        iframe.style.position = 'absolute';
        iframe.style.left = this.translateX + this.left * surface.scale + 'px';
        iframe.style.top = this.translateY + this.top * surface.scale + 'px';
        if (this.scaleContent) {
            iframe.style.width = this.width + 'px';
            iframe.style.height = this.height + 'px';
        }
        else {
            iframe.style.width = this.width * surface.scale + 'px';
            iframe.style.height = this.height * surface.scale + 'px';
        }
        iframe.style.border = '0px';

        if (this.scaleContent) {
            iframe.style.transform = 'scale(' + surface.scale + ')';
            iframe.style.transformOrigin = '0 0';
        }
        iframe.style.opacity = (this.surface.opacity * this.opacity).toString();
        iframe.scrolling = this.scrolling;
        this.element = iframe;
    }

    /**
     * Sets HTML source and adds element to DOM
     * @param callback - Completion callback (success: boolean)
     */
    public prepare(callback: (success: boolean) => void) {
        if (!this.element) {
            throw new Error(ErrorMessages.ElementUndefined);
        }
        if (!this.surface) {
            throw new Error(ErrorMessages.SurfaceIsUndefined);
        }
        if (!this.surface.div) {
            throw new Error(ErrorMessages.SurfaceDivIsUndefined);
        }
        this.surface.div.appendChild(this.element);
        this.element.src = this.source;
        this.isPrepared = true;
        if (callback) {
            callback(true);
        }
    }

    /**
     * Unloads HTML layer and destroys visual elements
     */
    public destroy() {
        if (this.element && this.element.parentElement) {
            this.element.parentElement.removeChild(this.element);
            delete this.element;
        }
        delete this.surface;
    }

    /**
     * Onload initialization. Sets IFrame source
     */
    public onload() {
        if (this.element) {
            this.element.src = this.source;
        }
    }

    /**
     * Onunload teardown
     */
    public onunload() {
        if (this.element) {
            this.element.src = 'about:blank';
        }
    }

    /**
     * Sets rendering scale
     */
    public setScale(scale: number | undefined) {
        if (!this.element || !scale) {
            return this;
        }
        const iframe = this.element as HTMLIFrameElement;
        iframe.style.left = this.translateX + this.left * scale + 'px';
        iframe.style.top = this.translateY + this.top * scale + 'px';
        if (this.scaleContent) {
            iframe.style.width = this.width + 'px';
            iframe.style.height = this.height + 'px';
        }
        else {
            iframe.style.width = this.width * scale + 'px';
            iframe.style.height = this.height * scale + 'px';
        }
        iframe.style.border = '0px';

        if (this.scaleContent) {
            iframe.style.transform = 'scale(' + scale + ')';
            iframe.style.transformOrigin = '0 0';
        }
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
}
