import { ViewController } from '../view/view-controller';
import { Surface } from './surface';

export class SurfaceViewController extends ViewController {
    /**
     * Controlled surface
     */
    public surface?: Surface;

    /**
     * @classdesc Extends ViewController to add surface property
     * @extends Elise.Drawing.ViewController
     */
    constructor() {
        super();
    }
}
