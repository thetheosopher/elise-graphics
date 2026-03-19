import { PaneTransitionFade } from '../../surface/pane-transitions/pane-transition-fade';
import { PaneTransitionNone } from '../../surface/pane-transitions/pane-transition-none';
import { PaneTransitionPush } from '../../surface/pane-transitions/pane-transition-push';
import { PaneTransitionReveal } from '../../surface/pane-transitions/pane-transition-reveal';
import { PaneTransitionSlide } from '../../surface/pane-transitions/pane-transition-slide';
import { PaneTransitionWipe } from '../../surface/pane-transitions/pane-transition-wipe';
import { SurfacePane } from '../../surface/surface-pane';

type SurfaceStub = {
    width: number;
    height: number;
    scale: number;
    isChild: boolean;
    resourceListenerEvent: {
        clear: jest.Mock;
        listeners: Array<unknown>;
        add: jest.Mock;
    };
    unbind: jest.Mock;
    setOpacity: jest.Mock;
    setTranslateX: jest.Mock;
    setTranslateY: jest.Mock;
    onload: jest.Mock;
    onErrorInternal: jest.Mock;
    controller?: unknown;
    hostDiv?: HTMLDivElement;
    model?: unknown;
    div?: HTMLDivElement;
    createDiv: jest.Mock;
    createModel: jest.Mock;
    initializeController: jest.Mock;
    bind: jest.Mock;
};

function createSurfaceStub(): SurfaceStub {
    return {
        width: 100,
        height: 100,
        scale: 1,
        isChild: false,
        resourceListenerEvent: {
            clear: jest.fn(),
            listeners: [],
            add: jest.fn()
        },
        unbind: jest.fn(),
        setOpacity: jest.fn(),
        setTranslateX: jest.fn(),
        setTranslateY: jest.fn(),
        onload: jest.fn(),
        onErrorInternal: jest.fn(),
        createDiv: jest.fn(),
        createModel: jest.fn(),
        initializeController: jest.fn(),
        bind: jest.fn()
    };
}

test('surface pane destroy cancels active transition', () => {
    const oldChild = createSurfaceStub();
    const pane = new SurfacePane('pane', 0, 0, 100, 100, oldChild as unknown as any);

    const activeTransition = { cancel: jest.fn() };
    (pane as unknown as { activeTransition?: { cancel: () => void } }).activeTransition = activeTransition;

    pane.destroy();

    expect(activeTransition.cancel).toHaveBeenCalledTimes(1);
    expect(oldChild.unbind).toHaveBeenCalledTimes(1);
});

test('surface pane startTransition cancels previous transition', () => {
    const oldChild = createSurfaceStub();
    const pane = new SurfacePane('pane', 0, 0, 100, 100, oldChild as unknown as any);

    const previous = { cancel: jest.fn() };
    const next = { start: jest.fn() };

    (pane as unknown as { activeTransition?: { cancel: () => void } }).activeTransition = previous;
    (pane as unknown as { startTransition: (transition: { start: () => void }) => void }).startTransition(next);

    expect(previous.cancel).toHaveBeenCalledTimes(1);
    expect(next.start).toHaveBeenCalledTimes(1);
});

test('surface pane replaceSurface rolls back child on transition start failure', () => {
    const oldChild = createSurfaceStub();
    const newChild = createSurfaceStub();
    const pane = new SurfacePane('pane', 0, 0, 100, 100, oldChild as unknown as any);

    pane.surface = { scale: 1 } as unknown as any;
    pane.element = { style: { overflow: '' } } as unknown as HTMLDivElement;

    const startSpy = jest.spyOn(PaneTransitionNone.prototype, 'start').mockImplementation(function(this: PaneTransitionNone) {
        this.onStart();
        throw new Error('transition failed');
    });

    expect(() => {
        pane.replaceSurface(newChild as unknown as any, () => {});
    }).toThrow('transition failed');

    expect(newChild.unbind).toHaveBeenCalledTimes(1);
    expect(pane.childSurface).toBe(oldChild as unknown as any);

    startSpy.mockRestore();
});

test('surface pane replaceSurface maps transition names to transition classes', () => {
    const oldChild = createSurfaceStub();
    const pane = new SurfacePane('pane', 0, 0, 100, 100, oldChild as unknown as any);

    pane.surface = { scale: 1 } as unknown as any;
    pane.element = { style: { overflow: '' } } as unknown as HTMLDivElement;

    const fadeSpy = jest.spyOn(PaneTransitionFade.prototype, 'start').mockImplementation(() => {});
    const pushSpy = jest.spyOn(PaneTransitionPush.prototype, 'start').mockImplementation(() => {});
    const revealSpy = jest.spyOn(PaneTransitionReveal.prototype, 'start').mockImplementation(() => {});
    const slideSpy = jest.spyOn(PaneTransitionSlide.prototype, 'start').mockImplementation(() => {});
    const wipeSpy = jest.spyOn(PaneTransitionWipe.prototype, 'start').mockImplementation(() => {});
    const noneSpy = jest.spyOn(PaneTransitionNone.prototype, 'start').mockImplementation(() => {});

    const cases = [
        { transition: 'fade', expectedType: PaneTransitionFade, expectedSpy: fadeSpy },
        { transition: 'FADE', expectedType: PaneTransitionFade, expectedSpy: fadeSpy },

        { transition: 'pushleft', expectedType: PaneTransitionPush, expectedSpy: pushSpy },
        { transition: 'pushright', expectedType: PaneTransitionPush, expectedSpy: pushSpy },
        { transition: 'pushup', expectedType: PaneTransitionPush, expectedSpy: pushSpy },
        { transition: 'pushdown', expectedType: PaneTransitionPush, expectedSpy: pushSpy },

        { transition: 'wipeleft', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wipeleftup', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wipeleftdown', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wiperight', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wiperightup', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wiperightdown', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wipeup', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wipedown', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wipein', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wipeinx', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wipeiny', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wipeout', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wipeoutx', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },
        { transition: 'wipeouty', expectedType: PaneTransitionWipe, expectedSpy: wipeSpy },

        { transition: 'revealleft', expectedType: PaneTransitionReveal, expectedSpy: revealSpy },
        { transition: 'revealleftup', expectedType: PaneTransitionReveal, expectedSpy: revealSpy },
        { transition: 'revealleftdown', expectedType: PaneTransitionReveal, expectedSpy: revealSpy },
        { transition: 'revealright', expectedType: PaneTransitionReveal, expectedSpy: revealSpy },
        { transition: 'revealrightup', expectedType: PaneTransitionReveal, expectedSpy: revealSpy },
        { transition: 'revealrightdown', expectedType: PaneTransitionReveal, expectedSpy: revealSpy },
        { transition: 'revealup', expectedType: PaneTransitionReveal, expectedSpy: revealSpy },
        { transition: 'revealdown', expectedType: PaneTransitionReveal, expectedSpy: revealSpy },

        { transition: 'slideleft', expectedType: PaneTransitionSlide, expectedSpy: slideSpy },
        { transition: 'slideleftup', expectedType: PaneTransitionSlide, expectedSpy: slideSpy },
        { transition: 'slideleftdown', expectedType: PaneTransitionSlide, expectedSpy: slideSpy },
        { transition: 'slideright', expectedType: PaneTransitionSlide, expectedSpy: slideSpy },
        { transition: 'sliderightup', expectedType: PaneTransitionSlide, expectedSpy: slideSpy },
        { transition: 'sliderightdown', expectedType: PaneTransitionSlide, expectedSpy: slideSpy },
        { transition: 'slideup', expectedType: PaneTransitionSlide, expectedSpy: slideSpy },
        { transition: 'slidedown', expectedType: PaneTransitionSlide, expectedSpy: slideSpy },

        { transition: 'unknown', expectedType: PaneTransitionNone, expectedSpy: noneSpy }
    ];

    for (const testCase of cases) {
        const replacement = createSurfaceStub();
        const onComplete = jest.fn();

        pane.replaceSurface(replacement as unknown as any, onComplete, testCase.transition, 0.1);

        const activeTransition = (pane as unknown as { activeTransition?: unknown }).activeTransition;
        expect(activeTransition).toBeInstanceOf(testCase.expectedType);
        expect(testCase.expectedSpy).toHaveBeenCalled();
    }

    const implicitDefaultReplacement = createSurfaceStub();
    pane.replaceSurface(implicitDefaultReplacement as unknown as any, jest.fn());
    expect((pane as unknown as { activeTransition?: unknown }).activeTransition).toBeInstanceOf(PaneTransitionNone);

    const missingDurationReplacement = createSurfaceStub();
    pane.replaceSurface(missingDurationReplacement as unknown as any, jest.fn(), 'fade');
    expect((pane as unknown as { activeTransition?: unknown }).activeTransition).toBeInstanceOf(PaneTransitionNone);

    fadeSpy.mockRestore();
    pushSpy.mockRestore();
    revealSpy.mockRestore();
    slideSpy.mockRestore();
    wipeSpy.mockRestore();
    noneSpy.mockRestore();
});

test('surface pane replaceSurface completion clears active transition and invokes callback', () => {
    const oldChild = createSurfaceStub();
    const replacement = createSurfaceStub();
    const pane = new SurfacePane('pane', 0, 0, 100, 100, oldChild as unknown as any);

    pane.surface = { scale: 1 } as unknown as any;
    pane.element = { style: { overflow: '' } } as unknown as HTMLDivElement;

    const startSpy = jest.spyOn(PaneTransitionFade.prototype, 'start').mockImplementation(() => {});
    const callback = jest.fn();

    pane.replaceSurface(replacement as unknown as any, callback, 'fade', 0.1);

    const transition = (pane as unknown as { activeTransition?: { onComplete: () => void } }).activeTransition;
    expect(transition).toBeDefined();

    transition!.onComplete();

    expect((pane as unknown as { activeTransition?: unknown }).activeTransition).toBeUndefined();
    expect(callback).toHaveBeenCalledTimes(1);

    startSpy.mockRestore();
});
