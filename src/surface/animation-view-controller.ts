import { Animation } from './animation';
import { SurfaceViewController } from './surface-view-controller';

export class AnimationViewController extends SurfaceViewController {
    /**
     * Controlled animation
     */
    public animation?: Animation;

    /**
     * Extends SurfaceViewController to add animation property
     */
    constructor() {
        super();
    }
}
