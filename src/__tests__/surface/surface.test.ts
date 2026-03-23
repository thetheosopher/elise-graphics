import { Surface } from '../../surface/surface';
import { SurfaceAnimationLayer } from '../../surface/surface-animation-layer';
import { SurfaceHiddenLayer } from '../../surface/surface-hidden-layer';
import { SurfaceHtmlLayer } from '../../surface/surface-html-layer';
import { SurfaceImageLayer } from '../../surface/surface-image-layer';
import { SurfaceVideoLayer } from '../../surface/surface-video-layer';
import { SurfaceViewController } from '../../surface/surface-view-controller';

function installFakeDocument(elements: { [index: string]: any }) {
    const globals = globalThis as unknown as { document?: Document };
    const originalDocument = globals.document;
    globals.document = {
        createElement: jest.fn((tagName: string) => {
            const element = elements[tagName];
            if (!element) {
                throw new Error('Unexpected element request: ' + tagName);
            }
            return element;
        })
    } as unknown as Document;

    return {
        restore: () => {
            globals.document = originalDocument;
        }
    };
}

test('surface unbind clears loaded and initialized listeners', () => {
    const globalWithWindow = global as unknown as { window?: { removeEventListener: (name: string, fn: unknown, capture?: boolean) => void } };
    globalWithWindow.window = {
        removeEventListener: (_name: string, _fn: unknown, _capture?: boolean) => {}
    };

    const surface = new Surface(100, 100, 'test-surface', 1);
    const controller = new SurfaceViewController();
    surface.controller = controller;

    const loadedHandler = (_result?: boolean) => {};
    const initializedHandler = (_controller?: SurfaceViewController) => {};

    surface.loaded.add(loadedHandler);
    surface.initialized.add(initializedHandler);

    expect(surface.loaded.hasListeners()).toBe(true);
    expect(surface.initialized.hasListeners()).toBe(true);

    surface.unbind();

    expect(surface.loaded.hasListeners()).toBe(false);
    expect(surface.initialized.hasListeners()).toBe(false);
});

test('surface toCanvas composites base model and rasterizable layers', () => {
    const surface = new Surface(100, 50, 'surface-export', 2);
    surface.opacity = 0.5;

    const baseCanvas = { id: 'base-canvas' } as unknown as HTMLCanvasElement;
    const model = {
        toCanvas: jest.fn(() => baseCanvas)
    };
    surface.model = model as unknown as any;

    const imageLayer = SurfaceImageLayer.create('image', 1, 2, 10, 20, 'image.png', () => undefined);
    imageLayer.element = { id: 'image-el' } as unknown as HTMLImageElement;
    imageLayer.opacity = 0.8;
    imageLayer.translateX = 3;
    imageLayer.translateY = 4;

    const videoLayer = SurfaceVideoLayer.create('video', 5, 6, 30, 10, 'video.mp4');
    videoLayer.element = { id: 'video-el' } as unknown as HTMLVideoElement;
    videoLayer.opacity = 0.6;

    const animationLayer = SurfaceAnimationLayer.create('anim', 2, 3, 15, 8, false, () => undefined, 0, () => undefined);
    animationLayer.element = { id: 'anim-el' } as unknown as HTMLCanvasElement;

    const hiddenLayer = SurfaceHiddenLayer.create('hidden', 0, 0, 10, 10, () => undefined);
    hiddenLayer.element = { id: 'hidden-el' } as unknown as HTMLDivElement;

    const htmlLayer = SurfaceHtmlLayer.create('html', 0, 0, 10, 10, 'about:blank');
    htmlLayer.element = { id: 'html-el' } as unknown as HTMLIFrameElement;

    surface.layers.push(imageLayer, hiddenLayer, videoLayer, htmlLayer, animationLayer);

    const drawImage = jest.fn();
    const clearRect = jest.fn();
    const save = jest.fn();
    const restore = jest.fn();
    const exportContext = {
        drawImage,
        clearRect,
        save,
        restore,
        globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
    const exportCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => exportContext),
        toDataURL: jest.fn(),
        toBlob: jest.fn(),
    } as unknown as HTMLCanvasElement;
    const documentScope = installFakeDocument({ canvas: exportCanvas });

    const canvas = surface.toCanvas();

    expect(canvas).toBe(exportCanvas);
    expect(exportCanvas.width).toBe(200);
    expect(exportCanvas.height).toBe(100);
    expect(model.toCanvas).toHaveBeenCalledWith(2);
    expect(drawImage).toHaveBeenNthCalledWith(1, baseCanvas, 0, 0, 200, 100);
    expect(drawImage).toHaveBeenNthCalledWith(2, imageLayer.element, 8, 12, 20, 40);
    expect(drawImage).toHaveBeenNthCalledWith(3, videoLayer.element, 10, 12, 60, 20);
    expect(drawImage).toHaveBeenNthCalledWith(4, animationLayer.element, 4, 6, 30, 16);
    expect(drawImage).toHaveBeenCalledTimes(4);

    documentScope.restore();
});

test('surface export helpers delegate to generic data url and blob methods', async () => {
    const surface = new Surface(100, 50, 'surface-export', 1);
    const blob = { size: 10 } as Blob;
    const toDataURLSpy = jest.spyOn(surface, 'toDataURL').mockImplementation(() => 'encoded');
    const toBlobAsyncSpy = jest.spyOn(surface, 'toBlobAsync').mockResolvedValue(blob);

    expect(surface.toPNGDataURL(2)).toBe('encoded');
    expect(surface.toJPEGDataURL(0.8, 3)).toBe('encoded');
    expect(surface.toWebPDataURL(0.7, 4)).toBe('encoded');
    expect(await surface.toPNGBlobAsync(2)).toBe(blob);
    expect(await surface.toJPEGBlobAsync(0.8, 3)).toBe(blob);
    expect(await surface.toWebPBlobAsync(0.7, 4)).toBe(blob);

    expect(toDataURLSpy).toHaveBeenNthCalledWith(1, 'image/png', undefined, 2);
    expect(toDataURLSpy).toHaveBeenNthCalledWith(2, 'image/jpeg', 0.8, 3);
    expect(toDataURLSpy).toHaveBeenNthCalledWith(3, 'image/webp', 0.7, 4);
    expect(toBlobAsyncSpy).toHaveBeenNthCalledWith(1, 'image/png', undefined, 2);
    expect(toBlobAsyncSpy).toHaveBeenNthCalledWith(2, 'image/jpeg', 0.8, 3);
    expect(toBlobAsyncSpy).toHaveBeenNthCalledWith(3, 'image/webp', 0.7, 4);

    toDataURLSpy.mockRestore();
    toBlobAsyncSpy.mockRestore();
});

test('surface downloadAs uses blob url when available', () => {
    const surface = new Surface(100, 50, 'surface-export', 1);
    const blob = { size: 8 } as Blob;
    const click = jest.fn();
    const anchor = { click, download: '', href: '' } as unknown as HTMLAnchorElement;
    const exportCanvas = {
        toDataURL: jest.fn(() => 'data:image/png;base64,abc'),
        toBlob: jest.fn((cb: (value: Blob | null) => void) => cb(blob)),
    } as unknown as HTMLCanvasElement;
    const documentScope = installFakeDocument({ a: anchor });
    const toCanvasSpy = jest.spyOn(surface, 'toCanvas').mockReturnValue(exportCanvas);
    const createObjectURL = jest.fn(() => 'blob:surface-export');
    const revokeObjectURL = jest.fn();
    const originalUrl = globalThis.URL;

    Object.defineProperty(globalThis, 'URL', {
        value: { createObjectURL, revokeObjectURL },
        configurable: true,
    });

    surface.downloadAs('surface.png');

    expect(anchor.download).toBe('surface.png');
    expect(anchor.href).toBe('blob:surface-export');
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:surface-export');

    toCanvasSpy.mockRestore();
    documentScope.restore();
    Object.defineProperty(globalThis, 'URL', {
        value: originalUrl,
        configurable: true,
    });
});
