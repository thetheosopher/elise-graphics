import { DesignController } from '../../design/design-controller';

function installFakeWindow() {
    const globals = globalThis as unknown as { window?: any };
    const originalWindow = globals.window;
    const fakeWindow = {
        requestAnimationFrame: jest.fn(() => 101),
        cancelAnimationFrame: jest.fn(),
        removeEventListener: jest.fn(),
        addEventListener: jest.fn()
    };
    globals.window = fakeWindow;
    return {
        fakeWindow,
        restore: () => {
            globals.window = originalWindow;
        }
    };
}

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

function installDesignSurface(controller: DesignController) {
    const scrollContainer = { scrollLeft: 30, scrollTop: 40 } as HTMLElement;
    const hostElement = {
        style: {},
        parentElement: scrollContainer,
    } as unknown as HTMLDivElement;
    const context = {
        isPointInPath: jest.fn(() => false),
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        rect: jest.fn(),
        closePath: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    controller.canvas = {
        width: 100,
        height: 100,
        style: { cursor: 'default' },
        parentElement: hostElement,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
        getContext: () => context,
    } as unknown as HTMLCanvasElement;

    controller.model = {
        getSize: () => ({ width: 100, height: 100 }),
        firstActiveElementAt: jest.fn(() => undefined),
        elementsAt: jest.fn(() => []),
        elements: [],
        setRenderTransform: jest.fn(),
    } as unknown as any;

    controller.draw = jest.fn();

    return { scrollContainer };
}

describe('design controller touch support', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('single touch routes through existing mouse interaction path', () => {
        const controller = new DesignController();
        const fakeWindowScope = installFakeWindow();

        installDesignSurface(controller);

        const touchStart = createTouchEvent([createTouch(3, 10, 12)]);
        const touchMove = createTouchEvent([createTouch(3, 26, 18)]);
        const touchEnd = createTouchEvent([], [createTouch(3, 26, 18)]);

        controller.onCanvasTouchStart(touchStart);

        expect(controller.activeTouchId).toBe(3);
        expect(controller.isMouseDown).toBe(true);

        controller.onCanvasTouchMove(touchMove);

        expect(controller.lastClientX).toBe(26);
        expect(controller.lastClientY).toBe(18);
        expect(touchMove.preventDefault).toHaveBeenCalled();

        controller.onCanvasTouchEnd(touchEnd);

        expect(controller.activeTouchId).toBeUndefined();
        expect(controller.isMouseDown).toBe(false);
        expect(touchEnd.preventDefault).toHaveBeenCalled();

        fakeWindowScope.restore();
    });

    test('two finger gesture updates scale and pans nearest scroll container', () => {
        const controller = new DesignController();
        const fakeWindowScope = installFakeWindow();
        const { scrollContainer } = installDesignSurface(controller);

        const gestureStart = createTouchEvent([
            createTouch(1, 0, 0),
            createTouch(2, 0, 10),
        ]);
        const gestureMove = createTouchEvent([
            createTouch(1, 5, 5),
            createTouch(2, 5, 25),
        ]);
        const gestureEnd = createTouchEvent([], [createTouch(1, 5, 5), createTouch(2, 5, 25)]);

        controller.onCanvasTouchStart(gestureStart);

        expect(controller.touchGestureActive).toBe(true);
        expect(controller.gestureStartScale).toBe(1);

        controller.onCanvasTouchMove(gestureMove);

        expect(controller.scale).toBe(2);
        expect(scrollContainer.scrollLeft).toBe(25);
        expect(scrollContainer.scrollTop).toBe(30);

        controller.onCanvasTouchEnd(gestureEnd);

        expect(controller.touchGestureActive).toBe(false);
        expect(controller.gestureStartScale).toBeUndefined();

        fakeWindowScope.restore();
    });
});