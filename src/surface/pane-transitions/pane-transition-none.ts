import { Surface } from '../surface';
import { SurfacePane } from '../surface-pane';
import { PaneTransition } from './pane-transition';
/*
  NoTransition
*/
export class PaneTransitionNone extends PaneTransition {
    constructor(pane: SurfacePane, target: Surface, callback: (pane: SurfacePane) => void) {
        super(pane, target, callback);
    }

    public start() {
        const self = this;
        const source = self.pane.childSurface;
        self.onStart();
        self.bind(surface => {
            source.unbind();
            self.onComplete();
        }, false);
    }
}
