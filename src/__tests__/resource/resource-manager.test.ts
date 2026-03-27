import { ResourceLoaderState } from '../../resource/resource-loader-state';
import { Resource } from '../../resource/resource';
import { ResourceManager } from '../../resource/resource-manager';
import { TextResource } from '../../resource/text-resource';
import { Model } from '../../core/model';
import { RectangleElement } from '../../elements/rectangle-element';

class TestResource extends Resource {
    private readonly success: boolean;

    constructor(success: boolean) {
        super('test');
        this.success = success;
    }

    public initialize(): void {
        if (this.resourceManager) {
            this.resourceManager.unregister(this, this.success);
        }
    }
}

function createBitmapLikeResource(key: string, uri: string, locale?: string): TestResource {
    const res = new TestResource(true);
    res.type = 'bitmap';
    res.key = key;
    res.uri = uri;
    res.locale = locale;
    return res;
}

test('resource manager loadAsync resolves true when no pending resources', async () => {
    const rm = new ResourceManager({ basePath: '/', resources: [] });
    const result = await rm.loadAsync();
    expect(result).toBe(true);
});

test('resource manager loadAsync resolves false when a resource fails', async () => {
    const rm = new ResourceManager({ basePath: '/', resources: [] });
    const failedResource = new TestResource(false);
    failedResource.resourceManager = rm;
    failedResource.registered = true;
    rm.pendingResources = [failedResource];
    rm.pendingResourceCount = 1;
    rm.totalResourceCount = 1;

    const result = await rm.loadAsync();
    expect(result).toBe(false);
    expect(rm.resourceFailed).toBe(true);
});

test('resource manager findBestResource resolves fallback order', () => {
    const rm = new ResourceManager({ basePath: '/', resources: [] });
    const exact = createBitmapLikeResource('banner', '/en-us.png', 'en-US');
    const genericLocale = createBitmapLikeResource('banner', '/en.png', 'en');
    const languageVariant = createBitmapLikeResource('banner', '/en-gb.png', 'en-GB');
    const generic = createBitmapLikeResource('banner', '/generic.png');
    const keyOnly = createBitmapLikeResource('banner', '/fr-fr.png', 'fr-FR');

    rm.model!.resources.push(exact, genericLocale, languageVariant, generic, keyOnly);

    expect(rm.findBestResource('banner', 'en-US')).toBe(exact);

    rm.model!.resources = [genericLocale, languageVariant, generic, keyOnly];
    expect(rm.findBestResource('banner', 'en-US')).toBe(genericLocale);

    rm.model!.resources = [languageVariant, generic, keyOnly];
    expect(rm.findBestResource('banner', 'en-CA')).toBe(languageVariant);

    rm.model!.resources = [generic, keyOnly];
    expect(rm.findBestResource('banner', 'en-CA')).toBe(generic);

    rm.model!.resources = [keyOnly];
    expect(rm.findBestResource('banner', 'de-DE')).toBe(keyOnly);
});

test('resource manager register skips text resource without uri and avoids duplicate registration', () => {
    const textNoUri = TextResource.createFromText('copy', 'hello');
    const bitmap = createBitmapLikeResource('logo', '/logo.png');

    const rm = new ResourceManager({ basePath: '/', resources: [textNoUri, bitmap] });

    rm.register('copy');
    expect(rm.pendingResourceCount).toBe(0);

    rm.register('logo');
    expect(rm.pendingResourceCount).toBe(1);
    expect(rm.totalResourceCount).toBe(1);

    rm.register('logo');
    expect(rm.pendingResourceCount).toBe(1);
    expect(rm.totalResourceCount).toBe(1);
});

test('resource manager unregister publishes success and failure events', () => {
    const rm = new ResourceManager({ basePath: '/', resources: [] });
    const successResource = createBitmapLikeResource('ok', '/ok.png');
    const failedResource = new TestResource(false);
    failedResource.type = 'bitmap';
    failedResource.key = 'bad';
    failedResource.uri = '/bad.png';

    successResource.resourceManager = rm;
    failedResource.resourceManager = rm;
    successResource.registered = true;
    failedResource.registered = true;

    rm.pendingResources = [successResource, failedResource];
    rm.pendingResourceCount = 2;
    rm.totalResourceCount = 2;

    const observedStates: Array<ResourceLoaderState> = [];
    rm.listenerEvent.add((_source, state) => {
        if (state) {
            observedStates.push(state.code);
        }
    });

    const completeHandler = jest.fn();
    rm.loadCompleted.add((_source, result) => {
        completeHandler(result);
    });

    rm.unregister(successResource, true);
    rm.unregister(failedResource, false);

    expect(successResource.available).toBe(true);
    expect(failedResource.error).toBe(true);
    expect(rm.resourceFailed).toBe(true);
    expect(observedStates).toContain(ResourceLoaderState.ResourceComplete);
    expect(observedStates).toContain(ResourceLoaderState.ResourceFailed);
    expect(observedStates).toContain(ResourceLoaderState.Idle);
    expect(completeHandler).toHaveBeenCalledWith(false);
});

test('resource manager load emits loading and resource start states', () => {
    const rm = new ResourceManager({ basePath: '/', resources: [] });
    const resource = createBitmapLikeResource('logo', '/logo.png');

    resource.resourceManager = rm;
    resource.registered = true;
    rm.pendingResources = [resource];
    rm.pendingResourceCount = 1;
    rm.totalResourceCount = 1;

    const observedStates: Array<ResourceLoaderState> = [];
    rm.listenerEvent.add((_source, state) => {
        if (state) {
            observedStates.push(state.code);
        }
    });

    rm.load();

    expect(observedStates[0]).toBe(ResourceLoaderState.Loading);
    expect(observedStates).toContain(ResourceLoaderState.ResourceStart);
});

test('resource manager loadNext completes immediately when no pending resources are loadable', () => {
    const rm = new ResourceManager({ basePath: '/', resources: [] });
    const alreadyAvailable = createBitmapLikeResource('logo', '/logo.png');
    alreadyAvailable.available = true;

    rm.pendingResources = [alreadyAvailable];
    rm.pendingResourceCount = 1;
    rm.totalResourceCount = 1;

    const completion = jest.fn();
    rm.loadCompleted.add((_source, result) => {
        completion(result);
    });

    rm.loadNext();

    expect(completion).toHaveBeenCalledWith(true);
});

test('resource manager pruneUnusedResources removes only keys not referenced by the model', () => {
    const model = Model.create(100, 100);
    const rectangle = RectangleElement.create(0, 0, 10, 10);
    rectangle.setFill('image(hero)');
    model.add(rectangle);

    const usedEn = createBitmapLikeResource('hero', '/hero-en.png', 'en-US');
    const usedFr = createBitmapLikeResource('hero', '/hero-fr.png', 'fr-FR');
    const unused = createBitmapLikeResource('unused', '/unused.png');

    model.resourceManager.add(usedEn);
    model.resourceManager.add(usedFr);
    model.resourceManager.add(unused);

    const removed = model.resourceManager.pruneUnusedResources();

    expect(removed.map((resource) => resource.key)).toEqual(['unused']);
    expect(model.resources.map((resource) => resource.key)).toEqual(['hero', 'hero']);
});
