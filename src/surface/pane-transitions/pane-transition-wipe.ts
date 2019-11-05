import { ErrorMessages } from '../../core/error-messages';
import { TransitionRenderer } from '../../transitions/transitions';
import { Surface } from '../surface';
import { SurfacePane } from '../surface-pane';
import { PaneTransition } from './pane-transition';
import { PaneTransitionDirection } from './pane-transition-direction';

export class PaneTransitionWipe extends PaneTransition {
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

        let onBottom = true;

        switch (this.direction) {
            case PaneTransitionDirection.Out:
            case PaneTransitionDirection.OutX:
            case PaneTransitionDirection.OutY:
                onBottom = false;
                break;
        }

        self.bind(surface => {
            if (!self.pane.surface) {
                throw new Error(ErrorMessages.PaneSurfaceIsUndefined);
            }
            if (!self.target.div) {
                throw new Error(ErrorMessages.HostElementUndefined);
            }

            const scale = self.pane.surface.scale;

            switch (self.direction) {
                case PaneTransitionDirection.Out:
                    {
                        const halfX = self.pane.width * scale / 2;
                        const halfY = self.pane.height * scale / 2;
                        self.target.div.style.clip =
                            'rect(' + halfY + 'px, ' + halfX + 'px, ' + halfY + 'px, ' + halfX + 'px)';
                    }
                    break;

                case PaneTransitionDirection.OutX:
                    {
                        const halfX = self.pane.width * scale / 2;
                        self.target.div.style.clip =
                            'rect(' + 0 + 'px, ' + halfX + 'px, ' + self.pane.height * scale + 'px, ' + halfX + 'px)';
                    }
                    break;

                case PaneTransitionDirection.OutY:
                    {
                        const halfY = self.pane.height * scale / 2;
                        self.target.div.style.clip =
                            'rect(' + halfY + 'px, ' + self.pane.width * scale + 'px, ' + halfY + 'px, ' + 0 + 'px)';
                    }
                    break;
            }

            // Save start time after preparation
            self.startTime = performance.now();

            // Fade in
            self.timer = setInterval(self.tick, 15);
        }, onBottom);
    }

    public tick() {
        if (!this.startTime || !this.source) {
            return;
        }
        if (!this.source.div) {
            throw new Error(ErrorMessages.SourceUndefined);
        }
        if (!this.target.div) {
            throw new Error(ErrorMessages.TargetIsUndefined);
        }
        if (!this.pane.surface) {
            throw new Error(ErrorMessages.PaneSurfaceIsUndefined);
        }

        // Get elapsed time since start
        const elapsed: number = performance.now() - this.startTime;

        // Map elapsed time to offset
        let offset: number = elapsed / (this.duration * 1000);

        if (offset >= 1 || isNaN(offset)) {
            switch (this.direction) {
                case PaneTransitionDirection.Out:
                case PaneTransitionDirection.OutX:
                case PaneTransitionDirection.OutY:
                    this.target.div.style.clip = '';

                    break;

                default:
                    this.source.div.style.clip = '';
                    break;
            }

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

            const scale = this.pane.surface.scale;

            switch (this.direction) {
                case PaneTransitionDirection.Left:
                    {
                        const offsetX = Math.floor(offset * this.pane.width * this.pane.surface.scale);
                        this.source.div.style.clip =
                            'rect(' +
                            0 +
                            'px, ' +
                            (this.pane.width * scale - offsetX) +
                            'px, ' +
                            this.pane.height * scale +
                            'px, ' +
                            0 +
                            'px)';
                    }
                    break;

                case PaneTransitionDirection.LeftUp:
                    {
                        const offsetX = Math.floor(offset * this.pane.width * this.pane.surface.scale);
                        const offsetY = Math.floor(offset * this.pane.height * this.pane.surface.scale);
                        this.source.div.style.clip =
                            'rect(' +
                            0 +
                            'px, ' +
                            (this.pane.width * scale - offsetX) +
                            'px, ' +
                            (this.pane.height * scale - offsetY) +
                            'px, ' +
                            0 +
                            'px)';
                    }
                    break;

                case PaneTransitionDirection.LeftDown:
                    {
                        const offsetX = Math.floor(offset * this.pane.width * this.pane.surface.scale);
                        const offsetY = Math.floor(offset * this.pane.height * this.pane.surface.scale);
                        this.source.div.style.clip =
                            'rect(' +
                            offsetY +
                            'px, ' +
                            (this.pane.width * scale - offsetX) +
                            'px, ' +
                            this.pane.height * scale +
                            'px, ' +
                            0 +
                            'px)';
                    }
                    break;

                case PaneTransitionDirection.Right:
                    {
                        const offsetX = Math.floor(offset * this.pane.width * this.pane.surface.scale);
                        this.source.div.style.clip =
                            'rect(' +
                            0 +
                            'px, ' +
                            this.pane.width * scale +
                            'px, ' +
                            this.pane.height * scale +
                            'px, ' +
                            offsetX +
                            'px)';
                    }
                    break;

                case PaneTransitionDirection.RightUp:
                    {
                        const offsetX = Math.floor(offset * this.pane.width * this.pane.surface.scale);
                        const offsetY = Math.floor(offset * this.pane.height * this.pane.surface.scale);
                        this.source.div.style.clip =
                            'rect(' +
                            0 +
                            'px, ' +
                            this.pane.width * scale +
                            'px, ' +
                            (this.pane.height * scale - offsetY) +
                            'px, ' +
                            offsetX +
                            'px)';
                    }
                    break;

                case PaneTransitionDirection.RightDown:
                    {
                        const offsetX = Math.floor(offset * this.pane.width * this.pane.surface.scale);
                        const offsetY = Math.floor(offset * this.pane.height * this.pane.surface.scale);
                        this.source.div.style.clip =
                            'rect(' +
                            offsetY +
                            'px, ' +
                            this.pane.width * scale +
                            'px, ' +
                            this.pane.height * scale +
                            'px, ' +
                            offsetX +
                            'px)';
                    }
                    break;

                case PaneTransitionDirection.Up:
                    {
                        const offsetY = Math.floor(offset * this.pane.height * this.pane.surface.scale);
                        this.source.div.style.clip =
                            'rect(' +
                            0 +
                            'px, ' +
                            this.pane.width * scale +
                            'px, ' +
                            (this.pane.height * scale - offsetY) +
                            'px, ' +
                            0 +
                            'px)';
                    }
                    break;

                case PaneTransitionDirection.Down:
                    {
                        const offsetY = Math.floor(offset * this.pane.height * this.pane.surface.scale);
                        this.source.div.style.clip =
                            'rect(' +
                            offsetY +
                            'px, ' +
                            this.pane.width * scale +
                            'px, ' +
                            this.pane.height * scale +
                            'px, ' +
                            0 +
                            'px)';
                    }
                    break;

                case PaneTransitionDirection.Out:
                    {
                        const halfX = this.pane.width * scale / 2;
                        const halfY = this.pane.height * scale / 2;
                        const offsetX = Math.floor(offset * this.pane.width * this.pane.surface.scale / 2);
                        const offsetY = Math.floor(offset * this.pane.height * this.pane.surface.scale / 2);
                        this.target.div.style.clip =
                            'rect(' +
                            (halfY - offsetY) +
                            'px, ' +
                            (halfX + offsetX) +
                            'px, ' +
                            (halfY + offsetY) +
                            'px, ' +
                            (halfX - offsetX) +
                            'px)';
                    }
                    break;

                case PaneTransitionDirection.OutX:
                    {
                        const halfX = this.pane.width * scale / 2;
                        const height = this.pane.height * scale;
                        const offsetX = Math.floor(offset * this.pane.width * this.pane.surface.scale / 2);
                        this.target.div.style.clip =
                            'rect(' +
                            0 +
                            'px, ' +
                            (halfX + offsetX) +
                            'px, ' +
                            height +
                            'px, ' +
                            (halfX - offsetX) +
                            'px)';
                    }
                    break;

                case PaneTransitionDirection.OutY:
                    {
                        const width = this.pane.width * scale;
                        const halfY = this.pane.height * scale / 2;
                        const offsetY = Math.floor(offset * this.pane.height * this.pane.surface.scale / 2);
                        this.target.div.style.clip =
                            'rect(' +
                            (halfY - offsetY) +
                            'px, ' +
                            width +
                            'px, ' +
                            (halfY + offsetY) +
                            'px, ' +
                            0 +
                            'px)';
                    }
                    break;

                case PaneTransitionDirection.In:
                    {
                        const width = this.pane.width * scale;
                        const height = this.pane.height * scale;
                        const offsetX = Math.floor(offset * this.pane.width * this.pane.surface.scale / 2);
                        const offsetY = Math.floor(offset * this.pane.height * this.pane.surface.scale / 2);
                        this.source.div.style.clip =
                            'rect(' +
                            offsetY +
                            'px, ' +
                            (width - offsetX) +
                            'px, ' +
                            (height - offsetY) +
                            'px, ' +
                            offsetX +
                            'px)';
                    }
                    break;

                case PaneTransitionDirection.InX:
                    {
                        const width = this.pane.width * scale;
                        const height = this.pane.height * scale;
                        const offsetX = Math.floor(offset * this.pane.width * this.pane.surface.scale / 2);
                        this.source.div.style.clip =
                            'rect(' + 0 + 'px, ' + (width - offsetX) + 'px, ' + height + 'px, ' + offsetX + 'px)';
                    }
                    break;

                case PaneTransitionDirection.InY:
                    {
                        const width = this.pane.width * scale;
                        const height = this.pane.height * scale;
                        const offsetY = Math.floor(offset * this.pane.height * this.pane.surface.scale / 2);
                        this.source.div.style.clip =
                            'rect(' + offsetY + 'px, ' + width + 'px, ' + (height - offsetY) + 'px, ' + 0 + 'px)';
                    }
                    break;
            }
        }
    }
}
