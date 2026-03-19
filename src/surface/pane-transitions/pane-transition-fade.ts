import { ErrorMessages } from '../../core/error-messages';
import { TransitionRenderer } from '../../transitions/transitions';
import { PaneTransition } from './pane-transition';
import type { PaneContainerLike, PaneSurfaceLike } from './pane-transition';

/**
 * Fade pane transition
 */
export class PaneTransitionFade extends PaneTransition {
    public duration: number;
    public startTime?: number;
    public source?: PaneSurfaceLike;
    public timer?: number;

    constructor(pane: PaneContainerLike, target: PaneSurfaceLike, callback: (pane: PaneContainerLike) => void, duration: number) {
        super(pane, target, callback);
        this.tick = this.tick.bind(this);
        this.duration = duration;
    }

    public start() {
        const self = this;
        if (!self.pane || !self.target) {
            return;
        }
        self.source = self.pane.childSurface;
        self.onStart();
        self.target.setOpacity(0);
        self.bind(surface => {
            if (self.shouldAbortBoundSurface(surface)) {
                return;
            }
            // Save start time after preparation
            self.startTime = performance.now();

            self.timer = requestAnimationFrame(self.tick);
        }, false);
    }

    protected onCancel() {
        if (this.timer !== undefined) {
            cancelAnimationFrame(this.timer);
            this.timer = undefined;
        }
        if (this.target) {
            this.target.setOpacity(1);
            this.target.setTranslateX(0);
            this.target.setTranslateY(0);
        }
        if (this.source) {
            this.source.setOpacity(1);
            this.source.setTranslateX(0);
            this.source.setTranslateY(0);
            this.source.unbind();
            this.source = undefined;
        }
    }

    public tick() {
        if (!this.target) {
            return;
        }
        // Get elapsed time since start
        if (!this.startTime) {
            throw new Error(ErrorMessages.StartTimeIsUndefined);
        }
        if (!this.source) {
            throw new Error(ErrorMessages.SourceUndefined);
        }
        const elapsed: number = performance.now() - this.startTime;

        // Map elapsed time to offset
        let offset: number = elapsed / (this.duration * 1000);

        if (offset >= 1 || isNaN(offset)) {
            this.target.setOpacity(1);
            if (this.timer) {
                cancelAnimationFrame(this.timer);
                this.timer = undefined;
            }
            this.source.unbind();
            this.onComplete();
        }
        else {
            // Apply easing
            offset = TransitionRenderer.easeInOutCubic(offset);

            this.target.setOpacity(offset);
            this.source.setOpacity(1 - offset);
            this.timer = requestAnimationFrame(this.tick);
        }
    }
}
