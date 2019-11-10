import { ErrorMessages } from '../../core/error-messages';
import { TransitionRenderer } from '../../transitions/transitions';
import { Surface } from '../surface';
import { SurfacePane } from '../surface-pane';
import { PaneTransition } from './pane-transition';
import { PaneTransitionDirection } from './pane-transition-direction';

export class PaneTransitionReveal extends PaneTransition {
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
        this.tick = this.tick.bind(this);
        this.duration = duration;
        this.direction = direction;
    }

    public start() {
        const self = this;
        self.source = self.pane.childSurface;
        self.onStart();

        self.bind(surface => {
            // Save start time after preparation
            self.startTime = performance.now();

            // Fade in
            self.timer = setInterval(self.tick, 15);
        }, true);
    }

    public tick() {
        if (!this.startTime) {
            throw new Error(ErrorMessages.StartTimeIsUndefined);
        }
        if (!this.source) {
            throw new Error(ErrorMessages.SourceUndefined);
        }
        // Get elapsed time since start
        const elapsed: number = performance.now() - this.startTime;

        // Map elapsed time to offset
        let offset: number = elapsed / (this.duration * 1000);

        if (offset >= 1 || isNaN(offset)) {
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
                        const offsetX = Math.floor(offset * this.source.width);
                        this.source.setTranslateX(-offsetX);
                    }
                    break;

                case PaneTransitionDirection.LeftUp:
                    {
                        const offsetX = Math.floor(offset * this.source.width);
                        const offsetY = Math.floor(offset * this.source.height);
                        this.source.setTranslateX(-offsetX);
                        this.source.setTranslateY(-offsetY);
                    }
                    break;

                case PaneTransitionDirection.LeftDown:
                    {
                        const offsetX = Math.floor(offset * this.source.width);
                        const offsetY = Math.floor(offset * this.source.height);
                        this.source.setTranslateX(-offsetX);
                        this.source.setTranslateY(offsetY);
                    }
                    break;

                case PaneTransitionDirection.Right:
                    {
                        const offsetX = Math.floor(offset * this.pane.width);
                        this.source.setTranslateX(offsetX);
                    }
                    break;

                case PaneTransitionDirection.RightUp:
                    {
                        const offsetX = Math.floor(offset * this.pane.width);
                        const offsetY = Math.floor(offset * this.source.height);
                        this.source.setTranslateX(offsetX);
                        this.source.setTranslateY(-offsetY);
                    }
                    break;

                case PaneTransitionDirection.RightDown:
                    {
                        const offsetX = Math.floor(offset * this.pane.width);
                        const offsetY = Math.floor(offset * this.source.height);
                        this.source.setTranslateX(offsetX);
                        this.source.setTranslateY(offsetY);
                    }
                    break;

                case PaneTransitionDirection.Up:
                    {
                        const offsetY = Math.floor(offset * this.source.height);
                        this.source.setTranslateY(-offsetY);
                    }
                    break;

                case PaneTransitionDirection.Down:
                    {
                        const offsetY = Math.floor(offset * this.source.height);
                        this.source.setTranslateY(offsetY);
                    }
                    break;
            }
        }
    }
}
