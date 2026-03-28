import { AnimationEasing, animationEasingNames } from '../../animation/animation-easing';
import { SpriteElement } from '../../elements/sprite-element';
import { SpriteFrame } from '../../elements/sprite-frame';
import { TransitionRenderer } from '../../transitions/transitions';

describe('transition renderer', () => {
    let frameQueue: Array<() => void>;
    let nowValue: number;
    let perfNowSpy: jest.SpyInstance<number, []>;
    let originalDocument: Document | undefined;

    beforeEach(() => {
        frameQueue = [];
        nowValue = 0;
        perfNowSpy = jest.spyOn(performance, 'now').mockImplementation(() => nowValue);
        (globalThis as unknown as { requestAnimationFrame: (cb: () => void) => number }).requestAnimationFrame = jest.fn().mockImplementation((cb: () => void) => {
            frameQueue.push(cb);
            return frameQueue.length;
        });
        (globalThis as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame = jest.fn();

        originalDocument = globalThis.document;
        (globalThis as unknown as { document: Document }).document = {
            createElement: jest.fn(() => ({
                width: 0,
                height: 0,
                getContext: jest.fn(() => ({ clearRect: jest.fn(), drawImage: jest.fn() })),
            })),
        } as unknown as Document;
    });

    afterEach(() => {
        perfNowSpy.mockRestore();
        if (originalDocument) {
            (globalThis as unknown as { document: Document }).document = originalDocument;
        }
    });

    function runNextFrame(elapsedMs: number) {
        const callback = frameQueue.shift();
        if (!callback) {
            throw new Error('Expected an animation frame callback');
        }
        nowValue += elapsedMs;
        callback();
    }

    test('transitionSprite uses the provided duration in seconds', () => {
        const draw = jest.fn();
        const sprite = SpriteElement.create(0, 0, 10, 10);
        sprite.model = {
            resourceManager: { get: jest.fn(() => ({ image: {} })) },
        } as unknown as any;
        sprite.frames = [
            SpriteFrame.create('sheet', 0, 0, 10, 10, 1, 'fade', 0.1),
            SpriteFrame.create('sheet', 10, 0, 10, 10, 1, 'fade', 0.5),
        ];

        TransitionRenderer.transitionSprite({ draw } as never, sprite, 0, 1, 'fade', 0.5);

        expect(frameQueue).toHaveLength(1);

        runNextFrame(250);

        expect(sprite.transitionOffset).toBeCloseTo(0.5, 1);
        expect(sprite.frameIndex).toBe(0);

        runNextFrame(250);

        expect(sprite.frameIndex).toBe(1);
        expect(sprite.transition).toBeUndefined();
        expect(draw).toHaveBeenCalled();
    });

    test('transition easing registry matches the shared animation easing set', () => {
        expect(TransitionRenderer.easingFunctions.map(entry => entry.name)).toEqual(animationEasingNames);

        const easing = TransitionRenderer.getEasingFunction('easeInOutElastic');
        expect(easing(0)).toBeCloseTo(0, 8);
        expect(easing(1)).toBeCloseTo(1, 8);
        expect(easing(0.5)).toBeCloseTo(AnimationEasing.easeInOutElastic(0.5), 8);
    });
});