import { Pane } from '../pane';
import { Surface } from '../surface';
import { PaneTransition } from './pane-transition';
/*
  NoTransition
*/
export class NoTransition extends PaneTransition {
    constructor(pane: Pane, target: Surface, callback: (pane: Pane) => void) {
        super(pane, target, callback);
    }

    public start() {
        const self = this;
        const source = self.pane.childSurface;
        self.onStart();
        self.bind((surface) => {
            source.unbind();
            self.onComplete();
        }, false);
    }
}
