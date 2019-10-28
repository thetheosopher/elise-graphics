import { CommonEvent } from '../core/common-event';
import { EliseException } from '../core/elise-exception';
import { LayeredSurfaceElement } from './layered-surface-element';
import { Surface } from './surface';

export class Video extends LayeredSurfaceElement {
    /**
     * Constructs a video item
     * @classdesc Renders a video into an HTML video element
     * @extends Elise.Player.LayeredSurfaceElement
     * @param id - Video id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param source - Video source URL
     */
    public static create(id: string, left: number, top: number, width: number, height: number, source: string) {
        const video = new Video(id, left, top, width, height, source);
        return video;
    }

    /**
     * Video source
     */
    public source: string;

    /**
     * If true, loop video
     */
    public loop: boolean;

    /**
     * If true, auto play video on load
     */
    public autoPlay: boolean;

    /**
     * If true, display native control strip
     */
    public nativeControls: boolean;

    /**
     * True when video is ready to play
     */
    public canPlay: boolean;

    /**
     * True when surface has been loaded
     */
    public isLoaded: boolean = false;

    /**
     * Video started event (video: Video)
     */
    public started: CommonEvent<Video> = new CommonEvent<Video>();

    /**
     * Video stopped event (video: Video)
     */
    public stopped: CommonEvent<Video> = new CommonEvent<Video>();

    /**
     * HTML video element
     */
    public element?: HTMLVideoElement;

    /**
     * Constructs a video item
     * @classdesc Renders a video into an HTML video element
     * @extends Elise.Player.LayeredSurfaceElement
     * @param id - Video id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param source - Video source URL
     */
    constructor(id: string, left: number, top: number, width: number, height: number, source: string) {
        super(id, left, top, width, height);
        this.loop = false;
        this.autoPlay = false;
        this.nativeControls = true;
        this.canPlay = false;
        this.source = source;
    }

    /**
     * Adds video to parent surface
     * @param surface - Parent surface
     */
    public addToSurface(surface: Surface) {
        this.surface = surface;

        // If no source
        if (!this.source) {
            throw new EliseException('No source defined.');
        }

        // Create video element
        const video = document.createElement('video') as HTMLVideoElement;
        video.setAttribute('id', this.id + '_video');
        video.style.position = 'absolute';
        video.style.left = this.translateX + this.left * surface.scale + 'px';
        video.style.top = this.translateY + this.top * surface.scale + 'px';
        video.style.width = this.width * surface.scale + 'px';
        video.style.height = this.height * surface.scale + 'px';
        video.style.opacity = (this.surface.opacity * this.opacity).toString();
        this.element = video;
    }

    /**
     * Sets video source and attaches callback for video ready to play
     * @param callback - Completion callback (success: boolean)
     */
    public prepare(callback: (success: boolean) => void) {
        const self = this;
        const video = self.element;
        if(!self.surface) {
            throw new Error('Surface is undefined.');
        }
        if(!self.surface.div) {
            throw new Error('Surface div is undefined.');
        }
        if(!self.element) {
            throw new Error('Element is undefined.');
        }
        if(!video) {
            throw new Error('Video is undefined.');
        }
        if (self.loop) {
            video.setAttributeNode(document.createAttribute('loop'));
        }
        if (self.nativeControls) {
            video.setAttributeNode(document.createAttribute('controls'));
        }

        self.surface.div.appendChild(video);
        self.element.src = self.source;
        video.oncanplay = () => {
            self.canPlay = true;
            if (self.isLoaded && self.autoPlay) {
                video.play();
            }
            delete video.oncanplay;
        };
        self.isPrepared = true;
        if (callback) {
            callback(true);
        }
    }

    /**
     * Unloads video and destroys visual elements
     */
    public destroy() {
        if (this.element && this.element.parentElement) {
            this.element.parentElement.removeChild(this.element);
            delete this.element;
        }
        delete this.surface;
    }

    /**
     * Onload initialization
     */
    public onload() {
        const video = this.element;
        this.isLoaded = true;
        if (video && this.canPlay && this.autoPlay) {
            video.currentTime = 0;
            video.play();
        }
    }

    /**
     * Onunload teardown
     */
    public onunload() {
        if (this.element) {
            const video = this.element;
            video.pause();
        }
    }

    /**
     * Sets rendering scale
     */
    public setScale(scale: number) {
        if (!this.element) { return this; }
        const layer = this.element as HTMLVideoElement;
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
}
