import { PaneTransitionDirection } from '../../surface/pane-transitions/pane-transition-direction';
import { PaneTransitionFade } from '../../surface/pane-transitions/pane-transition-fade';
import { PaneTransitionPush } from '../../surface/pane-transitions/pane-transition-push';
import { PaneTransitionReveal } from '../../surface/pane-transitions/pane-transition-reveal';
import { PaneTransitionSlide } from '../../surface/pane-transitions/pane-transition-slide';
import { PaneTransitionWipe } from '../../surface/pane-transitions/pane-transition-wipe';

type SurfaceLikeStub = {
    scale: number;
    width: number;
    height: number;
    isChild: boolean;
    controller?: unknown;
    hostDiv?: HTMLDivElement;
    model?: unknown;
    div?: HTMLDivElement;
    resourceListenerEvent: { clear: jest.Mock };
    createDiv: jest.Mock;
    createModel: jest.Mock;
    initializeController: jest.Mock;
    onload: jest.Mock;
    onErrorInternal: jest.Mock;
    unbind: jest.Mock;
    setOpacity: jest.Mock;
    setTranslateX: jest.Mock;
    setTranslateY: jest.Mock;
};

type PaneLikeStub = {
    width: number;
    height: number;
    surface: { scale: number };
    childSurface: SurfaceLikeStub;
    element: HTMLDivElement;
    isPrepared: boolean;
    setHostDivScrolling: jest.Mock;
};

function createSurfaceStub(): SurfaceLikeStub {
    return {
        scale: 1,
        width: 120,
        height: 80,
        isChild: false,
        model: {},
        div: { style: { clip: '' } } as unknown as HTMLDivElement,
        resourceListenerEvent: { clear: jest.fn() },
        createDiv: jest.fn(),
        createModel: jest.fn(),
        initializeController: jest.fn(),
        onload: jest.fn(),
        onErrorInternal: jest.fn(),
        unbind: jest.fn(),
        setOpacity: jest.fn(),
        setTranslateX: jest.fn(),
        setTranslateY: jest.fn()
    };
}

function createPaneStub(source: SurfaceLikeStub): PaneLikeStub {
    return {
        width: 120,
        height: 80,
        surface: { scale: 1 },
        childSurface: source,
        element: { style: { overflow: '' } } as unknown as HTMLDivElement,
        isPrepared: true,
        setHostDivScrolling: jest.fn()
    };
}

describe('pane transition lifecycle classes', () => {
    let frameQueue: Array<(time: number) => void>;
    let nowValue: number;
    let perfNowSpy: jest.SpyInstance<number, []>;

    beforeEach(() => {
        frameQueue = [];
        nowValue = 1;
        perfNowSpy = jest.spyOn(performance, 'now').mockImplementation(() => nowValue);
        (globalThis as unknown as { requestAnimationFrame: (cb: (time: number) => void) => number }).requestAnimationFrame = jest
            .fn()
            .mockImplementation((cb: (time: number) => void) => {
                frameQueue.push(cb);
                return frameQueue.length;
            });
        (globalThis as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame = jest.fn();
    });

    afterEach(() => {
        perfNowSpy.mockRestore();
    });

    function runNextFrame(timeAdvanceMs: number) {
        const next = frameQueue.shift();
        if (!next) {
            throw new Error('Expected an animation frame callback');
        }
        nowValue += timeAdvanceMs;
        next(nowValue);
    }

    test('fade transition completes and can be canceled', () => {
        const source = createSurfaceStub();
        const target = createSurfaceStub();
        const pane = createPaneStub(source);
        const callback = jest.fn();
        const transition = new PaneTransitionFade(pane as any, target as any, callback, 0.1);

        transition.start();

        expect(target.setOpacity).toHaveBeenCalledWith(0);
        expect(frameQueue).toHaveLength(1);

        runNextFrame(200);

        expect(source.unbind).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(target.onload).toHaveBeenCalledTimes(1);

        transition.cancel();
        expect(target.setOpacity).toHaveBeenCalledWith(1);
    });

    test('push transition updates offsets then completes and cancel resets transforms', () => {
        const source = createSurfaceStub();
        const target = createSurfaceStub();
        const pane = createPaneStub(source);
        const callback = jest.fn();
        const transition = new PaneTransitionPush(
            pane as any,
            target as any,
            callback,
            1,
            PaneTransitionDirection.Left
        );

        transition.start();

        expect(target.setTranslateX).toHaveBeenCalledWith(pane.width);

        runNextFrame(500);
        expect(source.setTranslateX).toHaveBeenCalled();

        runNextFrame(600);
        expect(source.unbind).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledTimes(1);

        transition.cancel();
        expect(target.setTranslateX).toHaveBeenCalledWith(0);
        expect(target.setTranslateY).toHaveBeenCalledWith(0);
    });

    test('reveal transition moves source and completes', () => {
        const source = createSurfaceStub();
        const target = createSurfaceStub();
        const pane = createPaneStub(source);
        const callback = jest.fn();
        const transition = new PaneTransitionReveal(
            pane as any,
            target as any,
            callback,
            1,
            PaneTransitionDirection.RightDown
        );

        transition.start();

        runNextFrame(400);
        expect(source.setTranslateX).toHaveBeenCalled();
        expect(source.setTranslateY).toHaveBeenCalled();

        runNextFrame(700);
        expect(source.unbind).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test.each([
        PaneTransitionDirection.Left,
        PaneTransitionDirection.LeftUp,
        PaneTransitionDirection.LeftDown,
        PaneTransitionDirection.Right,
        PaneTransitionDirection.RightUp,
        PaneTransitionDirection.RightDown,
        PaneTransitionDirection.Up,
        PaneTransitionDirection.Down
    ])('reveal transition supports direction %s', direction => {
        const source = createSurfaceStub();
        const target = createSurfaceStub();
        const pane = createPaneStub(source);
        const transition = new PaneTransitionReveal(pane as any, target as any, jest.fn(), 1, direction);

        transition.start();
        runNextFrame(500);

        expect(source.setTranslateX.mock.calls.length + source.setTranslateY.mock.calls.length).toBeGreaterThan(0);

        transition.cancel();
        expect(source.unbind).toHaveBeenCalled();
    });

    test('slide transition positions target, animates, and supports cancel', () => {
        const source = createSurfaceStub();
        const target = createSurfaceStub();
        const pane = createPaneStub(source);
        const callback = jest.fn();
        const transition = new PaneTransitionSlide(
            pane as any,
            target as any,
            callback,
            1,
            PaneTransitionDirection.LeftDown
        );

        transition.start();

        expect(target.setTranslateX).toHaveBeenCalledWith(pane.width);
        expect(target.setTranslateY).toHaveBeenCalledWith(-target.height);

        runNextFrame(500);
        expect(target.setTranslateX).toHaveBeenCalled();
        expect(target.setTranslateY).toHaveBeenCalled();

        transition.cancel();
        expect(source.unbind).toHaveBeenCalledTimes(1);
        expect(target.setTranslateX).toHaveBeenCalledWith(0);
        expect(target.setTranslateY).toHaveBeenCalledWith(0);
    });

    test.each([
        PaneTransitionDirection.Left,
        PaneTransitionDirection.LeftUp,
        PaneTransitionDirection.LeftDown,
        PaneTransitionDirection.Right,
        PaneTransitionDirection.RightUp,
        PaneTransitionDirection.RightDown,
        PaneTransitionDirection.Up,
        PaneTransitionDirection.Down
    ])('slide transition supports direction %s', direction => {
        const source = createSurfaceStub();
        const target = createSurfaceStub();
        const pane = createPaneStub(source);
        const transition = new PaneTransitionSlide(pane as any, target as any, jest.fn(), 1, direction);

        transition.start();
        runNextFrame(500);

        expect(target.setTranslateX.mock.calls.length + target.setTranslateY.mock.calls.length).toBeGreaterThan(0);

        transition.cancel();
        expect(source.unbind).toHaveBeenCalled();
    });

    test('wipe transition out mode clips target and clears clip on complete', () => {
        const source = createSurfaceStub();
        const target = createSurfaceStub();
        const pane = createPaneStub(source);
        const callback = jest.fn();
        const transition = new PaneTransitionWipe(
            pane as any,
            target as any,
            callback,
            1,
            PaneTransitionDirection.Out
        );

        transition.start();

        expect(target.createDiv).toHaveBeenCalledWith(false);
        expect(target.div!.style.clip).not.toBe('');

        runNextFrame(1100);

        expect(target.div!.style.clip).toBe('');
        expect(source.unbind).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test.each([
        PaneTransitionDirection.Left,
        PaneTransitionDirection.LeftUp,
        PaneTransitionDirection.LeftDown,
        PaneTransitionDirection.Right,
        PaneTransitionDirection.RightUp,
        PaneTransitionDirection.RightDown,
        PaneTransitionDirection.Up,
        PaneTransitionDirection.Down,
        PaneTransitionDirection.In,
        PaneTransitionDirection.InX,
        PaneTransitionDirection.InY,
        PaneTransitionDirection.OutX,
        PaneTransitionDirection.OutY
    ])('wipe transition supports direction %s', direction => {
        const source = createSurfaceStub();
        const target = createSurfaceStub();
        const pane = createPaneStub(source);
        const transition = new PaneTransitionWipe(pane as any, target as any, jest.fn(), 1, direction);

        transition.start();
        runNextFrame(500);

        if (
            direction === PaneTransitionDirection.Out ||
            direction === PaneTransitionDirection.OutX ||
            direction === PaneTransitionDirection.OutY
        ) {
            expect(target.div!.style.clip).not.toBe('');
        }
        else {
            expect(source.div!.style.clip).not.toBe('');
        }

        transition.cancel();
        expect(source.unbind).toHaveBeenCalled();
    });
});