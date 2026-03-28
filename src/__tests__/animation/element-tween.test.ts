import { AnimationEasing, animationEasingNames } from '../../animation/animation-easing';
import { ElementAnimator } from '../../animation/element-tween';
import { RectangleElement } from '../../elements/rectangle-element';

type FrameQueue = Array<FrameRequestCallback | undefined>;

function installFakeAnimationFrame() {
    const callbacks: FrameQueue = [];
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
        callbacks.push(callback);
        return callbacks.length;
    });

    globalThis.cancelAnimationFrame = jest.fn((handle: number) => {
        callbacks[handle - 1] = undefined;
    });

    return {
        step(timestamp: number) {
            const callback = callbacks.shift();
            if (callback) {
                callback(timestamp);
            }
        },
        restore() {
            globalThis.requestAnimationFrame = originalRequestAnimationFrame;
            globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
        }
    };
}

describe('element tweening', () => {
    afterEach(() => {
        ElementAnimator.stopAll();
        jest.restoreAllMocks();
    });

    test('animates numeric bounds properties and redraws attached controller', () => {
        const fakeAnimationFrame = installFakeAnimationFrame();
        jest.spyOn(performance, 'now').mockReturnValue(0);

        const draw = jest.fn();
        const rect = RectangleElement.create(0, 0, 10, 10);
        rect.model = { controller: { draw } } as unknown as any;

        const onComplete = jest.fn();
        rect.animate({ x: 100, y: 50, width: 30, height: 20 }, { duration: 1000, easing: 'easeLinear', onComplete });

        fakeAnimationFrame.step(500);

        const midBounds = rect.getBounds();
        expect(midBounds?.x).toBeCloseTo(50);
        expect(midBounds?.y).toBeCloseTo(25);
        expect(midBounds?.width).toBeCloseTo(20);
        expect(midBounds?.height).toBeCloseTo(15);
        expect(draw).toHaveBeenCalledTimes(1);

        fakeAnimationFrame.step(1000);

        const finalBounds = rect.getBounds();
        expect(finalBounds?.x).toBeCloseTo(100);
        expect(finalBounds?.y).toBeCloseTo(50);
        expect(finalBounds?.width).toBeCloseTo(30);
        expect(finalBounds?.height).toBeCloseTo(20);
        expect(onComplete).toHaveBeenCalledTimes(1);

        fakeAnimationFrame.restore();
    });

    test('animates colors and opacity', () => {
        const fakeAnimationFrame = installFakeAnimationFrame();
        jest.spyOn(performance, 'now').mockReturnValue(0);

        const rect = RectangleElement.create(0, 0, 10, 10).setFill('rgba(0,0,0,0)').setStroke('rgb(0,0,0)').setOpacity(1);
        rect.model = { controller: { draw: jest.fn() } } as unknown as any;

        rect.animate(
            { fill: 'rgba(255,0,0,1)', stroke: '#00FF00', opacity: 0.25 },
            { duration: 1000, easing: AnimationEasing.easeLinear }
        );

        fakeAnimationFrame.step(500);

        expect(typeof rect.fill).toBe('string');
        expect(rect.fill).not.toBe('rgba(0,0,0,0)');
        expect(rect.stroke).not.toBe('rgb(0,0,0)');
        expect(rect.opacity).toBeCloseTo(0.625);

        fakeAnimationFrame.restore();
    });

    test('all built-in easing names resolve with stable endpoints', () => {
        for (const easingName of animationEasingNames) {
            const easing = AnimationEasing.get(easingName);

            expect(easing(0)).toBeCloseTo(0, 8);
            expect(easing(1)).toBeCloseTo(1, 8);
            expect(Number.isFinite(easing(0.5))).toBe(true);
        }
    });

    test('supports bounce easing names during tween playback', () => {
        const fakeAnimationFrame = installFakeAnimationFrame();
        jest.spyOn(performance, 'now').mockReturnValue(0);

        const rect = RectangleElement.create(0, 0, 10, 10);
        rect.model = { controller: { draw: jest.fn() } } as unknown as any;

        rect.animate({ x: 100 }, { duration: 1000, easing: 'easeOutBounce' });

        fakeAnimationFrame.step(500);
        expect(rect.getBounds()?.x).toBeCloseTo(76.5625, 4);

        fakeAnimationFrame.step(1000);
        expect(rect.getBounds()?.x).toBeCloseTo(100);

        fakeAnimationFrame.restore();
    });

    test('starting a conflicting tween cancels the prior tween on the same property', () => {
        const fakeAnimationFrame = installFakeAnimationFrame();
        jest.spyOn(performance, 'now').mockReturnValue(0);

        const rect = RectangleElement.create(0, 0, 10, 10);
        rect.model = { controller: { draw: jest.fn() } } as unknown as any;

        const onCancel = jest.fn();
        const first = rect.animate({ x: 40 }, { duration: 1000, onCancel });
        const second = rect.animate({ x: 80 }, { duration: 1000 });

        expect(first.isCancelled).toBe(true);
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(second.isCancelled).toBe(false);

        fakeAnimationFrame.step(1000);
        expect(rect.getBounds()?.x).toBeCloseTo(80);

        fakeAnimationFrame.restore();
    });

    test('cancelAnimations stops active tweens for the selected properties', () => {
        const fakeAnimationFrame = installFakeAnimationFrame();
        jest.spyOn(performance, 'now').mockReturnValue(0);

        const rect = RectangleElement.create(0, 0, 10, 10);
        rect.model = { controller: { draw: jest.fn() } } as unknown as any;

        const tween = rect.animate({ x: 40, y: 50 }, { duration: 1000 });
        rect.cancelAnimations(['x']);

        expect(tween.isCancelled).toBe(true);

        fakeAnimationFrame.step(1000);
        expect(rect.getBounds()?.x).toBe(0);
        expect(rect.getBounds()?.y).toBe(0);

        ElementAnimator.cancel(rect);
        fakeAnimationFrame.restore();
    });
});