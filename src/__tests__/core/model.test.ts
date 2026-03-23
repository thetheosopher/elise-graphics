import { ErrorMessages } from '../../core/error-messages';
import { Model } from '../../core/model';
import { Utility } from '../../core/utility';
import { RectangleElement } from '../../elements/rectangle-element';

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

test('model size', () => {
    const model = Model.create(10, 20);
    expect(model.size).toBe('10x20');
    const size = model.getSize();
    if (size !== undefined) {
        expect(size.width).toBe(10);
        expect(size.height).toBe(20);
    }
    else {
        throw new Error(ErrorMessages.SizeUndefined);
    }
});

test('add model elements', () => {
    const model = Model.create(100, 100);
    const rect1 = RectangleElement.create(0, 0, 50, 50);
    const index1 = model.add(rect1);
    expect(model.elements.length).toBe(1);
    expect(index1).toBe(0);
    const rect2 = RectangleElement.create(10, 10, 50, 50);
    let index2 = model.add(rect2);
    expect(model.elements.length).toBe(2);
    expect(index2).toBe(1);
    const rect3 = RectangleElement.create(20, 20, 50, 50);
    let index3 = model.addBottom(rect3);
    expect(index3).toBe(0);
    index2 = model.elements.indexOf(rect1);
    expect(index2).toBe(1);
    index2 = model.remove(rect2);
    expect(index2).toBe(2);
    index3 = model.elements.indexOf(rect2);
    expect(index3).toBe(-1);
});

test('model loadAsync resolves model when json is returned', async () => {
    const mock = jest.spyOn(Utility, 'getRemoteText').mockImplementation((_url, callback) => {
        callback('{"type":"model","size":"10x20"}');
    });

    const model = await Model.loadAsync('/base/', 'scene/model.json');
    expect(model).toBeDefined();
    expect(model!.getSize()!.width).toBe(10);
    expect(model!.getSize()!.height).toBe(20);
    expect(model!.basePath).toBe('/base/');

    mock.mockRestore();
});

test('model prepareResourcesAsync resolves callback result', async () => {
    const model = Model.create(10, 10);
    const mock = jest.spyOn(model, 'prepareResources').mockImplementation((_localeId, callback) => {
        if (callback) {
            callback(true);
        }
    });

    const result = await model.prepareResourcesAsync('en-US');
    expect(result).toBe(true);

    mock.mockRestore();
});

test('model prepareResources registers model fill resources and element resources', () => {
    const model = Model.create(10, 10);
    const registerSpy = jest.spyOn(model.resourceManager, 'register').mockImplementation(() => undefined);
    const loadSpy = jest.spyOn(model.resourceManager, 'load').mockImplementation(callback => {
        if (callback) {
            callback(true);
        }
    });

    model.fill = 'image(0.5;hero-image)';

    const registerResources = jest.fn();
    model.elements.push({ registerResources } as unknown as any);

    const callback = jest.fn();
    model.prepareResources('en-US', callback);

    expect(model.resourceManager.currentLocaleId).toBe('en-US');
    expect(registerSpy).toHaveBeenCalledWith('hero-image');
    expect(registerResources).toHaveBeenCalledWith(model.resourceManager);
    expect(loadSpy).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(true);

    registerSpy.mockRestore();
    loadSpy.mockRestore();
});

test('model prepareResources parses model() fill references', () => {
    const model = Model.create(10, 10);
    const registerSpy = jest.spyOn(model.resourceManager, 'register').mockImplementation(() => undefined);
    const loadSpy = jest.spyOn(model.resourceManager, 'load').mockImplementation(() => undefined);

    model.fill = 'model(overlay-model)';
    model.prepareResources();

    expect(registerSpy).toHaveBeenCalledWith('overlay-model');

    registerSpy.mockRestore();
    loadSpy.mockRestore();
});

test('setElementStroke supports rgba stroke strings without width suffix', () => {
    const model = Model.create(10, 10);
    const element = RectangleElement.create(0, 0, 5, 5).setStroke('rgba(95,145,210,0.5)');
    const context = {} as CanvasRenderingContext2D;

    const applied = model.setElementStroke(context, element);

    expect(applied).toBe(true);
    expect(context.lineWidth).toBe(1);
    expect(context.strokeStyle).toBe('rgba(95,145,210,' + 128 / 255 + ')');
});

test('setElementStroke supports rgba stroke strings with width suffix', () => {
    const model = Model.create(10, 10);
    const element = RectangleElement.create(0, 0, 5, 5).setStroke('rgba(95,145,210,0.5),4');
    const context = {} as CanvasRenderingContext2D;

    const applied = model.setElementStroke(context, element);

    expect(applied).toBe(true);
    expect(context.lineWidth).toBe(4);
    expect(context.strokeStyle).toBe('rgba(95,145,210,' + 128 / 255 + ')');
});

test('model toCanvas renders to a detached scaled canvas', () => {
    const model = Model.create(40, 30);
    const scaleSpy = jest.fn();
    const fakeContext = {
        scale: scaleSpy,
        save: jest.fn(),
        beginPath: jest.fn(),
        rect: jest.fn(),
        clip: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        transform: jest.fn(),
        globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
    const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => fakeContext),
        toDataURL: jest.fn(),
        toBlob: jest.fn(),
    } as unknown as HTMLCanvasElement;
    const documentScope = installFakeDocument({ canvas: fakeCanvas });
    const renderSpy = jest.spyOn(model, 'renderToContext').mockImplementation(() => undefined);

    const canvas = model.toCanvas(2);

    expect(canvas).toBe(fakeCanvas);
    expect(fakeCanvas.width).toBe(80);
    expect(fakeCanvas.height).toBe(60);
    expect(scaleSpy).toHaveBeenCalledWith(2, 2);
    expect(renderSpy).toHaveBeenCalledWith(fakeContext);

    renderSpy.mockRestore();
    documentScope.restore();
});

test('model toDataURL proxies through rendered canvas export', () => {
    const model = Model.create(20, 10);
    const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
            save: jest.fn(),
            beginPath: jest.fn(),
            rect: jest.fn(),
            clip: jest.fn(),
            fillRect: jest.fn(),
            strokeRect: jest.fn(),
            restore: jest.fn(),
            scale: jest.fn(),
            translate: jest.fn(),
            rotate: jest.fn(),
            transform: jest.fn(),
            globalAlpha: 1,
        })),
        toDataURL: jest.fn(() => 'data:image/png;base64,abc'),
        toBlob: jest.fn(),
    } as unknown as HTMLCanvasElement;
    const documentScope = installFakeDocument({ canvas: fakeCanvas });
    const renderSpy = jest.spyOn(model, 'renderToContext').mockImplementation(() => undefined);

    const result = model.toDataURL('image/png', undefined, 3);

    expect(result).toBe('data:image/png;base64,abc');
    expect(fakeCanvas.toDataURL).toHaveBeenCalledWith('image/png', undefined);

    renderSpy.mockRestore();
    documentScope.restore();
});

test('model toBlob proxies through rendered canvas export', () => {
    const model = Model.create(20, 10);
    const blob = { size: 12 } as Blob;
    const callback = jest.fn();
    const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
            save: jest.fn(),
            beginPath: jest.fn(),
            rect: jest.fn(),
            clip: jest.fn(),
            fillRect: jest.fn(),
            strokeRect: jest.fn(),
            restore: jest.fn(),
            scale: jest.fn(),
            translate: jest.fn(),
            rotate: jest.fn(),
            transform: jest.fn(),
            globalAlpha: 1,
        })),
        toDataURL: jest.fn(),
        toBlob: jest.fn((cb: (value: Blob | null) => void) => cb(blob)),
    } as unknown as HTMLCanvasElement;
    const documentScope = installFakeDocument({ canvas: fakeCanvas });
    const renderSpy = jest.spyOn(model, 'renderToContext').mockImplementation(() => undefined);

    model.toBlob(callback, 'image/png', undefined, 2);

    expect(fakeCanvas.toBlob).toHaveBeenCalledWith(callback, 'image/png', undefined);
    expect(callback).toHaveBeenCalledWith(blob);

    renderSpy.mockRestore();
    documentScope.restore();
});

test('model toBlobAsync resolves with blob from callback export path', async () => {
    const model = Model.create(20, 10);
    const blob = { size: 16 } as Blob;
    const toBlobSpy = jest.spyOn(model, 'toBlob').mockImplementation(callback => {
        callback(blob);
    });

    const result = await model.toBlobAsync('image/png', undefined, 2);

    expect(result).toBe(blob);
    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/png', undefined, 2);

    toBlobSpy.mockRestore();
});

test('model jpeg and webp data url helpers use correct mime types', () => {
    const model = Model.create(20, 10);
    const toDataURLSpy = jest.spyOn(model, 'toDataURL').mockImplementation(() => 'encoded');

    const jpeg = model.toJPEGDataURL(0.8, 2);
    const webp = model.toWebPDataURL(0.6, 3);
    const png = model.toPNGDataURL(4);

    expect(jpeg).toBe('encoded');
    expect(webp).toBe('encoded');
    expect(png).toBe('encoded');
    expect(toDataURLSpy).toHaveBeenNthCalledWith(1, 'image/jpeg', 0.8, 2);
    expect(toDataURLSpy).toHaveBeenNthCalledWith(2, 'image/webp', 0.6, 3);
    expect(toDataURLSpy).toHaveBeenNthCalledWith(3, 'image/png', undefined, 4);

    toDataURLSpy.mockRestore();
});

test('model jpeg and webp blob helpers use correct mime types', async () => {
    const model = Model.create(20, 10);
    const blob = { size: 20 } as Blob;
    const toBlobAsyncSpy = jest.spyOn(model, 'toBlobAsync').mockResolvedValue(blob);

    const jpeg = await model.toJPEGBlobAsync(0.75, 2);
    const webp = await model.toWebPBlobAsync(0.65, 3);
    const png = await model.toPNGBlobAsync(4);

    expect(jpeg).toBe(blob);
    expect(webp).toBe(blob);
    expect(png).toBe(blob);
    expect(toBlobAsyncSpy).toHaveBeenNthCalledWith(1, 'image/jpeg', 0.75, 2);
    expect(toBlobAsyncSpy).toHaveBeenNthCalledWith(2, 'image/webp', 0.65, 3);
    expect(toBlobAsyncSpy).toHaveBeenNthCalledWith(3, 'image/png', undefined, 4);

    toBlobAsyncSpy.mockRestore();
});

test('model downloadAs uses blob url when available', () => {
    const model = Model.create(20, 10);
    const blob = { size: 8 } as Blob;
    const click = jest.fn();
    const anchor = { click, download: '', href: '' } as unknown as HTMLAnchorElement;
    const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
            save: jest.fn(),
            beginPath: jest.fn(),
            rect: jest.fn(),
            clip: jest.fn(),
            fillRect: jest.fn(),
            strokeRect: jest.fn(),
            restore: jest.fn(),
            scale: jest.fn(),
            translate: jest.fn(),
            rotate: jest.fn(),
            transform: jest.fn(),
            globalAlpha: 1,
        })),
        toDataURL: jest.fn(() => 'data:image/png;base64,abc'),
        toBlob: jest.fn((cb: (value: Blob | null) => void) => cb(blob)),
    } as unknown as HTMLCanvasElement;
    const documentScope = installFakeDocument({ canvas: fakeCanvas, a: anchor });
    const renderSpy = jest.spyOn(model, 'renderToContext').mockImplementation(() => undefined);
    const createObjectURL = jest.fn(() => 'blob:export');
    const revokeObjectURL = jest.fn();
    const originalUrl = globalThis.URL;

    Object.defineProperty(globalThis, 'URL', {
        value: { createObjectURL, revokeObjectURL },
        configurable: true,
    });

    model.downloadAs('scene.png');

    expect(anchor.download).toBe('scene.png');
    expect(anchor.href).toBe('blob:export');
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:export');

    renderSpy.mockRestore();
    documentScope.restore();
    Object.defineProperty(globalThis, 'URL', {
        value: originalUrl,
        configurable: true,
    });
});
