import { TransitionRenderer } from '../../transitions/transitions';
import { Pane } from '../pane';
import { Surface } from '../surface';
import { PaneTransition } from './pane-transition';
import { TransitionDirection } from './transition-direction';

export class PushTransition extends PaneTransition {
    public duration: number;
    public startTime?: number;
    public source?: Surface;
    public timer?: number;
    public direction: TransitionDirection;

    constructor(
        pane: Pane,
        target: Surface,
        callback: (pane: Pane) => void,
        duration: number,
        direction: TransitionDirection
    ) {
        super(pane, target, callback);
        this.tick = this.tick.bind(this);
        this.duration = duration;
        this.direction = direction;
    }

    public start() {
        const self = this;
        self.source = self.pane.childSurface;
        self.onStart();

        switch (self.direction) {
            case TransitionDirection.Left:
                self.target.setTranslateX(self.pane.width);
                break;

            case TransitionDirection.Right:
                self.target.setTranslateX(-self.target.width);
                break;

            case TransitionDirection.Up:
                self.target.setTranslateY(self.pane.height);
                break;

            case TransitionDirection.Down:
                self.target.setTranslateY(-self.target.height);
                break;
        }
        self.bind((surface) => {
            // Save start time after preparation
            self.startTime = performance.now();

            // Fade in
            self.timer = setInterval(self.tick, 15);
        }, false);
    }

    public tick() {
        // Get elapsed time since start
        let elapsed = 0;
        if (!this.source) {
            return;
        }
        if (this.startTime) {
            elapsed = performance.now() - this.startTime;
        }

        // Map elapsed time to offset
        let offset: number = elapsed / (this.duration * 1000);

        if (offset >= 1 || isNaN(offset)) {
            this.target.setTranslateX(0);
            this.target.setTranslateY(0);
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

            switch (this.direction) {
                case TransitionDirection.Left:
                    {
                        const offsetX = offset * this.pane.width;
                        this.target.setTranslateX(this.pane.width - offsetX);
                        this.source.setTranslateX(-offsetX);
                    }
                    break;

                case TransitionDirection.Right:
                    {
                        const offsetX = offset * this.target.width;
                        this.target.setTranslateX(-this.target.width + offsetX);
                        this.source.setTranslateX(offsetX);
                    }
                    break;

                case TransitionDirection.Up:
                    {
                        const offsetY = offset * this.pane.height;
                        this.target.setTranslateY(this.pane.height - offsetY);
                        this.source.setTranslateY(-offsetY);
                    }
                    break;

                case TransitionDirection.Down:
                    {
                        const offsetY = offset * this.target.height;
                        this.target.setTranslateY(-this.target.height + offsetY);
                        this.source.setTranslateY(offsetY);
                    }
                    break;
            }
        }
    }
}
