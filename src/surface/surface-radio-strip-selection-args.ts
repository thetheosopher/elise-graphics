import { SurfaceRadioStripItem } from './surface-radio-strip-item';

interface SurfaceRadioStrip {
    orientation?: number;
    downOffset?: number;
    downPosition?: number;
    maxOffset?: number;
    scrollTo(offset: number): void;
}

/**
 * Contains arguments for radio strip selection event
 */
export class SurfaceRadioStripSelectionArgs {
    /**
     * Radio strip
     */
    public strip: SurfaceRadioStrip;

    /**
     * Radio strip item
     */
    public item: SurfaceRadioStripItem;

    /**
     * @param strip - Radio strip
     * @param item - Radio strip item
     */
    constructor(strip: SurfaceRadioStrip, item: SurfaceRadioStripItem) {
        this.strip = strip;
        this.item = item;
    }
}
