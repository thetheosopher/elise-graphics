import { ErrorMessages } from '../../core/error-messages';
import { TransitionRenderer } from '../../transitions/transitions';
import { Surface } from '../surface';
import { SurfacePane } from '../surface-pane';
import { PaneTransition } from './pane-transition';
import { PaneTransitionDirection } from './pane-transition-direction';

export class PaneTransitionSlide extends PaneTransition {
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

        self.bind((surface) => {
            if (!self.source) {
                throw new Error(ErrorMessages.SourceUndefined);
            }
            switch (self.direction) {
                case PaneTransitionDirection.Left:
                    {
                        self.target.setTranslateX(self.pane.width);
                    }
                    break;

                case PaneTransitionDirection.LeftUp:
                    {
                        self.target.setTranslateX(self.pane.width);
                        self.target.setTranslateY(self.pane.height);
                    }
                    break;

                case PaneTransitionDirection.LeftDown:
                    {
                        self.target.setTranslateX(self.pane.width);
                        self.target.setTranslateY(-self.target.height);
                    }
                    break;

                case PaneTransitionDirection.Right:
                    {
                        self.target.setTranslateX(-self.source.width);
                    }
                    break;

                case PaneTransitionDirection.RightUp:
                    {
                        self.target.setTranslateX(-self.source.width);
                        self.target.setTranslateY(self.pane.height);
                    }
                    break;

                case PaneTransitionDirection.RightDown:
                    {
                        self.target.setTranslateX(-self.source.width);
                        self.target.setTranslateY(-self.source.height);
                    }
                    break;

                case PaneTransitionDirection.Up:
                    {
                        self.target.setTranslateY(self.pane.height);
                    }
                    break;

                case PaneTransitionDirection.Down:
                    {
                        self.target.setTranslateY(-self.source.height);
                    }
                    break;
            }

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
                        const offsetX = Math.floor(offset * this.pane.width);
                        this.target.setTranslateX(this.pane.width - offsetX);
                    }
                    break;

                case PaneTransitionDirection.LeftUp:
                    {
                        const offsetX = Math.floor(offset * this.pane.width);
                        const offsetY = Math.floor(offset * this.pane.height);
                        this.target.setTranslateX(this.pane.width - offsetX);
                        this.target.setTranslateY(this.pane.height - offsetY);
                    }
                    break;

                case PaneTransitionDirection.LeftDown:
                    {
                        const offsetX = Math.floor(offset * this.pane.width);
                        const offsetY = Math.floor(offset * this.target.height);
                        this.target.setTranslateX(this.pane.width - offsetX);
                        this.target.setTranslateY(offsetY - this.target.height);
                    }
                    break;

                case PaneTransitionDirection.Right:
                    {
                        const offsetX = Math.floor(offset * this.source.width);
                        this.target.setTranslateX(offsetX - this.source.width);
                    }
                    break;

                case PaneTransitionDirection.RightUp:
                    {
                        const offsetX = Math.floor(offset * this.source.width);
                        const offsetY = Math.floor(offset * this.pane.height);
                        this.target.setTranslateX(offsetX - this.source.width);
                        this.target.setTranslateY(this.pane.height - offsetY);
                    }
                    break;

                case PaneTransitionDirection.RightDown:
                    {
                        const offsetX = Math.floor(offset * this.source.width);
                        const offsetY = Math.floor(offset * this.target.height);
                        this.target.setTranslateX(offsetX - this.source.width);
                        this.target.setTranslateY(offsetY - this.target.height);
                    }
                    break;

                case PaneTransitionDirection.Up:
                    {
                        const offsetY = Math.floor(offset * this.pane.height);
                        this.target.setTranslateY(this.pane.height - offsetY);
                    }
                    break;

                case PaneTransitionDirection.Down:
                    {
                        const offsetY = Math.floor(offset * this.target.height);
                        this.target.setTranslateY(offsetY - this.target.height);
                    }
                    break;
            }
        }
    }
}
