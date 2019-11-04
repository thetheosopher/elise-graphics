import {TransitionRenderer} from '../../transitions/transitions';
import {Surface} from '../surface';
import {SurfacePane} from '../surface-pane';
import {PaneTransition} from './pane-transition';
import {PaneTransitionDirection} from './pane-transition-direction';

export class PaneTransitionPush extends PaneTransition {
    public duration: number;
    public startTime?: number;
    public source?: Surface;
    public timer?: number;
    public direction: PaneTransitionDirection;

    constructor(
        pane: SurfacePane,
        target: Surface,
        callback: (pane: SurfacePane) => void,
        duration: number,
        direction: PaneTransitionDirection
    ) {
        super(pane, target, callback);
        this.duration = duration;
        this.direction = direction;

        this.tick = this.tick.bind(this);
    }

    public start() {
        const self = this;
        self.source = self.pane.childSurface;
        self.onStart();

        switch (self.direction) {
            case PaneTransitionDirection.Left:
                self.target.setTranslateX(self.pane.width);
                break;

            case PaneTransitionDirection.Right:
                self.target.setTranslateX(-self.target.width);
                break;

            case PaneTransitionDirection.Up:
                self.target.setTranslateY(self.pane.height);
                break;

            case PaneTransitionDirection.Down:
                self.target.setTranslateY(-self.target.height);
                break;
        }
        self.bind(surface => {
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

            switch (this.direction) {
                case PaneTransitionDirection.Left:
                    {
                        const offsetX = offset * this.pane.width;
                        this.target.setTranslateX(this.pane.width - offsetX);
                        this.source.setTranslateX(-offsetX);
                    }
                    break;

                case PaneTransitionDirection.Right:
                    {
                        const offsetX = offset * this.target.width;
                        this.target.setTranslateX(-this.target.width + offsetX);
                        this.source.setTranslateX(offsetX);
                    }
                    break;

                case PaneTransitionDirection.Up:
                    {
                        const offsetY = offset * this.pane.height;
                        this.target.setTranslateY(this.pane.height - offsetY);
                        this.source.setTranslateY(-offsetY);
                    }
                    break;

                case PaneTransitionDirection.Down:
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
