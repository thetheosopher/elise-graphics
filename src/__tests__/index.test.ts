type EliseModule = typeof import('../index');

function loadIndexModule(): EliseModule {
    jest.resetModules();
    return require('../index') as EliseModule;
}

describe('index api surface', () => {
    const globalWithRaf = globalThis as typeof globalThis & {
        requestAnimationFrame?: (callback: FrameRequestCallback) => number;
    };

    let originalRequestAnimationFrame: ((callback: FrameRequestCallback) => number) | undefined;

    beforeEach(() => {
        originalRequestAnimationFrame = globalWithRaf.requestAnimationFrame;
    });

    afterEach(() => {
        if (originalRequestAnimationFrame) {
            globalWithRaf.requestAnimationFrame = originalRequestAnimationFrame;
        } else {
            (globalWithRaf as unknown as { requestAnimationFrame: undefined }).requestAnimationFrame = undefined;
        }
        jest.restoreAllMocks();
        jest.resetModules();
    });

    test('default export requestAnimationFrame is undefined when global callback is unavailable', () => {
        (globalWithRaf as unknown as { requestAnimationFrame: undefined }).requestAnimationFrame = undefined;

        const api = loadIndexModule().default;

        expect(api.requestAnimationFrame).toBeUndefined();
    });

    test('default export requestAnimationFrame proxies to global callback when available', () => {
        const raf = jest.fn((_cb: FrameRequestCallback) => 321);
        globalWithRaf.requestAnimationFrame = raf;

        const api = loadIndexModule().default;
        const callback = jest.fn();
        const handle = api.requestAnimationFrame?.(callback as unknown as FrameRequestCallback);

        expect(typeof api.requestAnimationFrame).toBe('function');
        expect(raf).toHaveBeenCalledTimes(1);
        expect(raf).toHaveBeenCalledWith(callback);
        expect(handle).toBe(321);
    });

    test('log helper routes through Logging.log', () => {
        const indexModule = loadIndexModule();
        const logSpy = jest.spyOn(indexModule.Logging, 'log').mockImplementation(() => undefined);

        indexModule.log('hello');

        expect(logSpy).toHaveBeenCalledWith('hello');
    });

    test('animation exports are available from named and default api surfaces', () => {
        const indexModule = loadIndexModule();

        expect(typeof indexModule.AnimationEasing.easeInOutCubic).toBe('function');
        expect(typeof indexModule.ElementAnimator.animate).toBe('function');
        expect(indexModule.default.AnimationEasing).toBe(indexModule.AnimationEasing);
        expect(indexModule.default.ElementAnimator).toBe(indexModule.ElementAnimator);
        expect(indexModule.default.ElementTween).toBe(indexModule.ElementTween);
    });
});
