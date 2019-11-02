import { ErrorMessages } from '../../core/error-messages';
import { TransitionRenderer } from '../../transitions/transitions';
import { Pane } from '../pane';
import { Surface } from '../surface';
import { PaneTransition } from './pane-transition';
import { TransitionDirection } from './transition-direction';

export class RevealTransition extends PaneTransition {
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
        this.duration = duration;
        this.direction = direction;

        this.tick = this.tick.bind(this);
    }

    public start() {
        const self = this;
        self.source = self.pane.childSurface;
        self.onStart();

        self.bind((surface) => {
            // Save start time after preparation
            self.startTime = performance.now();

            // Fade in
            self.timer = setInterval(self.tick, 15);
        }, true);
    }

    public tick() {
        if (!this.startTime) {
            throw new Error(ErrorMessages.StartTimeIsUndefined)
        }
        if(!this.source) {
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
                case TransitionDirection.Left:
                    {
                        const offsetX = Math.floor(offset * this.source.width);
                        this.source.setTranslateX(-offsetX);
                    }
                    break;

                case TransitionDirection.LeftUp:
                    {
                        const offsetX = Math.floor(offset * this.source.width);
                        const offsetY = Math.floor(offset * this.source.height);
                        this.source.setTranslateX(-offsetX);
                        this.source.setTranslateY(-offsetY);
                    }
                    break;

                case TransitionDirection.LeftDown:
                    {
                        const offsetX = Math.floor(offset * this.source.width);
                        const offsetY = Math.floor(offset * this.source.height);
                        this.source.setTranslateX(-offsetX);
                        this.source.setTranslateY(offsetY);
                    }
                    break;

                case TransitionDirection.Right:
                    {
                        const offsetX = Math.floor(offset * this.pane.width);
                        this.source.setTranslateX(offsetX);
                    }
                    break;

                case TransitionDirection.RightUp:
                    {
                        const offsetX = Math.floor(offset * this.pane.width);
                        const offsetY = Math.floor(offset * this.source.height);
                        this.source.setTranslateX(offsetX);
                        this.source.setTranslateY(-offsetY);
                    }
                    break;

                case TransitionDirection.RightDown:
                    {
                        const offsetX = Math.floor(offset * this.pane.width);
                        const offsetY = Math.floor(offset * this.source.height);
                        this.source.setTranslateX(offsetX);
                        this.source.setTranslateY(offsetY);
                    }
                    break;

                case TransitionDirection.Up:
                    {
                        const offsetY = Math.floor(offset * this.source.height);
                        this.source.setTranslateY(-offsetY);
                    }
                    break;

                case TransitionDirection.Down:
                    {
                        const offsetY = Math.floor(offset * this.source.height);
                        this.source.setTranslateY(offsetY);
                    }
                    break;
            }
        }
    }
}
