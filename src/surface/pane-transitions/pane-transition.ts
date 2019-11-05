import { ErrorMessages } from '../../core/error-messages';
import { Surface } from '../surface';
import { SurfacePane } from '../surface-pane';

export abstract class PaneTransition {
    public pane: SurfacePane;
    public target: Surface;
    public callback: (pane: SurfacePane) => void;

    constructor(pane: SurfacePane, target: Surface, callback: (pane: SurfacePane) => void) {
        this.pane = pane;
        this.target = target;
        this.callback = callback;

        this.start = this.start.bind(this);
        this.onStart = this.onStart.bind(this);
        this.onComplete = this.onComplete.bind(this);
        this.bind = this.bind.bind(this);
    }

    public abstract start(): void;

    public onStart() {
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
        if (self.callback) {
            self.callback(self.pane);
        }
        self.pane.isPrepared = true;
        self.pane.setHostDivScrolling();
        self.target.onload();
        delete self.pane;
        delete self.callback;
        delete self.target;
    }

    public bind(callback: (surface: Surface) => void, onBottom: boolean) {
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
