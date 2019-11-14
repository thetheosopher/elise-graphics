import { ViewController } from '../view/view-controller';
import { Surface } from './surface';
import { SurfaceRadioStrip } from './surface-radio-strip';

/**
 * Extends [[ViewController]] to add radio strip properties
 */
export class SurfaceRadioStripViewController extends ViewController {
    /**
     * Associated radio strip
     */
    public strip?: SurfaceRadioStrip;

    /**
     * Radio strip surface
     */
    public surface?: Surface;

    constructor() {
        super();
    }
}
