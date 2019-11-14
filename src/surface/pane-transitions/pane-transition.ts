import { ErrorMessages } from '../../core/error-messages';
import { Surface } from '../surface';
import { SurfacePane } from '../surface-pane';

/**
 * Base class for pane transitions
 */
export abstract class PaneTransition {
    public pane?: SurfacePane;
    public target?: Surface;
    public callback?: (pane: SurfacePane) => void;

    constructor(pane: SurfacePane, target: Surface, callback: (pane: SurfacePane) => void) {
        this.start = this.start.bind(this);
        this.onStart = this.onStart.bind(this);
        this.onComplete = this.onComplete.bind(this);
        this.bind = this.bind.bind(this);
        this.pane = pane;
        this.target = target;
        this.callback = callback;
    }

    public abstract start(): void;

    public onStart() {
        if (!this.pane || !this.target) {
            return;
        }
        if (!this.pane.surface) {
            throw new Error(ErrorMessages.PaneSurfaceIsUndefined);
        }
        this.pane.childSurface.resourceListenerEvent.clear();
        if (this.pane.element) {
            this.pane.element.style.overflow = 'hidden';
        }
        this.pane.childSurface = this.target;
        this.target.scale = this.pane.surface.scale;
        this.target.isChild = true;
        this.pane.isPrepared = false;
    }

    public onComplete() {
        const self = this;
        if (!self.pane || !self.target) {
            return;
        }
        if (self.callback) {
            self.callback(self.pane);
        }
        self.pane.isPrepared = true;
        self.pane.setHostDivScrolling();
        self.target.onload();
        self.pane = undefined;
        self.callback = undefined;
        self.target = undefined;
    }

    public bind(callback: (surface: Surface) => void, onBottom: boolean) {
        if (!this.pane || !this.target) {
            return;
        }
        const surface = this.target;
        const hostDiv = this.pane.element;
        if (!hostDiv) {
            throw new Error(ErrorMessages.HostElementUndefined);
        }
        if (surface.controller) {
            surface.onErrorInternal(ErrorMessages.SurfaceIsAlreadyBound);
            return;
        }
        surface.hostDiv = hostDiv;
        surface.createDiv(onBottom);
        if (surface.model) {
            surface.initializeController();
            if (callback) {
                callback(surface);
            }
        }
        else {
            surface.createModel(() => {
                if (surface.model) {
                    surface.initializeController();
                    if (callback) {
                        callback(surface);
                    }
                }
            });
        }
    }
}
