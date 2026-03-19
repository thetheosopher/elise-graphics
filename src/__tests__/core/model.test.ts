import { ErrorMessages } from '../../core/error-messages';
import { Model } from '../../core/model';
import { Utility } from '../../core/utility';
import { RectangleElement } from '../../elements/rectangle-element';

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
