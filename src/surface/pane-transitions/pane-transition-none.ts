import { PaneTransition } from './pane-transition';
import type { PaneContainerLike, PaneSurfaceLike } from './pane-transition';
/**
 * Dummy (No) Pane Transition
 */
export class PaneTransitionNone extends PaneTransition {
    constructor(pane: PaneContainerLike, target: PaneSurfaceLike, callback: (pane: PaneContainerLike) => void) {
        super(pane, target, callback);
    }

    public start() {
        const self = this;
        if (!self.pane) {
            return;
        }
        const source = self.pane.childSurface;
        self.onStart();
        self.bind(_surface => {
            source.unbind();
            self.onComplete();
        }, false);
    }
}
