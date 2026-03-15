import type { SpriteElement } from '../elements/sprite-element';
import { SurfaceViewController } from './surface-view-controller';

interface SurfaceAnimationLayer {
    frameIndex: number;
    sprite?: SpriteElement;
    onAnimationClick(): void;
    onAnimationAdvance(): void;
}

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
