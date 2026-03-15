import { ViewController } from '../view/view-controller';
import type { SurfaceLike } from './surface-element';

/**
 * Extends ViewController to add surface property
 */
export class SurfaceViewController extends ViewController {
    /**
     * Controlled surface
     */
    public surface?: SurfaceLike;

    constructor() {
        super();
    }
}
