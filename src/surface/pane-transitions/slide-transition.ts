import { TransitionRenderer } from '../../transitions/transitions';
import { Pane } from '../pane';
import { Surface } from '../surface';
import { PaneTransition } from './pane-transition';
import { TransitionDirection } from './transition-direction';

export class SlideTransition extends PaneTransition {
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

        self.bind((surface) => {
            if(!self.source) {
                throw new Error('Source is undefined.');
            }
            switch (self.direction) {
                case TransitionDirection.Left:
                    {
                        self.target.setTranslateX(self.pane.width);
                    }
                    break;

                case TransitionDirection.LeftUp:
                    {
                        self.target.setTranslateX(self.pane.width);
                        self.target.setTranslateY(self.pane.height);
                    }
                    break;

                case TransitionDirection.LeftDown:
                    {
                        self.target.setTranslateX(self.pane.width);
                        self.target.setTranslateY(-self.target.height);
                    }
                    break;

                case TransitionDirection.Right:
                    {
                        self.target.setTranslateX(-self.source.width);
                    }
                    break;

                case TransitionDirection.RightUp:
                    {
                        self.target.setTranslateX(-self.source.width);
                        self.target.setTranslateY(self.pane.height);
                    }
                    break;

                case TransitionDirection.RightDown:
                    {
                        self.target.setTranslateX(-self.source.width);
                        self.target.setTranslateY(-self.source.height);
                    }
                    break;

                case TransitionDirection.Up:
                    {
                        self.target.setTranslateY(self.pane.height);
                    }
                    break;

                case TransitionDirection.Down:
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
        if(!this.startTime) {
            throw new Error('Start time is undefined.');
        }
        if(!this.source) {
            throw new Error('Source is undefined.');
        }
        const elapsed: number = performance.now() - this.startTime;

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
                        const offsetX = Math.floor(offset * this.pane.width);
                        this.target.setTranslateX(this.pane.width - offsetX);
                    }
                    break;

                case TransitionDirection.LeftUp:
                    {
                        const offsetX = Math.floor(offset * this.pane.width);
                        const offsetY = Math.floor(offset * this.pane.height);
                        this.target.setTranslateX(this.pane.width - offsetX);
                        this.target.setTranslateY(this.pane.height - offsetY);
                    }
                    break;

                case TransitionDirection.LeftDown:
                    {
                        const offsetX = Math.floor(offset * this.pane.width);
                        const offsetY = Math.floor(offset * this.target.height);
                        this.target.setTranslateX(this.pane.width - offsetX);
                        this.target.setTranslateY(offsetY - this.target.height);
                    }
                    break;

                case TransitionDirection.Right:
                    {
                        const offsetX = Math.floor(offset * this.source.width);
                        this.target.setTranslateX(offsetX - this.source.width);
                    }
                    break;

                case TransitionDirection.RightUp:
                    {
                        const offsetX = Math.floor(offset * this.source.width);
                        const offsetY = Math.floor(offset * this.pane.height);
                        this.target.setTranslateX(offsetX - this.source.width);
                        this.target.setTranslateY(this.pane.height - offsetY);
                    }
                    break;

                case TransitionDirection.RightDown:
                    {
                        const offsetX = Math.floor(offset * this.source.width);
                        const offsetY = Math.floor(offset * this.target.height);
                        this.target.setTranslateX(offsetX - this.source.width);
                        this.target.setTranslateY(offsetY - this.target.height);
                    }
                    break;

                case TransitionDirection.Up:
                    {
                        const offsetY = Math.floor(offset * this.pane.height);
                        this.target.setTranslateY(this.pane.height - offsetY);
                    }
                    break;

                case TransitionDirection.Down:
                    {
                        const offsetY = Math.floor(offset * this.target.height);
                        this.target.setTranslateY(offsetY - this.target.height);
                    }
                    break;
            }
        }
    }
}