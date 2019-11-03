import { ErrorMessages } from '../../core/error-messages';
import { TransitionRenderer } from '../../transitions/transitions';
import { Surface } from '../surface';
import { SurfacePane } from '../surface-pane';
import { PaneTransition } from './pane-transition';

export class PaneTransitionFade extends PaneTransition {
    public duration: number;
    public startTime?: number;
    public source?: Surface;
    public timer?: number;

    constructor(pane: SurfacePane, target: Surface, callback: (pane: SurfacePane) => void, duration: number) {
        super(pane, target, callback);
        this.tick = this.tick.bind(this);
        this.duration = duration;
    }

    public start() {
        const self = this;
        self.source = self.pane.childSurface;
        self.onStart();
        self.target.setOpacity(0);
        self.bind((surface) => {
            // Save start time after preparation
            self.startTime = performance.now();

            // Fade in
            self.timer = setInterval(self.tick, 15);
        }, false);
    }

    public tick() {
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
                clearInterval(this.timer);
                delete this.timer;
            }
            this.source.unbind();
            this.onComplete();
        }
        else {
            // Apply easing
            offset = TransitionRenderer.easeInOutCubic(offset);

            this.target.setOpacity(offset);
            this.source.setOpacity(1 - offset);
        }
    }
}
