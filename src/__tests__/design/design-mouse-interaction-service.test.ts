import { ControllerEvent } from '../../controller/controller-event';
import { Model } from '../../core/model';
import { Point } from '../../core/point';
import { Region } from '../../core/region';
import { Size } from '../../core/size';
import { RectangleElement } from '../../elements/rectangle-element';
import { TextElement } from '../../elements/text-element';
import { DesignMouseInteractionService, type DesignMouseInteractionHost } from '../../design/design-mouse-interaction-service';
import { Handle } from '../../design/handle';

function createHost(overrides: Partial<DesignMouseInteractionHost> = {}) {
    const model = Model.create(200, 200);
    const element = RectangleElement.create(10, 10, 20, 10).setInteractive(true);
    model.add(element);

    const host: DesignMouseInteractionHost = {
        controller: {} as never,
        enabled: true,
        model,
        canvas: {
            style: { cursor: 'crosshair' },
            getContext: () => ({
                save: jest.fn(),
                restore: jest.fn(),
                beginPath: jest.fn(),
                rect: jest.fn(),
                closePath: jest.fn(),
                isPointInPath: jest.fn(() => false),
            }),
        } as unknown as HTMLCanvasElement,
        activeTool: undefined,
        mouseDownPosition: new Point(10, 10),
        textCaretPreferredX: undefined,
        currentX: undefined,
        currentY: undefined,
        currentWidth: undefined,
        currentHeight: undefined,
        lastClientX: -1,
        lastClientY: -1,
        lastDeltaX: 0,
        lastDeltaY: 0,
        isMouseDown: false,
        isMoving: false,
        isResizing: false,
        isRotating: false,
        isMovingPivot: false,
        isMovingPoint: false,
        isMovingCornerRadius: false,
        isSelectingText: false,
        selecting: false,
        selectionEnabled: true,
        snapToGrid: false,
        cancelAction: false,
        movingPointIndex: undefined,
        movingPointLocation: undefined,
        rubberBandActive: false,
        rubberBandRegion: undefined,
        sizeHandles: undefined,
        selectedElements: [element],
        editingTextElement: undefined,
        textSelectionAnchor: 0,
        textSelectionStart: 0,
        textSelectionEnd: 0,
        pressedElement: undefined,
        mouseOverElement: undefined,
        rotationCenter: undefined,
        originalPivotCenter: undefined,
        originalTransform: undefined,
        rotationStartAngle: 0,
        originalRotation: 0,
        minElementSize: new Size(4, 4),
        mouseDownView: new ControllerEvent<any>(),
        smartAlignmentGuides: { vertical: [], horizontal: [] },
        mouseMovedView: new ControllerEvent<any>(),
        mouseUpView: new ControllerEvent<any>(),
        mouseUpElement: new ControllerEvent<any>(),
        elementClicked: new ControllerEvent<any>(),
        elementCreated: new ControllerEvent<any>(),
        captureMouse: jest.fn(),
        windowToCanvas: (x: number, y: number) => new Point(x, y),
        resolveTextEditInteractionPoint: () => undefined,
        beginTextEdit: jest.fn(() => true),
        getSelectedTextElement: () => undefined,
        selectedElementCount: () => 1,
        movableSelectedElementCount: () => 1,
        resizeableSelectedElementCount: () => 1,
        getElementHandles: () => [],
        getSelectedMovableEntries: () => [],
        constrainMoveDeltaToBounds: (_entries, dx, dy) => new Point(dx, dy),
        snapMoveDeltaToGrid: (_entries, dx, dy) => new Point(dx, dy),
        getSmartAlignmentDelta: (_entries, dx, dy) => ({ deltaX: dx, deltaY: dy, guides: { vertical: [], horizontal: [] } }),
        getElementMoveLocation: () => element.getLocation()!,
        setElementMoveLocation: jest.fn(),
        getElementResizeSize: () => element.getSize()!,
        setElementResizeSize: jest.fn(),
        clearElementMoveLocations: jest.fn(),
        clearElementResizeSizes: jest.fn(),
        onElementMoved: jest.fn(),
        onElementSized: jest.fn(),
        onElementRotating: jest.fn(),
        onElementRotated: jest.fn(),
        setIsDirty: jest.fn(),
        beginToolHistorySession: jest.fn(),
        commitUndoSnapshot: jest.fn(),
        finalizeToolHistorySession: jest.fn(),
        draw: jest.fn(),
        drawIfNeeded: jest.fn(),
        invalidate: jest.fn(),
        setMouseDownElement: jest.fn(),
        setMouseOverElement: jest.fn((next?: typeof element) => {
            host.mouseOverElement = next;
        }),
        isSelected: (candidate) => host.selectedElements.indexOf(candidate) !== -1,
        onSelectionChanged: jest.fn(),
        clearSelections: jest.fn(() => {
            host.selectedElements = [];
        }),
        selectElement: jest.fn((selected) => {
            if (host.selectedElements.indexOf(selected) === -1) {
                host.selectedElements.push(selected);
            }
        }),
        toggleSelected: jest.fn((selected) => {
            const index = host.selectedElements.indexOf(selected);
            if (index === -1) {
                host.selectedElements.push(selected);
            }
            else {
                host.selectedElements.splice(index, 1);
            }
        }),
        getNearestSnapX: (x: number) => x,
        getNearestSnapY: (y: number) => y,
        getHandleCornerRadii: () => undefined,
        areCornerRadiiEqual: (left, right) => JSON.stringify(left) === JSON.stringify(right),
        ...overrides,
    };

    return { host, element, model };
}

describe('DesignMouseInteractionService', () => {
    test('onCanvasMouseDown enters text edit mode for a selected text element and selects the clicked word', () => {
        const service = new DesignMouseInteractionService();
        const text = {
            getBounds: () => new Region(10, 10, 140, 30),
            getTextIndexAtPoint: () => 6,
            getWordRangeAt: () => [6, 11],
        } as unknown as TextElement;
        const { host } = createHost({
            selectedElements: [text as never],
            getSelectedTextElement: () => text,
            resolveTextEditInteractionPoint: () => new Point(40, 15),
        });

        service.onCanvasMouseDown(host, {
            button: 0,
            clientX: 40,
            clientY: 15,
            shiftKey: true,
            detail: 2,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as MouseEvent);

        expect(host.beginTextEdit).toHaveBeenCalledWith(text, 6);
        expect(host.textSelectionAnchor).toBe(6);
        expect(host.textSelectionStart).toBe(6);
        expect(host.textSelectionEnd).toBe(11);
        expect(host.isSelectingText).toBe(false);
    });

    test('onCanvasMouseDown starts point dragging when a point handle is hit', () => {
        const service = new DesignMouseInteractionService();
        const pointElement = {
            transform: undefined,
            canResize: () => false,
            canMove: () => false,
            canMovePoint: () => true,
            getPointAt: () => new Point(22, 18),
            getBounds: () => new Region(10, 10, 20, 20),
        } as unknown as RectangleElement;
        const handle = {
            handleId: 'point-0',
            handleIndex: 3,
            element: pointElement,
            region: new Region(14, 14, 8, 8),
            barRegion: undefined,
            cursor: 'move',
        } as unknown as Handle;
        const { host } = createHost({
            selectedElements: [pointElement as never],
            getElementHandles: () => [handle],
            resizeableSelectedElementCount: () => 0,
            selectedElementCount: () => 1,
        });

        service.onCanvasMouseDown(host, {
            button: 0,
            clientX: 15,
            clientY: 15,
            shiftKey: false,
        });

        expect(host.isMovingPoint).toBe(true);
        expect(host.isResizing).toBe(false);
        expect(host.movingPointIndex).toBe(3);
        expect(host.movingPointLocation).toMatchObject({ x: 22, y: 18 });
    });

    test('onCanvasMouseDown clears edit points when clicking an already selected editable element', () => {
        const service = new DesignMouseInteractionService();
        const rectangle = RectangleElement.create(10, 10, 20, 15).setInteractive(true);
        rectangle.editPoints = true;
        const { host, model } = createHost({
            selectedElements: [rectangle],
            isSelected: (candidate) => candidate === rectangle,
        });
        model.elements.splice(0, model.elements.length, rectangle);
        jest.spyOn(model, 'elementsAt').mockReturnValue([rectangle]);
        jest.spyOn(model, 'firstActiveElementAt').mockReturnValue(rectangle);

        service.onCanvasMouseDown(host, {
            button: 0,
            clientX: 15,
            clientY: 15,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
        });

        expect(rectangle.editPoints).toBe(false);
    });

    test('onCanvasMouseMove forwards shift state to resize handles', () => {
        const service = new DesignMouseInteractionService();
        const { host, element } = createHost();
        const handleMoved = jest.fn();
        const handle = new Handle(30, 20, element, {} as never);
        handle.handleMoved = handleMoved;
        host.isResizing = true;
        host.sizeHandles = [handle];
        host.isMouseDown = true;

        service.onCanvasMouseMove(host, {
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

    test('onCanvasMouseUp commits move previews and undo state', () => {
        const service = new DesignMouseInteractionService();
        const { host, element } = createHost({
            isMoving: true,
            isMouseDown: true,
            getElementMoveLocation: () => new Point(40, 50),
            getElementResizeSize: () => new Size(20, 10),
        });

        service.onCanvasMouseUp(host, {
            button: 0,
            clientX: 40,
            clientY: 50,
        });

        expect(element.getLocation()).toMatchObject({ x: 40, y: 50 });
        expect(element.getSize()).toMatchObject({ width: 20, height: 10 });
        expect(host.onElementMoved).toHaveBeenCalledWith(element, expect.objectContaining({ x: 40, y: 50 }));
        expect(host.onElementSized).toHaveBeenCalledWith(element, expect.objectContaining({ width: 20, height: 10 }));
        expect(host.commitUndoSnapshot).toHaveBeenCalledTimes(1);
        expect(host.isMoving).toBe(false);
    });

    test('onCanvasMouseUp releases the pressed element and fires click when still hovered', () => {
        const service = new DesignMouseInteractionService();
        const { host, element } = createHost({
            isMouseDown: true,
            pressedElement: undefined,
            mouseOverElement: undefined,
        });
        const mouseUpElement = jest.fn();
        const elementClicked = jest.fn();
        host.mouseUpElement.add(mouseUpElement);
        host.elementClicked.add(elementClicked);
        host.pressedElement = element;
        host.mouseOverElement = element;

        service.onCanvasMouseUp(host, {
            button: 0,
            clientX: 10,
            clientY: 10,
        });

        expect(mouseUpElement).toHaveBeenCalledWith(host.controller, element);
        expect(elementClicked).toHaveBeenCalledWith(host.controller, element);
        expect(host.pressedElement).toBeUndefined();
    });

    test('onCanvasMouseUp emits elementCreated when a valid rubber band completes', () => {
        const service = new DesignMouseInteractionService();
        const { host } = createHost({
            isMouseDown: true,
            rubberBandActive: true,
            rubberBandRegion: new Region(10, 10, 20, 12),
        });
        const elementCreated = jest.fn();
        host.elementCreated.add(elementCreated);

        service.onCanvasMouseUp(host, {
            button: 0,
            clientX: 30,
            clientY: 22,
        });

        expect(elementCreated).toHaveBeenCalledWith(host.controller, host.rubberBandRegion);
        expect(host.rubberBandActive).toBe(false);
    });
});