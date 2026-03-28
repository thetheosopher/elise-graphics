import { Point } from '../../core/point';
import { DesignTouchInteractionService, type DesignTouchInteractionHost } from '../../design/design-touch-interaction-service';

function createTouch(identifier: number, clientX: number, clientY: number) {
    return { identifier, clientX, clientY } as Touch;
}

function createTouchList(touches: Touch[]): TouchList {
    const touchList = {
        length: touches.length,
        item: (index: number) => touches[index] ?? null,
    } as Record<string, unknown>;
    touches.forEach((touch, index) => {
        touchList[index] = touch;
    });
    return touchList as unknown as TouchList;
}

function createTouchEvent(touches: Touch[], changedTouches: Touch[] = touches) {
    return {
        touches: createTouchList(touches),
        changedTouches: createTouchList(changedTouches),
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
    } as unknown as TouchEvent;
}

function installFakeWindow() {
    const globals = globalThis as unknown as { window?: any };
    const originalWindow = globals.window;
    const fakeWindow = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    };
    globals.window = fakeWindow;
    return {
        fakeWindow,
        restore: () => {
            globals.window = originalWindow;
        },
    };
}

function createHost(): { host: DesignTouchInteractionHost; scaleSpy: jest.Mock } {
    const scrollContainer = { scrollLeft: 30, scrollTop: 40 } as HTMLElement;
    const hostElement = { parentElement: scrollContainer } as HTMLElement;
    const canvas = { parentElement: hostElement } as HTMLCanvasElement;
    const onCanvasMouseDown = jest.fn();
    const onCanvasMouseMove = jest.fn();
    const onCanvasMouseUp = jest.fn();
    const scaleSpy = jest.fn();

    const host: DesignTouchInteractionHost = {
        enabled: true,
        canvas,
        scale: 1,
        activeTouchId: undefined,
        touchGestureActive: false,
        gestureStartDistance: undefined,
        gestureStartScale: undefined,
        gestureLastCenter: undefined,
        cancelAction: false,
        isMouseDown: false,
        windowTouchEnd: jest.fn(),
        windowTouchMove: jest.fn(),
        windowTouchCancel: jest.fn(),
        onCanvasMouseDown,
        onCanvasMouseMove,
        onCanvasMouseUp,
        setScale: scaleSpy,
    };

    return { host, scaleSpy };
}

describe('DesignTouchInteractionService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('single touch routes through the mouse interaction path', () => {
        const service = new DesignTouchInteractionService();
        const fakeWindowScope = installFakeWindow();
        const { host } = createHost();
        const touchStart = createTouchEvent([createTouch(3, 10, 12)]);
        const touchMove = createTouchEvent([createTouch(3, 26, 18)]);
        const touchEnd = createTouchEvent([], [createTouch(3, 26, 18)]);

        service.onCanvasTouchStart(host, touchStart);

        expect(host.activeTouchId).toBe(3);
        expect(host.onCanvasMouseDown).toHaveBeenCalledTimes(1);

        service.onCanvasTouchMove(host, touchMove);

        expect(host.onCanvasMouseMove).toHaveBeenCalledTimes(1);
        expect(touchMove.preventDefault).toHaveBeenCalled();

        service.onCanvasTouchEnd(host, touchEnd);

        expect(host.activeTouchId).toBeUndefined();
        expect(host.onCanvasMouseUp).toHaveBeenCalledTimes(1);
        expect(touchEnd.preventDefault).toHaveBeenCalled();
        fakeWindowScope.restore();
    });

    test('two finger gestures update scale and pan the nearest scroll container', () => {
        const service = new DesignTouchInteractionService();
        const fakeWindowScope = installFakeWindow();
        const { host, scaleSpy } = createHost();
        const gestureStart = createTouchEvent([
            createTouch(1, 0, 0),
            createTouch(2, 0, 10),
        ]);
        const gestureMove = createTouchEvent([
            createTouch(1, 5, 5),
            createTouch(2, 5, 25),
        ]);
        const gestureEnd = createTouchEvent([], [createTouch(1, 5, 5), createTouch(2, 5, 25)]);

        service.onCanvasTouchStart(host, gestureStart);

        expect(host.touchGestureActive).toBe(true);
        expect(host.gestureStartScale).toBe(1);
        expect(host.gestureLastCenter).toMatchObject({ x: 0, y: 5 });

        service.onCanvasTouchMove(host, gestureMove);

        expect(scaleSpy).toHaveBeenCalledWith(2);
        expect((host.canvas?.parentElement?.parentElement as HTMLElement).scrollLeft).toBe(25);
        expect((host.canvas?.parentElement?.parentElement as HTMLElement).scrollTop).toBe(30);
        expect(host.gestureLastCenter).toMatchObject({ x: 5, y: 15 });

        service.onCanvasTouchEnd(host, gestureEnd);

        expect(host.touchGestureActive).toBe(false);
        expect(host.gestureStartScale).toBeUndefined();
        expect(host.gestureLastCenter).toBeUndefined();
        fakeWindowScope.restore();
    });
});