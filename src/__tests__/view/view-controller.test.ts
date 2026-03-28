import { ViewController } from '../../view/view-controller';

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

function installInteractiveSurface(controller: ViewController, activeElement: unknown) {
    const context = {};
    const activePath = Array.isArray(activeElement) ? activeElement : [activeElement];
    controller.canvas = {
        width: 100,
        height: 100,
        style: { cursor: 'default' },
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
        getContext: () => context
    } as unknown as HTMLCanvasElement;

    controller.model = {
        getSize: () => ({ width: 100, height: 100 }),
        firstActiveElementAt: jest.fn(() => activePath[0]),
        activeElementPathAt: jest.fn(() => activePath),
    } as unknown as any;
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

test('view controller tick stops timer when timer event throws', () => {
    const controller = new ViewController();
    controller.timerEnabled = true;

    const triggerMock = jest.spyOn(controller.timer, 'trigger').mockImplementation(() => {
        throw new Error('timer failed');
    });

    controller.tick();

    expect(controller.timerEnabled).toBe(false);
    expect(controller.timerHandle).toBeUndefined();

    triggerMock.mockRestore();
});

test('view controller timer lifecycle start pause resume stop', () => {
    const controller = new ViewController();
    const fakeWindowScope = installFakeWindow();
    const { fakeWindow } = fakeWindowScope;

    controller.startTimer();

    expect(controller.timerEnabled).toBe(true);
    expect(controller.timerHandle).toBe(101);

    controller.pauseTimer();

    expect(controller.timerEnabled).toBe(false);
    expect(controller.timerHandle).toBeUndefined();
    expect(fakeWindow.cancelAnimationFrame).toHaveBeenCalledWith(101);

    controller.resumeTimer();

    expect(controller.timerEnabled).toBe(true);
    expect(controller.timerHandle).toBe(101);

    controller.stopTimer();

    expect(controller.timerEnabled).toBe(false);
    expect(controller.timerHandle).toBeUndefined();
    fakeWindowScope.restore();
});

test('view controller windowToCanvasWithOutput scales clamps and offsets', () => {
    const controller = new ViewController();

    controller.scale = 2;
    controller.offsetX = 5;
    controller.offsetY = -3;
    controller.isMouseOver = true;

    controller.model = {
        getSize: () => ({ width: 100, height: 50 })
    } as unknown as any;

    controller.canvas = {
        width: 200,
        height: 100,
        getBoundingClientRect: () => ({ left: 10, top: 20, width: 100, height: 50 })
    } as unknown as HTMLCanvasElement;

    const out = { x: 0, y: 0 } as any;
    const result = controller.windowToCanvasWithOutput(0, 0, out);

    expect(result).toBe(out);
    expect(result.x).toBe(5);
    expect(result.y).toBe(-3);
});

test('view controller detach clears timers listeners and canvas', () => {
    const controller = new ViewController();
    const fakeWindowScope = installFakeWindow();
    const { fakeWindow } = fakeWindowScope;

    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout').mockImplementation(() => undefined);

    const removeCanvasListener = jest.fn();
    const removeChild = jest.fn();

    controller.eventTimer = 7 as unknown as any;
    controller.timerEnabled = true;
    controller.timerHandle = 9;

    controller.model = {
        controllerDetached: { trigger: jest.fn(), clear: jest.fn() },
        controllerAttached: { clear: jest.fn() }
    } as unknown as any;

    controller.canvas = {
        removeEventListener: removeCanvasListener,
        parentElement: { removeChild }
    } as unknown as HTMLCanvasElement;

    controller.detach();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(7);
    expect(fakeWindow.cancelAnimationFrame).toHaveBeenCalledWith(9);
    expect(fakeWindow.removeEventListener).toHaveBeenCalled();
    expect(removeCanvasListener).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(controller.canvas).toBeUndefined();

    clearTimeoutSpy.mockRestore();
    fakeWindowScope.restore();
});

test('view controller mouse down/move/up routes element events and click', () => {
    const controller = new ViewController();
    const fakeWindowScope = installFakeWindow();
    const element = { id: 'el1' } as any;

    installInteractiveSurface(controller, element);

    const mouseDownView = jest.fn();
    const mouseDownElement = jest.fn();
    const mouseMovedView = jest.fn();
    const mouseUpElement = jest.fn();
    const elementClicked = jest.fn();

    controller.mouseDownView.add(mouseDownView);
    controller.mouseDownElement.add(mouseDownElement);
    controller.mouseMovedView.add(mouseMovedView);
    controller.mouseUpElement.add(mouseUpElement);
    controller.elementClicked.add(elementClicked);

    controller.onCanvasMouseDown({ clientX: 10, clientY: 12 } as any);

    expect(controller.isMouseDown).toBe(true);
    expect(controller.pressedElement).toBe(element);
    expect(mouseDownView).toHaveBeenCalled();
    expect(mouseDownElement).toHaveBeenCalledWith(controller, element);

    controller.onCanvasMouseMove({ clientX: 30, clientY: 12 } as any);

    expect(controller.clickCancelled).toBe(true);
    expect(mouseMovedView).toHaveBeenCalled();

    controller.clickCancelled = false;
    controller.mouseOverElement = element;
    controller.onCanvasMouseUp({ clientX: 30, clientY: 12 } as any);

    expect(controller.isMouseDown).toBe(false);
    expect(mouseUpElement).toHaveBeenCalledWith(controller, element);
    expect(elementClicked).toHaveBeenCalledWith(controller, element);

    fakeWindowScope.restore();
});

test('view controller delayed mouse down sets pending element after timer', () => {
    jest.useFakeTimers();

    const controller = new ViewController();
    const fakeWindowScope = installFakeWindow();
    const element = { id: 'el2' } as any;

    controller.eventDelay = 10;
    installInteractiveSurface(controller, element);

    controller.onCanvasMouseDown({ clientX: 5, clientY: 6 } as any);

    expect(controller.pendingMouseDownElement).toBe(element);
    expect(controller.pressedElement).toBeUndefined();

    jest.advanceTimersByTime(11);

    expect(controller.pressedElement).toBe(element);

    fakeWindowScope.restore();
    jest.useRealTimers();
});

test('view controller touch events route through mouse handlers', () => {
    const controller = new ViewController();
    const fakeWindowScope = installFakeWindow();
    const element = { id: 'touch-el' } as any;

    installInteractiveSurface(controller, element);

    const touchStart = createTouchEvent([createTouch(7, 10, 12)]);
    const touchMove = createTouchEvent([createTouch(7, 28, 12)]);
    const touchEnd = createTouchEvent([], [createTouch(7, 28, 12)]);

    controller.onCanvasTouchStart(touchStart);

    expect(controller.activeTouchId).toBe(7);
    expect(controller.isMouseDown).toBe(true);

    controller.onCanvasTouchMove(touchMove);

    expect(controller.clickCancelled).toBe(true);
    expect(touchMove.preventDefault).toHaveBeenCalled();

    controller.mouseOverElement = element;
    controller.clickCancelled = false;
    controller.onCanvasTouchEnd(touchEnd);

    expect(controller.activeTouchId).toBeUndefined();
    expect(controller.isMouseDown).toBe(false);
    expect(touchEnd.preventDefault).toHaveBeenCalled();

    fakeWindowScope.restore();
});

test('view controller bubbles element events through active element path', () => {
    const controller = new ViewController();
    const fakeWindowScope = installFakeWindow();
    const child = { id: 'child' } as any;
    const parent = { id: 'parent' } as any;

    installInteractiveSurface(controller, [child, parent]);

    const mouseDownElement = jest.fn();
    const mouseUpElement = jest.fn();
    const elementClicked = jest.fn();

    controller.mouseDownElement.add(mouseDownElement);
    controller.mouseUpElement.add(mouseUpElement);
    controller.elementClicked.add(elementClicked);

    controller.onCanvasMouseDown({ clientX: 10, clientY: 12 } as any);
    controller.onCanvasMouseMove({ clientX: 10, clientY: 12 } as any);
    controller.onCanvasMouseUp({ clientX: 10, clientY: 12 } as any);

    expect(mouseDownElement.mock.calls).toEqual([
        [controller, child],
        [controller, parent],
    ]);
    expect(mouseUpElement.mock.calls).toEqual([
        [controller, child],
        [controller, parent],
    ]);
    expect(elementClicked.mock.calls).toEqual([
        [controller, child],
        [controller, parent],
    ]);

    fakeWindowScope.restore();
});
