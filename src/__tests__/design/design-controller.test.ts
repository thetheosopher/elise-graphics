import { DesignController } from '../../design/design-controller';
import { Model } from '../../core/model';
import { RectangleElement } from '../../elements/rectangle-element';
import { Size } from '../../core/size';
import { Point } from '../../core/point';
import { Handle } from '../../design/handle';
import { HandleMovedArgs } from '../../design/handle-moved-args';
import { RectangleTool } from '../../design/tools/rectangle-tool';

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

function installCanvasOnly(controller: DesignController) {
    controller.canvas = {
        width: 100,
        height: 100,
        style: { cursor: 'default', touchAction: 'none' },
        parentElement: { style: {} } as unknown as HTMLDivElement,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
        getContext: () => ({}) as CanvasRenderingContext2D,
    } as unknown as HTMLCanvasElement;
    controller.draw = jest.fn();
}

function createOverlayContext() {
    return {
        clearRect: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        scale: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        arc: jest.fn(),
        fillText: jest.fn(),
        strokeText: jest.fn(),
        setLineDash: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        closePath: jest.fn(),
        rect: jest.fn(),
        createPattern: jest.fn(() => undefined),
        lineWidth: 1,
        strokeStyle: '',
        fillStyle: '',
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
}

function installDrawCanvas(controller: DesignController, context: CanvasRenderingContext2D) {
    controller.canvas = {
        width: 100,
        height: 100,
        style: { cursor: 'default' },
        parentElement: { style: {} } as unknown as HTMLDivElement,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
        getContext: () => context,
    } as unknown as HTMLCanvasElement;
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

describe('design controller undo and redo', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('undo and redo restore added elements', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        installCanvasOnly(controller);
        controller.setModel(model);

        const rectangle = RectangleElement.create(10, 10, 20, 15).setInteractive(true);
        controller.addElement(rectangle);

        expect(model.elements).toHaveLength(1);
        expect(controller.canUndo).toBe(true);
        expect(controller.canRedo).toBe(false);

        controller.undo();

        expect(model.elements).toHaveLength(0);
        expect(controller.canUndo).toBe(false);
        expect(controller.canRedo).toBe(true);

        controller.redo();

        expect(model.elements).toHaveLength(1);
        expect(model.elements[0].getBounds()?.x).toBe(10);
        expect(controller.canUndo).toBe(true);
        expect(controller.canRedo).toBe(false);
    });

    test('undo restores nudged selection location', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const rectangle = RectangleElement.create(10, 10, 20, 15).setInteractive(true);
        model.add(rectangle);
        installCanvasOnly(controller);
        controller.setModel(model);
        controller.selectElement(rectangle);

        controller.nudgeLocation(5, 7);

        expect(model.elements[0].getBounds()?.x).toBe(15);
        expect(model.elements[0].getBounds()?.y).toBe(17);

        controller.undo();

        expect(model.elements[0].getBounds()?.x).toBe(10);
        expect(model.elements[0].getBounds()?.y).toBe(10);
        expect(controller.selectedElements).toHaveLength(1);
    });

    test('tool-created elements become undoable when creation commits', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        installCanvasOnly(controller);
        controller.setModel(model);
        const fakeWindowScope = installFakeWindow();

        controller.setActiveTool(new RectangleTool());
        controller.onCanvasMouseDown({ button: 0, clientX: 10, clientY: 10 });
        controller.onCanvasMouseMove({ button: 0, clientX: 40, clientY: 30 });
        controller.onCanvasMouseUp({ button: 0, clientX: 40, clientY: 30 });

        expect(model.elements).toHaveLength(1);
        expect(controller.canUndo).toBe(true);

        controller.undo();

        expect(model.elements).toHaveLength(0);

        fakeWindowScope.restore();
    });

    test('keyboard shortcuts route to undo and redo', () => {
        const controller = new DesignController();
        const undoSpy = jest.spyOn(controller, 'undo').mockReturnValue(true);
        const redoSpy = jest.spyOn(controller, 'redo').mockReturnValue(true);

        const ctrlZ = {
            keyCode: 90,
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;
        const ctrlY = {
            keyCode: 89,
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;

        expect(controller.onCanvasKeyDown(ctrlZ)).toBe(true);
        expect(controller.onCanvasKeyDown(ctrlY)).toBe(true);
        expect(undoSpy).toHaveBeenCalledTimes(1);
        expect(redoSpy).toHaveBeenCalledTimes(1);
    });
});

describe('design controller resize aspect locking', () => {
    test('controller forwards shift state to active resize handles', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        installCanvasOnly(controller);
        controller.setModel(model);

        const element = RectangleElement.create(10, 10, 20, 10).setInteractive(true);
        model.add(element);

        const handleMoved = jest.fn();
        const handle = new Handle(30, 20, element, controller);
        handle.handleMoved = handleMoved;

        controller.isResizing = true;
        controller.sizeHandles = [handle];
        controller.mouseDownPosition = new Point(10, 10);

        controller.onCanvasMouseMove({
            button: 0,
            clientX: 25,
            clientY: 35,
            shiftKey: true,
        });

        expect(handleMoved).toHaveBeenCalledTimes(1);
        expect(handleMoved.mock.calls[0][1]).toMatchObject({
            deltaX: 15,
            deltaY: 25,
            shiftKey: true,
        });
    });

    test('controller defaults to locked aspect ratio during handle resize', () => {
        const controller = new DesignController();
        const element = RectangleElement.create(10, 10, 20, 10);
        let capturedSize: Size | undefined;

        const handle = new Handle(30, 20, element, {
            model: undefined,
            isMoving: false,
            isResizing: false,
            isMovingPoint: false,
            isRotating: false,
            isMovingPivot: false,
            rotationStartAngle: 0,
            originalRotation: 0,
            minElementSize: new Size(4, 4),
            snapToGrid: false,
            lockAspect: controller.lockAspect,
            isSelected: () => false,
            selectedElementCount: () => 0,
            getElementMoveLocation: () => new Point(10, 10),
            getElementResizeSize: () => new Size(20, 10),
            setElementMoveLocation: () => undefined,
            setElementResizeSize: (_element, size) => {
                capturedSize = size;
            },
            clearElementMoveLocations: () => undefined,
            clearElementResizeSizes: () => undefined,
            getNearestSnapX: (x) => x,
            getNearestSnapY: (y) => y,
            invalidate: () => undefined,
        });

        Handle.sizeRectangleRightBottom(handle, new HandleMovedArgs(10, 20));

        expect(controller.lockAspect).toBe(true);
        expect(capturedSize?.width).toBe(30);
        expect(capturedSize?.height).toBe(15);
    });

    test('holding shift unlocks aspect ratio during handle resize', () => {
        const element = RectangleElement.create(10, 10, 20, 10);
        let capturedSize: Size | undefined;

        const handle = new Handle(30, 20, element, {
            model: undefined,
            isMoving: false,
            isResizing: false,
            isMovingPoint: false,
            isRotating: false,
            isMovingPivot: false,
            rotationStartAngle: 0,
            originalRotation: 0,
            minElementSize: new Size(4, 4),
            snapToGrid: false,
            lockAspect: true,
            isSelected: () => false,
            selectedElementCount: () => 0,
            getElementMoveLocation: () => new Point(10, 10),
            getElementResizeSize: () => new Size(20, 10),
            setElementMoveLocation: () => undefined,
            setElementResizeSize: (_element, size) => {
                capturedSize = size;
            },
            clearElementMoveLocations: () => undefined,
            clearElementResizeSizes: () => undefined,
            getNearestSnapX: (x) => x,
            getNearestSnapY: (y) => y,
            invalidate: () => undefined,
        });
        const args = new HandleMovedArgs(10, 20);
        args.shiftKey = true;

        Handle.sizeRectangleRightBottom(handle, args);

        expect(capturedSize?.width).toBe(30);
        expect(capturedSize?.height).toBe(30);
    });
});

describe('design controller interaction indicators', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('draw shows move indicator with position and size', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const context = createOverlayContext();
        const element = RectangleElement.create(10, 20, 30, 40).setInteractive(true);
        model.add(element);

        installDrawCanvas(controller, context);
        controller.model = model;
        controller.renderer = { renderToContext: jest.fn() } as never;
        controller.selectedElements = [element];
        controller.isMoving = true;
        controller.setElementMoveLocation(element, new Point(25, 35), new Size(30, 40));

        jest.spyOn(controller, 'renderGrid').mockImplementation(() => undefined);
        jest.spyOn(controller, 'getElementHandles').mockReturnValue([]);

        controller.draw();

        expect(context.fillText).toHaveBeenCalledWith('x 25 y 35', expect.any(Number), expect.any(Number));
        expect(context.fillText).toHaveBeenCalledWith('w 30 h 40', expect.any(Number), expect.any(Number));
    });

    test('draw shows resize indicator with updated size', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const context = createOverlayContext();
        const element = RectangleElement.create(10, 20, 30, 40).setInteractive(true);
        model.add(element);

        installDrawCanvas(controller, context);
        controller.model = model;
        controller.renderer = { renderToContext: jest.fn() } as never;
        controller.selectedElements = [element];
        controller.isResizing = true;
        controller.setElementMoveLocation(element, new Point(12, 18), new Size(45, 55));
        controller.setElementResizeSize(element, new Size(45, 55), new Point(12, 18));

        jest.spyOn(controller, 'renderGrid').mockImplementation(() => undefined);
        jest.spyOn(controller, 'getElementHandles').mockReturnValue([]);

        controller.draw();

        expect(context.fillText).toHaveBeenCalledWith('x 12 y 18', expect.any(Number), expect.any(Number));
        expect(context.fillText).toHaveBeenCalledWith('w 45 h 55', expect.any(Number), expect.any(Number));
    });

    test('draw shows point drag indicator with point coordinates', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const context = createOverlayContext();
        const pointHolder = {
            getBounds: jest.fn(() => ({
                location: new Point(0, 0),
                size: new Size(20, 20),
                x: 0,
                y: 0,
                width: 20,
                height: 20,
            })),
        } as never;

        installDrawCanvas(controller, context);
        controller.model = model;
        controller.renderer = { renderToContext: jest.fn() } as never;
        controller.selectedElements = [pointHolder];
        controller.isMovingPoint = true;
        controller.movingPointIndex = 2;
        controller.movingPointLocation = new Point(12, 34);

        jest.spyOn(controller, 'renderGrid').mockImplementation(() => undefined);
        jest.spyOn(controller, 'getElementHandles').mockReturnValue([]);

        controller.draw();

        expect(context.fillText).toHaveBeenCalledWith('pt 2', expect.any(Number), expect.any(Number));
        expect(context.fillText).toHaveBeenCalledWith('x 12 y 34', expect.any(Number), expect.any(Number));
    });
});