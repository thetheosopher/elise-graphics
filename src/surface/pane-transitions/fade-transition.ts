import { TransitionRenderer } from '../../transitions/transitions';
import { Pane } from '../pane';
import { Surface } from '../surface';
import { PaneTransition } from './pane-transition';

export class FadeTransition extends PaneTransition {
    public duration: number;
    public startTime?: number;
    public source?: Surface;
    public timer?: number;

    constructor(pane: Pane, target: Surface, callback: (pane: Pane) => void, duration: number) {
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
        if(!this.startTime) {
            throw new Error('Start time is undefined.')
        }
        if(!this.source) {
            throw new Error('Source is undefined.');
        }
        const elapsed: number = performance.now() - this.startTime;

        // Map elapsed time to offset
        let offset: number = elapsed / (this.duration * 1000);

        if (offset >= 1 || isNaN(offset)) {
            this.target.setOpacity(1);
            if(this.timer) {
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
