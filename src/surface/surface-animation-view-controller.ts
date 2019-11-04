import {SurfaceAnimationLayer} from './surface-animation-layer';
import {SurfaceViewController} from './surface-view-controller';

export class SurfaceAnimationViewController extends SurfaceViewController {
    /**
     * Controlled animation
     */
    public animation?: SurfaceAnimationLayer;

    /**
     * Extends SurfaceViewController to add animation property
     */
    constructor() {
        super();
    }
}
