import { ArcTool } from '../../design/tools/arc-tool';
import { DesignController } from '../../design/design-controller';
import { ArcElement } from '../../elements/arc-element';
import { ArrowElement } from '../../elements/arrow-element';
import { EllipseElement } from '../../elements/ellipse-element';
import { Model } from '../../core/model';
import { RectangleElement } from '../../elements/rectangle-element';
import { RegularPolygonElement } from '../../elements/regular-polygon-element';
import { RingElement } from '../../elements/ring-element';
import { TextElement } from '../../elements/text-element';
import { WedgeElement } from '../../elements/wedge-element';
import { Size } from '../../core/size';
import { Point } from '../../core/point';
import { Region } from '../../core/region';
import { Handle } from '../../design/handle';
import { HandleMovedArgs } from '../../design/handle-moved-args';
import { GridType } from '../../design/grid-type';
import { RectangleTool } from '../../design/tools/rectangle-tool';
import { BitmapResource } from '../../resource/bitmap-resource';

function setWindowDevicePixelRatio(value: number) {
    const globals = globalThis as typeof globalThis & { window?: Window & typeof globalThis };
    const originalWindow = globals.window;
    const target = (globals.window || ({} as Window & typeof globalThis)) as Window & typeof globalThis;
    globals.window = target;
    const original = Object.getOwnPropertyDescriptor(target, 'devicePixelRatio');
    Object.defineProperty(target, 'devicePixelRatio', {
        configurable: true,
        value,
    });
    return () => {
        if (!originalWindow) {
            delete (globals as { window?: Window & typeof globalThis }).window;
            return;
        }
        if (original) {
            Object.defineProperty(target, 'devicePixelRatio', original);
            return;
        }
        delete (target as { devicePixelRatio?: number }).devicePixelRatio;
        globals.window = originalWindow;
    };
}

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

function readCanvasDisplaySize(canvas: { width: number; height: number; style?: { width?: string; height?: string } }) {
    const width = canvas.style?.width ? parseFloat(canvas.style.width) : canvas.width;
    const height = canvas.style?.height ? parseFloat(canvas.style.height) : canvas.height;
    return {
        width: Number.isFinite(width) && width > 0 ? width : canvas.width,
        height: Number.isFinite(height) && height > 0 ? height : canvas.height,
    };
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

    const canvas = {
        width: 100,
        height: 100,
        style: { cursor: 'default', width: '100px', height: '100px' },
        parentElement: hostElement,
        getBoundingClientRect: () => {
            const size = readCanvasDisplaySize(canvas);
            return { left: 0, top: 0, width: size.width, height: size.height };
        },
        getContext: () => context,
    } as unknown as HTMLCanvasElement;

    controller.canvas = canvas;

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
    const canvas = {
        width: 100,
        height: 100,
        style: { cursor: 'default', touchAction: 'none', width: '100px', height: '100px' },
        parentElement: { style: {} } as unknown as HTMLDivElement,
        getBoundingClientRect: () => {
            const size = readCanvasDisplaySize(canvas);
            return { left: 0, top: 0, width: size.width, height: size.height };
        },
        getContext: () => ({}) as CanvasRenderingContext2D,
    } as unknown as HTMLCanvasElement;
    controller.canvas = canvas;
    controller.draw = jest.fn();
}

function createControllerWithRectangles(...rectangles: RectangleElement[]) {
    const controller = new DesignController();
    const model = Model.create(200, 200);
    rectangles.forEach((rectangle) => model.add(rectangle.setInteractive(true)));
    installCanvasOnly(controller);
    controller.setModel(model);
    return { controller, model };
}

function installInteractiveCanvas(controller: DesignController, context?: Partial<CanvasRenderingContext2D>) {
    const canvasContext = {
        save: jest.fn(),
        restore: jest.fn(),
        setTransform: jest.fn(),
        translate: jest.fn(),
        scale: jest.fn(),
        rotate: jest.fn(),
        transform: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        quadraticCurveTo: jest.fn(),
        bezierCurveTo: jest.fn(),
        rect: jest.fn(),
        closePath: jest.fn(),
        fillText: jest.fn(),
        strokeText: jest.fn(),
        measureText: jest.fn((text: string) => ({ width: text.length * 10 })),
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        isPointInPath: jest.fn(() => false),
        ...context,
    } as unknown as CanvasRenderingContext2D;

    const canvas = {
        width: 100,
        height: 100,
        style: { cursor: 'default', touchAction: 'none', width: '100px', height: '100px' },
        parentElement: { style: {} } as unknown as HTMLDivElement,
        getBoundingClientRect: () => {
            const size = readCanvasDisplaySize(canvas);
            return { left: 0, top: 0, width: size.width, height: size.height };
        },
        getContext: () => canvasContext,
    } as unknown as HTMLCanvasElement;
    controller.canvas = canvas;
    controller.draw = jest.fn();

    return canvasContext;
}

function createOverlayContext() {
    return {
        clearRect: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        setTransform: jest.fn(),
        scale: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        transform: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
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
        measureText: jest.fn((text: string) => ({ width: text.length * 10 })),
    } as unknown as CanvasRenderingContext2D;
}

function installDrawCanvas(controller: DesignController, context: CanvasRenderingContext2D) {
    const canvas = {
        width: 100,
        height: 100,
        style: { cursor: 'default', width: '100px', height: '100px' },
        parentElement: { style: {} } as unknown as HTMLDivElement,
        getBoundingClientRect: () => {
            const size = readCanvasDisplaySize(canvas);
            return { left: 0, top: 0, width: size.width, height: size.height };
        },
        getContext: () => context,
    } as unknown as HTMLCanvasElement;
    controller.canvas = canvas;
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

    test('bringToFront and sendToBack reorder the current selection while preserving relative order', () => {
        const { controller, model } = createControllerWithRectangles(
            RectangleElement.create(0, 0, 5, 5),
            RectangleElement.create(10, 0, 5, 5),
            RectangleElement.create(20, 0, 5, 5),
            RectangleElement.create(30, 0, 5, 5)
        );

        controller.selectedElements = [model.elements[0], model.elements[2]];
        controller.bringToFront();

        expect(model.elements.map((element) => element.getBounds()?.x)).toEqual([10, 30, 0, 20]);

        controller.undo();

        expect(model.elements.map((element) => element.getBounds()?.x)).toEqual([0, 10, 20, 30]);

        controller.selectedElements = [model.elements[0], model.elements[2]];
        controller.sendToBack();

        expect(model.elements.map((element) => element.getBounds()?.x)).toEqual([0, 20, 10, 30]);
    });

    test('bringForward and sendBackward move selected elements by one z-order step', () => {
        const { controller, model } = createControllerWithRectangles(
            RectangleElement.create(0, 0, 5, 5),
            RectangleElement.create(10, 0, 5, 5),
            RectangleElement.create(20, 0, 5, 5),
            RectangleElement.create(30, 0, 5, 5)
        );

        controller.selectedElements = [model.elements[0], model.elements[2]];
        controller.bringForward();

        expect(model.elements.map((element) => element.getBounds()?.x)).toEqual([10, 0, 30, 20]);

        controller.undo();

        expect(model.elements.map((element) => element.getBounds()?.x)).toEqual([0, 10, 20, 30]);

        controller.selectedElements = [model.elements[0], model.elements[2]];
        controller.sendBackward();

        expect(model.elements.map((element) => element.getBounds()?.x)).toEqual([0, 20, 10, 30]);
    });

    test('alignment commands align selected elements and support undo', () => {
        const { controller, model } = createControllerWithRectangles(
            RectangleElement.create(10, 20, 10, 10),
            RectangleElement.create(40, 40, 20, 20),
            RectangleElement.create(30, 60, 30, 20)
        );

        controller.selectedElements = model.elements.slice();
        controller.alignSelectedHorizontally('center');

        expect(model.elements.map((element) => element.getBounds()?.x)).toEqual([30, 25, 20]);

        controller.undo();

        expect(model.elements.map((element) => element.getBounds()?.x)).toEqual([10, 40, 30]);

        controller.selectedElements = model.elements.slice();
        controller.alignSelectedVertically('bottom');

        expect(model.elements.map((element) => element.getBounds()?.y)).toEqual([70, 60, 60]);
    });

    test('distribution commands space selected elements evenly and support undo', () => {
        const { controller, model } = createControllerWithRectangles(
            RectangleElement.create(0, 0, 10, 10),
            RectangleElement.create(30, 35, 20, 20),
            RectangleElement.create(80, 90, 10, 10)
        );

        controller.selectedElements = model.elements.slice();
        controller.distributeSelectedHorizontally();

        expect(model.elements.map((element) => element.getBounds()?.x)).toEqual([0, 35, 80]);

        controller.undo();

        expect(model.elements.map((element) => element.getBounds()?.x)).toEqual([0, 30, 80]);

        controller.selectedElements = model.elements.slice();
        controller.distributeSelectedVertically();

        expect(model.elements.map((element) => element.getBounds()?.y)).toEqual([0, 40, 90]);
    });

    test('same-size resize commands use the first selected resizable element and support undo', () => {
        const { controller, model } = createControllerWithRectangles(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(50, 10, 35, 25),
            RectangleElement.create(100, 10, 45, 30)
        );

        controller.selectedElements = model.elements.slice();
        controller.resizeSelectedToSameWidth();

        expect(model.elements.map((element) => element.getBounds()?.width)).toEqual([20, 20, 20]);
        expect(model.elements.map((element) => element.getBounds()?.height)).toEqual([15, 25, 30]);

        controller.resizeSelectedToSameHeight();

        expect(model.elements.map((element) => element.getBounds()?.height)).toEqual([15, 15, 15]);

        controller.undo();

        expect(model.elements.map((element) => element.getBounds()?.height)).toEqual([15, 25, 30]);

        controller.selectedElements = model.elements.slice();
        controller.resizeSelectedToSameSize();

        expect(model.elements.map((element) => element.getBounds()?.width)).toEqual([20, 20, 20]);
        expect(model.elements.map((element) => element.getBounds()?.height)).toEqual([15, 15, 15]);
    });

    test('duplicateSelectedElements duplicates the current selection and selects the clones', () => {
        const { controller, model } = createControllerWithRectangles(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(40, 30, 25, 20)
        );

        controller.selectedElements = model.elements.slice();
        controller.duplicateSelectedElements();

        expect(model.elements).toHaveLength(4);
        expect(controller.selectedElements).toHaveLength(2);
        expect(controller.selectedElements[0]).toBe(model.elements[2]);
        expect(controller.selectedElements[1]).toBe(model.elements[3]);
    });

    test('copySelectedToClipboard and pasteFromClipboard preserve ordering and apply a paste offset', async () => {
        const { controller, model } = createControllerWithRectangles(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(40, 30, 25, 20)
        );

        controller.selectedElements = model.elements.slice();

        expect(controller.copySelectedToClipboard()).toBe(true);
        await expect(controller.pasteFromClipboard()).resolves.toBe(true);

        expect(model.elements).toHaveLength(4);
        expect(model.elements[2].getBounds()?.x).toBe(20);
        expect(model.elements[2].getBounds()?.y).toBe(20);
        expect(model.elements[3].getBounds()?.x).toBe(50);
        expect(model.elements[3].getBounds()?.y).toBe(40);
        expect(controller.selectedElements).toEqual([model.elements[2], model.elements[3]]);
        expect(model.elements[2].interactive).toBe(true);
        expect(model.elements[3].interactive).toBe(true);
        expect(controller.canUndo).toBe(true);
    });

    test('pasted elements can be reselected after clearing the current selection', async () => {
        const fakeWindowScope = installFakeWindow();
        const { controller, model } = createControllerWithRectangles(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(40, 30, 25, 20)
        );

        controller.selectedElements = model.elements.slice();
        expect(controller.copySelectedToClipboard()).toBe(true);
        await expect(controller.pasteFromClipboard()).resolves.toBe(true);

        const pasted = model.elements[2];
        installInteractiveCanvas(controller);
        jest.spyOn(model, 'firstActiveElementAt').mockReturnValue(pasted);
        jest.spyOn(model, 'elementsAt').mockReturnValue([pasted]);

        controller.clearSelections();
        controller.onCanvasMouseDown({
            button: 0,
            clientX: 25,
            clientY: 25,
            detail: 1,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as MouseEvent);

        expect(controller.selectedElements).toEqual([pasted]);

        fakeWindowScope.restore();
    });

    test('exportSelectionClipboardText and pasteClipboardData support programmatic editor integration', () => {
        const { controller, model } = createControllerWithRectangles(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(40, 30, 25, 20)
        );

        controller.selectedElements = model.elements.slice();

        const text = controller.exportSelectionClipboardText();

        expect(text).toBeDefined();
        expect(controller.pasteClipboardData(text!, 4, 6)).toBe(true);
        expect(model.elements).toHaveLength(4);
        expect(model.elements[2].getBounds()?.x).toBe(14);
        expect(model.elements[2].getBounds()?.y).toBe(16);
        expect(model.elements[3].getBounds()?.x).toBe(44);
        expect(model.elements[3].getBounds()?.y).toBe(36);
    });

    test('right click preserves selection and emits a design context menu event', () => {
        const { controller, model } = createControllerWithRectangles(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(40, 30, 25, 20)
        );

        installInteractiveCanvas(controller);
        controller.selectedElements = [model.elements[0]];

        jest.spyOn(model, 'firstActiveElementAt').mockReturnValue(model.elements[1]);

        const contextMenuRequested = jest.fn();
        const preventDefault = jest.fn();
        const stopPropagation = jest.fn();

        controller.contextMenuRequested.add(contextMenuRequested);

        controller.onCanvasMouseDown({
            button: 2,
            clientX: 45,
            clientY: 35,
            preventDefault,
            stopPropagation,
        } as unknown as MouseEvent);

        expect(controller.selectedElements).toEqual([model.elements[0]]);

        controller.onCanvasContextMenu({
            button: 2,
            clientX: 45,
            clientY: 35,
            preventDefault,
            stopPropagation,
        } as unknown as MouseEvent);

        expect(contextMenuRequested).toHaveBeenCalledTimes(1);
        expect(contextMenuRequested.mock.calls[0][1]?.element).toBe(model.elements[1]);
        expect(contextMenuRequested.mock.calls[0][1]?.selectedElements).toEqual([model.elements[0]]);
        expect(preventDefault).toHaveBeenCalled();
        expect(stopPropagation).toHaveBeenCalled();
    });

    test('removeUnusedResourcesFromResourceManager removes unused resources and supports undo', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const rectangle = RectangleElement.create(10, 10, 20, 15).setInteractive(true);
        rectangle.setFill('image(hero)');
        model.add(rectangle);
        BitmapResource.create('hero', '/hero.png').addTo(model);
        BitmapResource.create('unused', '/unused.png').addTo(model);
        installCanvasOnly(controller);
        controller.setModel(model);

        expect(controller.removeUnusedResourcesFromResourceManager()).toBe(1);
        expect(model.resources.map((resource) => resource.key)).toEqual(['hero']);

        controller.undo();

        expect(model.resources.map((resource) => resource.key)).toEqual(['hero', 'unused']);
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

    test('arc tool-created elements become undoable when creation commits', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        installCanvasOnly(controller);
        controller.setModel(model);
        const fakeWindowScope = installFakeWindow();

        controller.setActiveTool(new ArcTool());
        controller.onCanvasMouseDown({ button: 0, clientX: 8, clientY: 8 });
        controller.onCanvasMouseMove({ button: 0, clientX: 60, clientY: 40 });
        controller.onCanvasMouseUp({ button: 0, clientX: 60, clientY: 40 });

        expect(model.elements).toHaveLength(1);
        expect(model.elements[0].type).toBe('arc');
        expect(controller.canUndo).toBe(true);

        controller.undo();

        expect(model.elements).toHaveLength(0);

        fakeWindowScope.restore();
    });

    test('shift-click on a selected primitive enters edit mode', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const wedge = WedgeElement.create(10, 10, 40, 40).setInteractive(true);
        const fakeWindowScope = installFakeWindow();
        model.add(wedge);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(wedge);

        model.elementsAt = jest.fn(() => [wedge]);
        jest.spyOn(controller, 'getElementHandles').mockReturnValue([]);

        controller.onCanvasMouseDown({
            button: 0,
            clientX: 25,
            clientY: 25,
            shiftKey: true,
            ctrlKey: false,
            metaKey: false,
        });

        expect(wedge.editPoints).toBe(true);

        fakeWindowScope.restore();
    });

    test('getting handles for a selected wedge does not rewrite its frame', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const wedge = WedgeElement.create(10, 10, 40, 60).setInteractive(true);

        model.add(wedge);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(wedge);

        const initialLocation = wedge.getLocation();
        const initialSize = wedge.getSize();
        const selectionHandles = controller.getElementHandles(wedge);

        expect(selectionHandles.length).toBeGreaterThan(0);
        expect(wedge.getLocation()?.x).toBe(initialLocation?.x);
        expect(wedge.getLocation()?.y).toBe(initialLocation?.y);
        expect(wedge.getSize()?.width).toBe(initialSize?.width);
        expect(wedge.getSize()?.height).toBe(initialSize?.height);

        wedge.editPoints = true;
        const editHandles = controller.getElementHandles(wedge);

        expect(editHandles.length).toBe(3);
        expect(wedge.getLocation()?.x).toBe(initialLocation?.x);
        expect(wedge.getLocation()?.y).toBe(initialLocation?.y);
        expect(wedge.getSize()?.width).toBe(initialSize?.width);
        expect(wedge.getSize()?.height).toBe(initialSize?.height);
    });

    test('path-backed primitives expose semantic edit handles', () => {
        const controller = new DesignController();
        const model = Model.create(200, 200);
        const arc = ArcElement.create(10, 10, 60, 40).setInteractive(true);
        const polygon = RegularPolygonElement.create(20, 20, 70, 70).setInteractive(true);
        const star = RegularPolygonElement.create(30, 30, 80, 80).setInteractive(true);
        const arrow = ArrowElement.create(40, 40, 90, 50).setInteractive(true);
        const wedge = WedgeElement.create(50, 50, 100, 60).setInteractive(true);
        const ring = RingElement.create(60, 60, 110, 70).setInteractive(true);
        star.innerRadiusScale = 0.5;

        [arc, polygon, star, arrow, wedge, ring].forEach((element) => model.add(element));
        installInteractiveCanvas(controller);
        controller.setModel(model);

        arc.editPoints = true;
        expect(controller.getElementHandles(arc).map((handle) => handle.handleId)).toEqual(['arc-start', 'arc-end', 'arc-extent']);

        polygon.editPoints = true;
        expect(controller.getElementHandles(polygon).map((handle) => handle.handleId)).toEqual(['regularPolygon-outer']);

        star.editPoints = true;
        expect(controller.getElementHandles(star).map((handle) => handle.handleId)).toEqual(['regularPolygon-outer', 'regularPolygon-inner']);

        arrow.editPoints = true;
        expect(controller.getElementHandles(arrow).map((handle) => handle.handleId)).toEqual(['arrow-headLength', 'arrow-headWidth', 'arrow-shaftWidth']);

        wedge.editPoints = true;
        expect(controller.getElementHandles(wedge).map((handle) => handle.handleId)).toEqual(['wedge-start', 'wedge-end', 'wedge-extent']);

        ring.editPoints = true;
        expect(controller.getElementHandles(ring).map((handle) => handle.handleId)).toEqual(['ring-outerRadius', 'ring-innerRadius']);
    });

    test('dragging a semantic primitive handle enters point-drag mode instead of resize mode', () => {
        const controller = new DesignController();
        const model = Model.create(200, 200);
        const wedge = WedgeElement.create(20, 20, 80, 60).setInteractive(true);
        const fakeWindowScope = installFakeWindow();

        model.add(wedge);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(wedge);
        wedge.editPoints = true;

        const startHandle = controller.getElementHandles(wedge).find((handle) => handle.handleId === 'wedge-start');
        expect(startHandle).toBeDefined();
        expect(wedge.canResize()).toBe(false);

        controller.onCanvasMouseDown({
            button: 0,
            clientX: startHandle!.x,
            clientY: startHandle!.y,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
        });

        expect(controller.isMovingPoint).toBe(true);
        expect(controller.isResizing).toBe(false);
        expect(controller.movingPointIndex).toBe(startHandle!.handleIndex);

        fakeWindowScope.restore();
    });

    test('moving path-backed primitives preserves their semantic size', () => {
        const primitives = [
            ArcElement.create(10, 10, 60, 40),
            RegularPolygonElement.create(12, 12, 62, 42),
            ArrowElement.create(14, 14, 64, 44),
            WedgeElement.create(16, 16, 66, 46),
            RingElement.create(18, 18, 68, 48),
        ];
        const fakeWindowScope = installFakeWindow();

        primitives.forEach((primitive) => {
            const controller = new DesignController();
            const model = Model.create(200, 200);
            const element = primitive.setInteractive(true);
            const initialLocation = element.getLocation();
            const initialSize = element.getSize();

            model.add(element);
            installInteractiveCanvas(controller);
            controller.setModel(model);
            controller.selectElement(element);

            model.elementsAt = jest.fn(() => [element]);

            controller.onCanvasMouseDown({
                button: 0,
                clientX: 30,
                clientY: 30,
                shiftKey: false,
                ctrlKey: false,
                metaKey: false,
            });
            controller.onCanvasMouseMove({
                button: 0,
                clientX: 51,
                clientY: 56,
                shiftKey: false,
                ctrlKey: false,
                metaKey: false,
            });
            controller.onCanvasMouseMove({
                button: 0,
                clientX: 50,
                clientY: 55,
                shiftKey: false,
                ctrlKey: false,
                metaKey: false,
            });
            controller.onCanvasMouseUp({
                button: 0,
                clientX: 50,
                clientY: 55,
                shiftKey: false,
                ctrlKey: false,
                metaKey: false,
            });

            expect(element.getLocation()?.x).not.toBe(initialLocation!.x);
            expect(element.getLocation()?.y).not.toBe(initialLocation!.y);
            expect(element.getSize()?.width).toBe(initialSize!.width);
            expect(element.getSize()?.height).toBe(initialSize!.height);
        });

        fakeWindowScope.restore();
    });

    test('moving wedge keeps drag handles and indicator aligned with resting bounds', () => {
        const controller = new DesignController();
        const model = Model.create(200, 200);
        const wedge = WedgeElement.create(20, 30, 80, 60).setInteractive(true);

        model.add(wedge);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(wedge);

        const initialBounds = wedge.getBounds();
        const initialHandles = controller.getElementHandles(wedge);

        expect(initialBounds).toBeDefined();

        controller.setElementMoveLocation(wedge, new Point(45, 55), wedge.getSize()!);
        controller.isMoving = true;

        const movedHandles = controller.getElementHandles(wedge);
        const movedIndicator = controller.getInteractionIndicatorBounds();
        const deltaX = 45 - wedge.getLocation()!.x;
        const deltaY = 55 - wedge.getLocation()!.y;
        const initialRotateTopLeft = initialHandles.find((handle) => handle.handleId === 'rotate-topLeft');
        const movedRotateTopLeft = movedHandles.find((handle) => handle.handleId === 'rotate-topLeft');
        const initialPivot = initialHandles.find((handle) => handle.handleId === 'pivot');
        const movedPivot = movedHandles.find((handle) => handle.handleId === 'pivot');

        expect(movedHandles[0].x).toBeCloseTo(initialHandles[0].x + deltaX);
        expect(movedHandles[0].y).toBeCloseTo(initialHandles[0].y + deltaY);
        expect(initialRotateTopLeft).toBeDefined();
        expect(movedRotateTopLeft).toBeDefined();
        expect(initialPivot).toBeDefined();
        expect(movedPivot).toBeDefined();
        expect(movedRotateTopLeft!.x).toBeCloseTo(initialRotateTopLeft!.x + deltaX);
        expect(movedRotateTopLeft!.y).toBeCloseTo(initialRotateTopLeft!.y + deltaY);
        expect(movedPivot!.x).toBeCloseTo(initialPivot!.x + deltaX);
        expect(movedPivot!.y).toBeCloseTo(initialPivot!.y + deltaY);
        expect(movedIndicator?.x).toBeCloseTo(initialBounds!.x + deltaX);
        expect(movedIndicator?.y).toBeCloseTo(initialBounds!.y + deltaY);
        expect(movedIndicator?.width).toBeCloseTo(initialBounds!.width);
        expect(movedIndicator?.height).toBeCloseTo(initialBounds!.height);
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

    test('keyboard shortcuts route to clipboard commands', () => {
        const controller = new DesignController();
        const copySpy = jest.spyOn(controller, 'copySelectedToClipboard').mockReturnValue(true);
        const cutSpy = jest.spyOn(controller, 'cutSelectedToClipboard').mockReturnValue(true);
        const pasteSpy = jest.spyOn(controller, 'pasteFromClipboard').mockResolvedValue(true);

        const ctrlC = {
            keyCode: 67,
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;
        const ctrlX = {
            keyCode: 88,
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;
        const ctrlV = {
            keyCode: 86,
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;

        expect(controller.onCanvasKeyDown(ctrlC)).toBe(true);
        expect(controller.onCanvasKeyDown(ctrlX)).toBe(true);
        expect(controller.onCanvasKeyDown(ctrlV)).toBe(true);
        expect(copySpy).toHaveBeenCalledTimes(1);
        expect(cutSpy).toHaveBeenCalledTimes(1);
        expect(pasteSpy).toHaveBeenCalledTimes(1);
    });

    test('design controller draw scales backing store for device pixel ratio', () => {
        const restoreDevicePixelRatio = setWindowDevicePixelRatio(2);
        const controller = new DesignController();
        const model = Model.create(100, 50);
        const context = createOverlayContext();

        installDrawCanvas(controller, context);
        controller.model = model;
        controller.renderer = {
            renderToContext: jest.fn(),
        } as unknown as any;

        controller.draw();

        expect(controller.canvas?.width).toBe(200);
        expect(controller.canvas?.height).toBe(100);
        expect(context.scale).toHaveBeenNthCalledWith(1, 2, 2);

        restoreDevicePixelRatio();
    });

    test('typing into a selected text element enters text edit mode and supports inline formatting', () => {
        const controller = new DesignController();
        const model = Model.create(200, 100);
        const text = TextElement.create('Hello', 10, 10, 120, 30).setInteractive(true) as TextElement;
        model.add(text);
        installCanvasOnly(controller);
        controller.setModel(model);
        controller.selectElement(text);

        const typeEvent = {
            key: '!',
            keyCode: 49,
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            shiftKey: true,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;

        expect(controller.onCanvasKeyDown(typeEvent)).toBe(true);
        expect(text.getResolvedText()).toBe('Hello!');
        expect(controller.editingTextElement).toBe(text);

        controller.textSelectionStart = 0;
        controller.textSelectionEnd = 5;
        const boldEvent = {
            key: 'b',
            keyCode: 66,
            ctrlKey: true,
            metaKey: false,
            altKey: false,
            shiftKey: false,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;

        expect(controller.onCanvasKeyDown(boldEvent)).toBe(true);
        expect(text.richText).toEqual([
            { text: 'Hello', typestyle: 'bold' },
            { text: '!' },
        ]);
    });

    test('text editing keyboard interactions redraw immediately', () => {
        const controller = new DesignController();
        const model = Model.create(200, 100);
        const text = TextElement.create('Hello', 10, 10, 120, 30).setInteractive(true) as TextElement;
        model.add(text);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(text);
        controller.beginTextEdit(text, 5);
        (controller.draw as jest.Mock).mockClear();

        const arrowLeft = {
            key: 'ArrowLeft',
            keyCode: 37,
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            shiftKey: false,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;
        const typeEvent = {
            key: '!',
            keyCode: 49,
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            shiftKey: true,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;

        expect(controller.onCanvasKeyDown(arrowLeft)).toBe(true);
        expect(controller.draw).toHaveBeenCalledTimes(1);

        expect(controller.onCanvasKeyDown(typeEvent)).toBe(true);
        expect(controller.draw).toHaveBeenCalledTimes(2);
    });

    test('arrow keys nudge a selected text element when not in text edit mode', () => {
        const controller = new DesignController();
        const model = Model.create(200, 100);
        const text = TextElement.create('Hello', 10, 10, 120, 30).setInteractive(true) as TextElement;
        model.add(text);
        installCanvasOnly(controller);
        controller.setModel(model);
        controller.selectElement(text);

        const arrowRight = {
            key: 'ArrowRight',
            keyCode: 39,
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            shiftKey: false,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;

        expect(controller.onCanvasKeyDown(arrowRight)).toBe(true);
        expect(text.getLocation()!.x).toBe(11);
        expect(text.getLocation()!.y).toBe(10);
        expect(controller.editingTextElement).toBeUndefined();
    });

    test('arrow up and down move the caret between visual text lines', () => {
        const controller = new DesignController();
        const model = Model.create(200, 100);
        const text = TextElement.create('ab\ncd', 10, 10, 120, 40).setInteractive(true) as TextElement;
        model.add(text);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(text);
        controller.beginTextEdit(text, 1);

        const arrowDown = {
            key: 'ArrowDown',
            keyCode: 40,
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            shiftKey: false,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;
        const arrowUp = {
            key: 'ArrowUp',
            keyCode: 38,
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            shiftKey: false,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;

        expect(controller.onCanvasKeyDown(arrowDown)).toBe(true);
        expect(controller.textSelectionStart).toBe(4);
        expect(controller.textSelectionEnd).toBe(4);

        expect(controller.onCanvasKeyDown(arrowUp)).toBe(true);
        expect(controller.textSelectionStart).toBe(1);
        expect(controller.textSelectionEnd).toBe(1);
    });

    test('single click on a selected text element does not enter edit mode', () => {
        const controller = new DesignController();
        const model = Model.create(200, 100);
        const text = TextElement.create('Hello world', 10, 10, 140, 30).setInteractive(true) as TextElement;
        const fakeWindowScope = installFakeWindow();
        model.add(text);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(text);

        controller.onCanvasMouseDown({
            button: 0,
            clientX: 75,
            clientY: 20,
            detail: 1,
            shiftKey: false,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as MouseEvent);

        expect(controller.editingTextElement).toBeUndefined();

        fakeWindowScope.restore();
    });

    test('shift-double-clicking a selected text element enters edit mode and selects the clicked word', () => {
        const controller = new DesignController();
        const model = Model.create(200, 100);
        const text = TextElement.create('Hello world', 10, 10, 140, 30).setInteractive(true) as TextElement;
        const fakeWindowScope = installFakeWindow();
        model.add(text);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(text);

        controller.onCanvasMouseDown({
            button: 0,
            clientX: 75,
            clientY: 20,
            detail: 2,
            shiftKey: true,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as MouseEvent);

        expect(controller.editingTextElement).toBe(text);
        expect(controller.textSelectionStart).toBe(6);
        expect(controller.textSelectionEnd).toBe(11);
        expect(controller.isSelectingText).toBe(false);
        expect(controller.draw).toHaveBeenCalled();

        fakeWindowScope.restore();
    });

    test('shift-click enters text edit mode for transformed text using transformed coordinates', () => {
        const controller = new DesignController();
        const model = Model.create(400, 120);
        const text = TextElement.create('Hello', 10, 10, 120, 30).setInteractive(true).setTransform('translate(150,0)') as TextElement;
        const fakeWindowScope = installFakeWindow();
        model.add(text);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(text);

        controller.onCanvasMouseDown({
            button: 0,
            clientX: 165,
            clientY: 20,
            detail: 1,
            shiftKey: true,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as MouseEvent);

        expect(controller.editingTextElement).toBe(text);

        fakeWindowScope.restore();
    });

    test('text editing overlay applies the text transform', () => {
        const controller = new DesignController();
        const model = Model.create(200, 100);
        const text = TextElement.create('Hello', 10, 10, 120, 30).setInteractive(true).setTransform('rotate(15)') as TextElement;
        const context = createOverlayContext();
        installDrawCanvas(controller, context);
        controller.setModel(model);
        model.add(text);
        controller.selectElement(text);
        controller.beginTextEdit(text, 1);
        controller.renderer = { renderToContext: jest.fn() } as unknown as any;
        jest.spyOn(controller, 'getElementHandles').mockReturnValue([]);
        const transformSpy = jest.spyOn(model, 'setRenderTransform');

        controller.draw();

        expect(transformSpy).toHaveBeenCalledWith(context, 'rotate(15)', expect.any(Point));
    });

    test('setSelectedRectangleCornerRadius updates selected rectangles and supports undo', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const rectangleA = RectangleElement.create(10, 10, 20, 15).setInteractive(true);
        const rectangleB = RectangleElement.create(40, 30, 25, 20).setInteractive(true);
        model.add(rectangleA);
        model.add(rectangleB);
        installCanvasOnly(controller);
        controller.setModel(model);
        controller.selectedElements = [rectangleA, rectangleB];

        controller.setSelectedRectangleCornerRadius(9);

        expect(rectangleA.cornerRadii).toEqual([9, 9, 9, 9]);
        expect(rectangleB.cornerRadii).toEqual([9, 9, 9, 9]);
        expect(controller.canUndo).toBe(true);

        controller.undo();

        expect((model.elements[0] as RectangleElement).cornerRadii).toBeUndefined();
        expect((model.elements[1] as RectangleElement).cornerRadii).toBeUndefined();

        controller.redo();

        expect((model.elements[0] as RectangleElement).cornerRadii).toEqual([9, 9, 9, 9]);
        expect((model.elements[1] as RectangleElement).cornerRadii).toEqual([9, 9, 9, 9]);
    });

    test('setSelectedRectangleCornerRadii ignores non-rectangle selections', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const rectangle = RectangleElement.create(10, 10, 20, 15).setInteractive(true);
        const ellipse = EllipseElement.create(60, 40, 10, 8).setInteractive(true);
        model.add(rectangle);
        model.add(ellipse);
        installCanvasOnly(controller);
        controller.setModel(model);
        controller.selectedElements = [rectangle, ellipse];

        controller.setSelectedRectangleCornerRadii(8, 6, 4, 2);

        expect(rectangle.cornerRadii).toEqual([8, 6, 4, 2]);
        expect('cornerRadii' in ellipse).toBe(false);
    });

    test('shift-click on a selected rectangle enters corner radius edit mode', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const rectangle = RectangleElement.create(10, 10, 20, 15).setInteractive(true);
        const fakeWindowScope = installFakeWindow();
        model.add(rectangle);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(rectangle);

        model.elementsAt = jest.fn(() => [rectangle]);
        jest.spyOn(controller, 'getElementHandles').mockReturnValue([]);

        controller.onCanvasMouseDown({
            button: 0,
            clientX: 15,
            clientY: 15,
            shiftKey: true,
            ctrlKey: false,
            metaKey: false,
        });

        expect(rectangle.editPoints).toBe(true);

        fakeWindowScope.restore();
    });

    test('clicking a selected rectangle exits corner radius edit mode', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const rectangle = RectangleElement.create(10, 10, 20, 15).setInteractive(true);
        const fakeWindowScope = installFakeWindow();
        rectangle.editPoints = true;
        model.add(rectangle);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(rectangle);

        model.elementsAt = jest.fn(() => [rectangle]);
        jest.spyOn(controller, 'getElementHandles').mockReturnValue([]);

        controller.onCanvasMouseDown({
            button: 0,
            clientX: 15,
            clientY: 15,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
        });

        expect(rectangle.editPoints).toBe(false);

        fakeWindowScope.restore();
    });

    test('dragging a rectangle radius handle without shift applies a uniform radius and supports undo', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const rectangle = RectangleElement.create(10, 10, 30, 20).setInteractive(true).setCornerRadius(4);
        const fakeWindowScope = installFakeWindow();
        model.add(rectangle);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(rectangle);
        rectangle.editPoints = true;
        controller.onSelectionChanged();

        const handle = new Handle(14, 14, rectangle, controller);
        handle.scale = 1;
        handle.handleId = 'cornerRadius-topLeft';
        handle.handleIndex = 0;
        handle.handleMoved = Handle.moveRectangleCornerRadius;
        handle.dragValue = [4, 4, 4, 4];
        handle.region = new Region(11, 11, 6, 6);
        jest.spyOn(controller, 'getElementHandles').mockReturnValue([handle]);

        controller.onCanvasMouseDown({ button: 0, clientX: 14, clientY: 14, shiftKey: false, ctrlKey: false, metaKey: false });
        controller.onCanvasMouseMove({ button: 0, clientX: 20, clientY: 20, shiftKey: false, ctrlKey: false, metaKey: false });

        expect(rectangle.cornerRadii).toEqual([10, 10, 10, 10]);

        controller.onCanvasMouseUp({ button: 0, clientX: 20, clientY: 20, shiftKey: false, ctrlKey: false, metaKey: false });

        expect(controller.canUndo).toBe(true);

        controller.undo();

        expect((model.elements[0] as RectangleElement).cornerRadii).toEqual([4, 4, 4, 4]);

        fakeWindowScope.restore();
    });

    test('dragging a rectangle radius handle can process repeated mouse moves without losing bounds', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const rectangle = RectangleElement.create(10, 10, 30, 20).setInteractive(true).setCornerRadius(4);
        const fakeWindowScope = installFakeWindow();
        model.add(rectangle);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectElement(rectangle);
        rectangle.editPoints = true;
        controller.onSelectionChanged();

        const handle = new Handle(14, 14, rectangle, controller);
        handle.scale = 1;
        handle.handleId = 'cornerRadius-topLeft';
        handle.handleIndex = 0;
        handle.handleMoved = Handle.moveRectangleCornerRadius;
        handle.dragValue = [4, 4, 4, 4];
        handle.region = new Region(11, 11, 6, 6);
        jest.spyOn(controller, 'getElementHandles').mockReturnValue([handle]);

        controller.onCanvasMouseDown({ button: 0, clientX: 14, clientY: 14, shiftKey: false, ctrlKey: false, metaKey: false });

        expect(() => {
            controller.onCanvasMouseMove({ button: 0, clientX: 20, clientY: 20, shiftKey: false, ctrlKey: false, metaKey: false });
            controller.onCanvasMouseMove({ button: 0, clientX: 22, clientY: 22, shiftKey: false, ctrlKey: false, metaKey: false });
        }).not.toThrow();

        expect(rectangle.getSize()?.width).toBe(30);
        expect(rectangle.getSize()?.height).toBe(20);
        expect(rectangle.getLocation()?.x).toBe(10);
        expect(rectangle.getLocation()?.y).toBe(10);
        expect(rectangle.cornerRadii).toEqual([10, 10, 10, 10]);

        fakeWindowScope.restore();
    });

    test('dragging a rectangle radius handle with shift updates only the dragged corner', () => {
        const rectangle = RectangleElement.create(10, 10, 40, 30).setCornerRadii(4, 8, 12, 16);
        const handle = new Handle(42, 18, rectangle, {
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
            selectedElementCount: () => 1,
            getElementMoveLocation: () => new Point(10, 10),
            getElementResizeSize: () => new Size(40, 30),
            setElementMoveLocation: () => undefined,
            setElementResizeSize: () => undefined,
            clearElementMoveLocations: () => undefined,
            clearElementResizeSizes: () => undefined,
            getNearestSnapX: (x) => x,
            getNearestSnapY: (y) => y,
            invalidate: () => undefined,
        });
        handle.handleId = 'cornerRadius-topRight';
        handle.handleIndex = 1;
        handle.dragValue = [4, 8, 12, 16];

        const args = new HandleMovedArgs(-5, 3);
        args.shiftKey = true;

        Handle.moveRectangleCornerRadius(handle, args);

        expect(rectangle.cornerRadii).toEqual([4, 11, 12, 16]);
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

    test('draw renders contrast-friendly line grid at the configured spacing', () => {
        const controller = new DesignController();
        const model = Model.create(20, 20);
        const context = createOverlayContext();
        const strokeStyles: string[] = [];
        let currentStrokeStyle = '';

        Object.defineProperty(context, 'strokeStyle', {
            configurable: true,
            get: () => currentStrokeStyle,
            set: (value: string) => {
                currentStrokeStyle = value;
                strokeStyles.push(value);
            },
        });

        installDrawCanvas(controller, context);
        controller.model = model;
        controller.renderer = { renderToContext: jest.fn() } as never;
        controller.gridType = GridType.Lines;
        controller.gridSpacing = 10;
        controller.gridColor = 'Red';

        jest.spyOn(controller, 'getElementHandles').mockReturnValue([]);

        controller.draw();

        expect(strokeStyles).toContain('rgb(255,255,255)');
        expect(strokeStyles).toContain('rgb(255,0,0)');
        expect(context.stroke).toHaveBeenCalledTimes(2);
        expect(context.moveTo).toHaveBeenCalledWith(10, 0);
        expect(context.lineTo).toHaveBeenCalledWith(10, 20);
        expect(context.moveTo).toHaveBeenCalledWith(0, 10);
        expect(context.lineTo).toHaveBeenCalledWith(20, 10);
    });

    test('draw renders white-backed black dots for dot grid visibility', () => {
        const controller = new DesignController();
        const model = Model.create(20, 20);
        const context = createOverlayContext();
        const fillStyles: string[] = [];
        let currentFillStyle = '';

        Object.defineProperty(context, 'fillStyle', {
            configurable: true,
            get: () => currentFillStyle,
            set: (value: string) => {
                currentFillStyle = value;
                fillStyles.push(value);
            },
        });

        installDrawCanvas(controller, context);
        controller.model = model;
        controller.renderer = { renderToContext: jest.fn() } as never;
        controller.gridType = GridType.Dots;
        controller.gridSpacing = 10;

        jest.spyOn(controller, 'getElementHandles').mockReturnValue([]);

        controller.draw();

        expect(fillStyles).toContain('rgb(255,255,255)');
        expect(fillStyles).toContain('rgb(0,0,0)');
        expect(context.arc).toHaveBeenCalledWith(10, 10, expect.any(Number), 0, Math.PI * 2);
        expect(context.fill).toHaveBeenCalled();
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

    test('draw uses translated rendered bounds for move guide lines on a wedge', () => {
        const controller = new DesignController();
        const model = Model.create(200, 200);
        const context = createOverlayContext();
        const wedge = WedgeElement.create(20, 30, 80, 60).setInteractive(true);
        const initialBounds = wedge.getBounds()!;
        const deltaX = 25;
        const deltaY = 18;

        model.add(wedge);
        installDrawCanvas(controller, context);
        controller.model = model;
        controller.renderer = { renderToContext: jest.fn() } as never;
        controller.selectedElements = [wedge];
        controller.isMoving = true;
        controller.setElementMoveLocation(wedge, new Point(wedge.getLocation()!.x + deltaX, wedge.getLocation()!.y + deltaY), wedge.getSize()!);

        jest.spyOn(controller, 'renderGrid').mockImplementation(() => undefined);
        jest.spyOn(controller, 'getElementHandles').mockReturnValue([]);
        const horizontalSpy = jest.spyOn(controller, 'drawHorizontalLine');
        const verticalSpy = jest.spyOn(controller, 'drawVerticalLine');
        const dashedHorizontalSpy = jest.spyOn(controller, 'drawDashedHorizontalLine');
        const dashedVerticalSpy = jest.spyOn(controller, 'drawDashedVerticalLine');

        controller.draw();

        expect(horizontalSpy).toHaveBeenCalledWith(context, initialBounds.y + deltaY);
        expect(horizontalSpy).toHaveBeenCalledWith(context, initialBounds.y + deltaY + initialBounds.height);
        expect(verticalSpy).toHaveBeenCalledWith(context, initialBounds.x + deltaX);
        expect(verticalSpy).toHaveBeenCalledWith(context, initialBounds.x + deltaX + initialBounds.width);
        expect(dashedHorizontalSpy).toHaveBeenCalledWith(context, initialBounds.y + deltaY);
        expect(dashedHorizontalSpy).toHaveBeenCalledWith(context, initialBounds.y + deltaY + initialBounds.height);
        expect(dashedVerticalSpy).toHaveBeenCalledWith(context, initialBounds.x + deltaX);
        expect(dashedVerticalSpy).toHaveBeenCalledWith(context, initialBounds.x + deltaX + initialBounds.width);
    });

    test('move preview snaps multi-selection to nearby element bounds and draws smart alignment guides', () => {
        const controller = new DesignController();
        const model = Model.create(200, 200);
        const first = RectangleElement.create(10, 10, 10, 10).setInteractive(true);
        const second = RectangleElement.create(25, 15, 10, 10).setInteractive(true);
        const target = RectangleElement.create(50, 40, 20, 20).setInteractive(true);

        model.add(first);
        model.add(second);
        model.add(target);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectedElements = [first, second];
        controller.isMoving = true;
        controller.smartAlignmentThreshold = 12;
        const movableEntries = (controller as any).getSelectedMovableEntries() as Array<{ element: RectangleElement; bounds: Region }>;
        const smartAligned = (controller as any).getSmartAlignmentDelta(movableEntries, 44, 35) as {
            deltaX: number;
            deltaY: number;
            guides: { vertical: number[]; horizontal: number[] };
        };

        expect(smartAligned.guides.vertical).toHaveLength(1);
        expect(smartAligned.guides.horizontal).toHaveLength(1);
        expect(smartAligned.deltaX).not.toBe(44);

        for (const entry of movableEntries) {
            controller.setElementMoveLocation(
                entry.element,
                new Point(entry.bounds.x + smartAligned.deltaX, entry.bounds.y + smartAligned.deltaY),
                entry.element.getSize()!,
            );
        }
        (controller as any).smartAlignmentGuides = smartAligned.guides;

        expect(controller.getElementMoveLocation(first)).toMatchObject({
            x: movableEntries[0].bounds.x + smartAligned.deltaX,
            y: movableEntries[0].bounds.y + smartAligned.deltaY,
        });
        expect(controller.getElementMoveLocation(second)).toMatchObject({
            x: movableEntries[1].bounds.x + smartAligned.deltaX,
            y: movableEntries[1].bounds.y + smartAligned.deltaY,
        });

        const context = createOverlayContext();
        installDrawCanvas(controller, context);
        controller.draw = DesignController.prototype.draw.bind(controller);
        controller.renderer = { renderToContext: jest.fn() } as never;

        jest.spyOn(controller, 'renderGrid').mockImplementation(() => undefined);
        jest.spyOn(controller, 'getElementHandles').mockReturnValue([]);
        controller.invalidate();
        controller.draw();

        expect(context.moveTo).toHaveBeenCalledWith(smartAligned.guides.vertical[0], 0);
        expect(context.lineTo).toHaveBeenCalledWith(smartAligned.guides.vertical[0], 200);
        expect(context.moveTo).toHaveBeenCalledWith(0, smartAligned.guides.horizontal[0]);
        expect(context.lineTo).toHaveBeenCalledWith(200, smartAligned.guides.horizontal[0]);
    });

    test('dragging a selected element snaps move preview to the grid', () => {
        const controller = new DesignController();
        const model = Model.create(200, 200);
        const element = RectangleElement.create(13, 17, 20, 15).setInteractive(true);

        model.add(element);
        installInteractiveCanvas(controller);
        controller.setModel(model);
        controller.selectedElements = [element];
        controller.snapToGrid = true;
        controller.gridSpacing = 10;
        controller.isMoving = true;
        controller.isMouseDown = true;
        controller.mouseDownPosition = new Point(13, 17);

        controller.onCanvasMouseMove({ button: 0, clientX: 21, clientY: 23, shiftKey: false, ctrlKey: false, metaKey: false });

        expect(controller.getElementMoveLocation(element)).toMatchObject({ x: 20, y: 20 });
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

    test('draw shows corner radius indicator while editing rectangle corners', () => {
        const controller = new DesignController();
        const model = Model.create(100, 100);
        const context = createOverlayContext();
        const rectangle = RectangleElement.create(10, 20, 30, 20).setCornerRadius(9).setInteractive(true);
        const handle = new Handle(19, 29, rectangle, controller);
        handle.handleId = 'cornerRadius-topLeft';
        handle.handleIndex = 0;

        installDrawCanvas(controller, context);
        controller.model = model;
        controller.renderer = { renderToContext: jest.fn() } as never;
        controller.selectedElements = [rectangle];
        controller.isMovingCornerRadius = true;
        controller.sizeHandles = [handle];

        jest.spyOn(controller, 'renderGrid').mockImplementation(() => undefined);
        jest.spyOn(controller, 'getElementHandles').mockReturnValue([]);

        controller.draw();

        expect(context.fillText).toHaveBeenCalledWith('corner top-left', expect.any(Number), expect.any(Number));
        expect(context.fillText).toHaveBeenCalledWith('radius 9', expect.any(Number), expect.any(Number));
    });
});