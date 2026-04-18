import { ErrorMessages } from '../core/error-messages';
import type { SerializedData } from '../core/serialization';
import { Utility } from '../core/utility';
import type { PaneContainerLike, PaneTransition } from './pane-transitions/pane-transition';
import { PaneTransitionDirection } from './pane-transitions/pane-transition-direction';
import { PaneTransitionFade } from './pane-transitions/pane-transition-fade';
import { PaneTransitionNone } from './pane-transitions/pane-transition-none';
import { PaneTransitionPush } from './pane-transitions/pane-transition-push';
import { PaneTransitionReveal } from './pane-transitions/pane-transition-reveal';
import { PaneTransitionSlide } from './pane-transitions/pane-transition-slide';
import { PaneTransitionWipe } from './pane-transitions/pane-transition-wipe';
import { Surface } from './surface';
import type { SurfaceLike } from './surface-element';
import { SurfaceLayer } from './surface-layer';

/**
 * Hosts a child surface in a parent surface layer
 */
export class SurfacePane extends SurfaceLayer {
    /**
     * Creates a surface pane layer
     * @param id - Pane layer id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param surface - Pane surface
     * @returns New HTML layer
     */
    public static create(id: string, left: number, top: number, width: number, height: number, surface: Surface) {
        const layer = new SurfacePane(id, left, top, width, height, surface);
        return layer;
    }

    /**
     * Hosted pane surface
     */
    public childSurface: Surface;

    /**
     * Default pane transition
     */
    public transition?: string;

    /**
     * Default pane transition duration in seconds
     */
    public transitionDuration?: number;

    /**
     * Navigation history stack of surface IDs
     */
    public navigationHistory: string[] = [];

    /**
     * Referenced child surface ID (for deferred resolution)
     */
    public childSurfaceId?: string;

    /**
     * Host HTML div element
     */
    public element?: HTMLDivElement = undefined;

    /**
     * Current pane transition in progress
     */
    private activeTransition?: PaneTransition;

    /**
     * @param id - Pane id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param childSurface - Hosted child surface
     */
    constructor(id: string, left: number, top: number, width: number, height: number, childSurface: Surface) {
        super(id, left, top, width, height);
        this.replaceSurface = this.replaceSurface.bind(this);
        this.startTransition = this.startTransition.bind(this);
        this.cancelTransition = this.cancelTransition.bind(this);
        this.setHostDivScrolling = this.setHostDivScrolling.bind(this);
        this.childSurface = childSurface;
        this.childSurface.isChild = true;
    }

    private startTransition(transition: PaneTransition) {
        this.cancelTransition();
        this.activeTransition = transition;
        try {
            transition.start();
        }
        catch (error) {
            if (this.activeTransition === transition) {
                this.activeTransition = undefined;
            }
            throw error;
        }
    }

    private cancelTransition() {
        if (this.activeTransition) {
            this.activeTransition.cancel();
            this.activeTransition = undefined;
        }
    }

    // tslint:disable-next-line:no-empty
    public onload(): void {}

    // tslint:disable-next-line:no-empty
    public onunload(): void {}

    /**
     * Adds pane to parent surface
     */
    public addToSurface(surface: SurfaceLike) {
        this.surface = surface;

        // If no child surface, throw error
        if (!this.childSurface) {
            throw new Error(ErrorMessages.SurfaceDivIsUndefined);
        }

        // Create div to host child surface
        const hostDiv = document.createElement('div');
        const id = Utility.guid() + '_div';
        hostDiv.setAttribute('id', id);
        hostDiv.style.position = 'absolute';
        hostDiv.style.left = this.translateX + this.left * surface.scale + 'px';
        hostDiv.style.top = this.translateY + this.top * surface.scale + 'px';
        hostDiv.style.width = this.width * surface.scale + 'px';
        hostDiv.style.height = this.height * surface.scale + 'px';
        hostDiv.style.opacity = (this.surface.opacity * this.opacity).toString();
        this.childSurface.scale = this.surface.scale;
        this.element = hostDiv;
        this.setHostDivScrolling();
    }

    /**
     * Prepares child surface resources and call completion callback
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
        self.surface.div.appendChild(self.element);
        if (self.surface.resourceListenerEvent.hasListeners()) {
            self.surface.resourceListenerEvent.listeners.forEach(listener => {
                if (self.childSurface.resourceListenerEvent.listeners.indexOf(listener) === -1) {
                    self.childSurface.resourceListenerEvent.add(listener);
                }
            });
        }
        self.childSurface.bind(
            self.element,
            _surface => {
                self.isPrepared = true;
                callback(true);
            },
            false
        );
    }

    public setHostDivScrolling() {
        const self = this;
        if (!self.element) {
            return;
        }
        const hostDiv = self.element;
        if (self.childSurface.width > self.width) {
            hostDiv.style.overflowX = 'scroll';
        }
        else {
            hostDiv.style.overflowX = 'hidden';
        }
        if (self.childSurface.height > self.height) {
            hostDiv.style.overflowY = 'scroll';
        }
        else {
            hostDiv.style.overflowY = 'hidden';
        }
    }

    /**
     * Swaps existing child surface with a new child surface, prepares its resources
     * and calls completion callback
     * @param newChild - New child surface
     * @param callback - Callback (pane: Pane)
     */
    public replaceSurface(
        newChild: Surface,
        callback: (pane: PaneContainerLike) => void,
        transition?: string,
        duration?: number
    ) {
        const oldChild = this.childSurface;
        const onTransitionComplete = (pane: PaneContainerLike) => {
            this.activeTransition = undefined;
            callback(pane);
        };
        try {
            if (transition !== undefined && duration !== undefined) {
                switch (transition.toLowerCase()) {
                    case 'fade':
                        {
                            const t = new PaneTransitionFade(this, newChild, onTransitionComplete, duration);
                            this.startTransition(t);
                        }
                        break;

                case 'pushleft':
                    {
                        const t = new PaneTransitionPush(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Left
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'pushright':
                    {
                        const t = new PaneTransitionPush(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Right
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'pushup':
                    {
                        const t = new PaneTransitionPush(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Up
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'pushdown':
                    {
                        const t = new PaneTransitionPush(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Down
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wipeleft':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Left
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wipeleftup':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.LeftUp
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wipeleftdown':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.LeftDown
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wiperight':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Right
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wiperightup':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.RightUp
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wiperightdown':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.RightDown
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wipeup':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Up
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wipedown':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Down
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wipein':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.In
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wipeinx':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.InX
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wipeiny':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.InY
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wipeout':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Out
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wipeoutx':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.OutX
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'wipeouty':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.OutY
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'revealleft':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Left
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'revealleftup':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.LeftUp
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'revealleftdown':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.LeftDown
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'revealright':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Right
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'revealrightup':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.RightUp
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'revealrightdown':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.RightDown
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'revealup':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Up
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'revealdown':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Down
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'slideleft':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Left
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'slideleftup':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.LeftUp
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'slideleftdown':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.LeftDown
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'slideright':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Right
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'sliderightup':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.RightUp
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'sliderightdown':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.RightDown
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'slideup':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Up
                        );
                        this.startTransition(t);
                    }
                    break;

                case 'slidedown':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            onTransitionComplete,
                            duration,
                            PaneTransitionDirection.Down
                        );
                        this.startTransition(t);
                    }
                    break;

                    default:
                        {
                            const t = new PaneTransitionNone(this, newChild, onTransitionComplete);
                            this.startTransition(t);
                        }
                        break;
                }
            }
            else {
                const t = new PaneTransitionNone(this, newChild, onTransitionComplete);
                this.startTransition(t);
            }
        }
        catch (error) {
            this.activeTransition = undefined;
            if (this.childSurface !== oldChild) {
                this.childSurface.unbind();
                this.childSurface = oldChild;
            }
            throw error;
        }

        /*
        let self = this;
        let oldChild = self.childSurface;
        oldChild.resourceListenerEvent.clear();
        self.childSurface = newChild;
        newChild.scale = self.surface.scale;
        newChild.isChild = true;
        self.childSurface.bind(self.element, function (model) {
            oldChild.unbind();
            self.isPrepared = true;
            self.setHostDivScrolling();
            if (callback) {
                callback(self);
            }
        });
        */
    }

    /**
     * Unloads child surface element
     */
    public destroy() {
        this.cancelTransition();
        if (this.childSurface) {
            this.childSurface.unbind();
        }
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
        const hostDiv = this.element as HTMLDivElement;
        hostDiv.style.left = this.translateX + this.left * scale + 'px';
        hostDiv.style.top = this.translateY + this.top * scale + 'px';
        hostDiv.style.width = this.width * scale + 'px';
        hostDiv.style.height = this.height * scale + 'px';
        if (this.childSurface) {
            this.childSurface.scale = scale;
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

    /**
     * Serializes persistent pane properties to a new object
     * @returns Serialized pane data
     */
    public serialize(): SerializedData {
        const o = super.serialize();
        o.type = 'surfacePane';
        if (this.childSurfaceId) {
            o.childSurfaceId = this.childSurfaceId;
        } else if (this.childSurface) {
            o.childSurface = this.childSurface.serialize();
        }
        if (this.transition) {
            o.transition = this.transition;
        }
        if (this.transitionDuration !== undefined) {
            o.transitionDuration = this.transitionDuration;
        }
        return o;
    }

    /**
     * Parses serialized data into pane properties
     * @param o - Serialized pane data
     */
    public parse(o: SerializedData): void {
        super.parse(o);
        if (o.childSurfaceId !== undefined) {
            this.childSurfaceId = o.childSurfaceId as string;
        }
        if (o.childSurface !== undefined) {
            const surfData = o.childSurface as SerializedData;
            const childSurface = new Surface(
                surfData.width as number,
                surfData.height as number,
                surfData.id as string | undefined,
                surfData.scale as number | undefined
            );
            childSurface.parseData(surfData);
            this.childSurface = childSurface;
            this.childSurface.isChild = true;
        }
        if (o.transition !== undefined) {
            this.transition = o.transition as string;
        }
        if (o.transitionDuration !== undefined) {
            this.transitionDuration = o.transitionDuration as number;
        }
    }
}

