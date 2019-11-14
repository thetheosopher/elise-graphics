import { SurfaceAnimationLayer } from './surface-animation-layer';
import { SurfaceViewController } from './surface-view-controller';

/**
 * Extends SurfaceViewController to add animation property
 */
export class SurfaceAnimationViewController extends SurfaceViewController {
    /**
     * Controlled animation
     */
    public animation?: SurfaceAnimationLayer;

    constructor() {
        super();
    }
}
