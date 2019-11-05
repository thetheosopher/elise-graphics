import { ErrorMessages } from '../core/error-messages';
import { Utility } from '../core/utility';
import { PaneTransitionDirection } from './pane-transitions/pane-transition-direction';
import { PaneTransitionFade } from './pane-transitions/pane-transition-fade';
import { PaneTransitionNone } from './pane-transitions/pane-transition-none';
import { PaneTransitionPush } from './pane-transitions/pane-transition-push';
import { PaneTransitionReveal } from './pane-transitions/pane-transition-reveal';
import { PaneTransitionSlide } from './pane-transitions/pane-transition-slide';
import { PaneTransitionWipe } from './pane-transitions/pane-transition-wipe';
import { Surface } from './surface';
import { SurfaceLayer } from './surface-layer';

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
     * Host HTML div element
     */
    public element?: HTMLDivElement;

    /**
     * Hosts a child surface in a parent surface layer
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
        this.setHostDivScrolling = this.setHostDivScrolling.bind(this);
        this.childSurface = childSurface;
        this.childSurface.isChild = true;
    }

    // tslint:disable-next-line:no-empty
    public onload(): void {}

    // tslint:disable-next-line:no-empty
    public onunload(): void {}

    /**
     * Adds pane to parent surface
     */
    public addToSurface(surface: Surface) {
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
                self.childSurface.resourceListenerEvent.add(listener);
            });
        }
        self.childSurface.bind(
            self.element,
            surface => {
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
        callback: (pane: SurfacePane) => void,
        transition?: string,
        duration?: number
    ) {
        if (transition !== undefined && duration !== undefined) {
            switch (transition.toLowerCase()) {
                case 'fade':
                    {
                        const t = new PaneTransitionFade(this, newChild, callback, duration);
                        t.start();
                    }
                    break;

                case 'pushleft':
                    {
                        const t = new PaneTransitionPush(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Left
                        );
                        t.start();
                    }
                    break;

                case 'pushright':
                    {
                        const t = new PaneTransitionPush(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Right
                        );
                        t.start();
                    }
                    break;

                case 'pushup':
                    {
                        const t = new PaneTransitionPush(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Up
                        );
                        t.start();
                    }
                    break;

                case 'pushdown':
                    {
                        const t = new PaneTransitionPush(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Down
                        );
                        t.start();
                    }
                    break;

                case 'wipeleft':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Left
                        );
                        t.start();
                    }
                    break;

                case 'wipeleftup':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.LeftUp
                        );
                        t.start();
                    }
                    break;

                case 'wipeleftdown':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.LeftDown
                        );
                        t.start();
                    }
                    break;

                case 'wiperight':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Right
                        );
                        t.start();
                    }
                    break;

                case 'wiperightup':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.RightUp
                        );
                        t.start();
                    }
                    break;

                case 'wiperightdown':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.RightDown
                        );
                        t.start();
                    }
                    break;

                case 'wipeup':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Up
                        );
                        t.start();
                    }
                    break;

                case 'wipedown':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Down
                        );
                        t.start();
                    }
                    break;

                case 'wipein':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.In
                        );
                        t.start();
                    }
                    break;

                case 'wipeinx':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.InX
                        );
                        t.start();
                    }
                    break;

                case 'wipeiny':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.InY
                        );
                        t.start();
                    }
                    break;

                case 'wipeout':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Out
                        );
                        t.start();
                    }
                    break;

                case 'wipeoutx':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.OutX
                        );
                        t.start();
                    }
                    break;

                case 'wipeouty':
                    {
                        const t = new PaneTransitionWipe(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.OutY
                        );
                        t.start();
                    }
                    break;

                case 'revealleft':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Left
                        );
                        t.start();
                    }
                    break;

                case 'revealleftup':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.LeftUp
                        );
                        t.start();
                    }
                    break;

                case 'revealleftdown':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.LeftDown
                        );
                        t.start();
                    }
                    break;

                case 'revealright':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Right
                        );
                        t.start();
                    }
                    break;

                case 'revealrightup':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.RightUp
                        );
                        t.start();
                    }
                    break;

                case 'revealrightdown':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.RightDown
                        );
                        t.start();
                    }
                    break;

                case 'revealup':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Up
                        );
                        t.start();
                    }
                    break;

                case 'revealdown':
                    {
                        const t = new PaneTransitionReveal(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Down
                        );
                        t.start();
                    }
                    break;

                case 'slideleft':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Left
                        );
                        t.start();
                    }
                    break;

                case 'slideleftup':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.LeftUp
                        );
                        t.start();
                    }
                    break;

                case 'slideleftdown':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.LeftDown
                        );
                        t.start();
                    }
                    break;

                case 'slideright':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Right
                        );
                        t.start();
                    }
                    break;

                case 'sliderightup':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.RightUp
                        );
                        t.start();
                    }
                    break;

                case 'sliderightdown':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.RightDown
                        );
                        t.start();
                    }
                    break;

                case 'slideup':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Up
                        );
                        t.start();
                    }
                    break;

                case 'slidedown':
                    {
                        const t = new PaneTransitionSlide(
                            this,
                            newChild,
                            callback,
                            duration,
                            PaneTransitionDirection.Down
                        );
                        t.start();
                    }
                    break;

                default:
                    {
                        const t = new PaneTransitionNone(this, newChild, callback);
                        t.start();
                    }
                    break;
            }
        }
        else {
            const t = new PaneTransitionNone(this, newChild, callback);
            t.start();
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
        if (this.childSurface) {
            this.childSurface.unbind();
        }
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
}
