import { ViewController } from '../view/view-controller';
import { Surface } from './surface';

export class SurfaceViewController extends ViewController {
    /**
     * Controlled surface
     */
    public surface?: Surface;

    /**
     * Extends ViewController to add surface property
     */
    constructor() {
        super();
    }
}
