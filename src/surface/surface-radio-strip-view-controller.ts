import { ViewController } from '../view/view-controller';
import { Surface } from './surface';
import { SurfaceRadioStrip } from './surface-radio-strip';

export class SurfaceRadioStripViewController extends ViewController {
    /**
     * Associated radio strip
     */
    public strip?: SurfaceRadioStrip;

    /**
     * Radio strip surface
     */
    public surface?: Surface;

    /**
     * Extends ViewController to add radio strip properties
     */
    constructor() {
        super();
    }
}
