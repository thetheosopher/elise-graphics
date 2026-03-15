import { ViewController } from '../view/view-controller';

interface Surface {
    div?: HTMLDivElement;
    resourceListenerEvent?: {
        hasListeners(): boolean;
        listeners: Array<(source: unknown, data?: unknown) => void>;
    };
    onErrorInternal?(message: string): void;
}

interface SurfaceRadioStrip {
    orientation?: number;
    downOffset?: number;
    downPosition?: number;
    maxOffset?: number;
    scrollTo(offset: number): void;
    onRadioButtonClicked(itemId: string): void;
    onRadioButtonDown(itemId: string): void;
    onRadioButtonUp(itemId: string): void;
}

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
