import { ViewController } from '../view/view-controller';
import { Surface } from './surface';

/**
 * Extends ViewController to add surface property
 */
export class SurfaceViewController extends ViewController {
    /**
     * Controlled surface
     */
    public surface?: Surface;

    constructor() {
        super();
    }
}
