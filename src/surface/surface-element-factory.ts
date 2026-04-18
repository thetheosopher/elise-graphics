import { SurfaceAnimationLayer } from './surface-animation-layer';
import { SurfaceButtonElement } from './surface-button-element';
import { SurfaceElement } from './surface-element';
import { SurfaceHiddenLayer } from './surface-hidden-layer';
import { SurfaceHtmlLayer } from './surface-html-layer';
import { SurfaceImageLayer } from './surface-image-layer';
import { SurfacePane } from './surface-pane';
import { SurfaceRadioStrip } from './surface-radio-strip';
import { SurfaceTextElement } from './surface-text-element';
import { SurfaceVideoLayer } from './surface-video-layer';
import { Surface } from './surface';

/**
 * Surface element creator interface
 */
export interface ISurfaceElementCreator {
    create(): SurfaceElement;
}

/**
 * Registration entry for surface element creators
 */
export class SurfaceElementCreatorRegistration {
    public name: string;
    public creator: ISurfaceElementCreator;

    constructor(name: string, creator: ISurfaceElementCreator) {
        this.name = name;
        this.creator = creator;
    }
}

/**
 * Registry-based factory for creating surface elements and layers by type tag
 */
export class SurfaceElementFactory {
    /**
     * Array of registered surface element creators
     */
    public static ElementCreators: SurfaceElementCreatorRegistration[] = [];

    /**
     * Registers a surface element creator
     * @param name - Surface element type tag
     * @param creator - Surface element creation function
     */
    public static registerCreator(name: string, creator: ISurfaceElementCreator) {
        SurfaceElementFactory.ElementCreators.push(new SurfaceElementCreatorRegistration(name, creator));
    }

    /**
     * Creates a new surface element instance given a type tag
     * @param name - Surface element type tag
     * @returns New surface element or undefined if type not registered
     */
    public static create(name: string): SurfaceElement | undefined {
        for (const rc of SurfaceElementFactory.ElementCreators) {
            if (rc.name === name) {
                return rc.creator.create();
            }
        }
        return undefined;
    }
}

// Register built-in surface element types
SurfaceElementFactory.registerCreator('surfaceButton', {
    create: () => new SurfaceButtonElement('', 0, 0, 0, 0, () => {})
});

SurfaceElementFactory.registerCreator('surfaceText', {
    create: () => new SurfaceTextElement('', 0, 0, 0, 0, '', () => {})
});

SurfaceElementFactory.registerCreator('surfaceImage', {
    create: () => new SurfaceImageLayer('', 0, 0, 0, 0, '', () => {})
});

SurfaceElementFactory.registerCreator('surfaceVideo', {
    create: () => new SurfaceVideoLayer('', 0, 0, 0, 0, '')
});

SurfaceElementFactory.registerCreator('surfaceHtml', {
    create: () => new SurfaceHtmlLayer('', 0, 0, 0, 0, '')
});

SurfaceElementFactory.registerCreator('surfaceHidden', {
    create: () => new SurfaceHiddenLayer('', 0, 0, 0, 0, () => {})
});

SurfaceElementFactory.registerCreator('surfaceAnimation', {
    create: () => new SurfaceAnimationLayer('', 0, 0, 0, 0, false, () => {}, 0, () => {})
});

SurfaceElementFactory.registerCreator('surfacePane', {
    create: () => new SurfacePane('', 0, 0, 0, 0, new Surface(0, 0))
});

SurfaceElementFactory.registerCreator('surfaceRadioStrip', {
    create: () => new SurfaceRadioStrip('', 0, 0, 0, 0, 0, 0, 0, 0, () => {})
});
