import { ControllerEvent } from '../../controller/controller-event';
import { Point } from '../../core/point';
import { Model } from '../../core/model';
import { DesignCanvasInteractionService, type DesignCanvasInteractionHost } from '../../design/design-canvas-interaction-service';
import { ComponentElement } from '../../design/component/component-element';
import { RectangleElement } from '../../elements/rectangle-element';

function createHost() {
    const serviceController = {} as never;
    const model = Model.create(100, 100);
    const context = {} as CanvasRenderingContext2D;
    const canvas = {
        getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const plain = RectangleElement.create(10, 10, 20, 15).setInteractive(true);
    plain.id = 'plain';
    const component = new ComponentElement('source', 40, 30, 25, 20).setInteractive(true) as ComponentElement;
    component.id = 'component';
    const componentDragEnter = new ControllerEvent<any>();
    const componentDragLeave = new ControllerEvent<any>();
    const componentSelect = new ControllerEvent<any>();
    const componentDeselect = new ControllerEvent<any>();
    component.component = {
        acceptsDrag: true,
        dragEnter: componentDragEnter,
        dragLeave: componentDragLeave,
        select: componentSelect,
        deselect: componentDeselect,
    } as never;
    model.add(plain);
    model.add(component);
    jest.spyOn(model, 'firstActiveElementAt').mockReturnValue(component);
    jest.spyOn(model, 'elementsAt').mockReturnValue([plain, component]);

    const host: DesignCanvasInteractionHost = {
        controller: serviceController,
        enabled: true,
        canvas,
        model,
        activeToolIsCreating: false,
        isDragging: false,
        mouseOverElement: undefined,
        pressedElement: undefined,
        dragOverElement: undefined,
        selectedElements: [component],
        editingTextElement: component,
        rotationCenter: new Point(10, 10),
        originalPivotCenter: new Point(11, 11),
        restoringUndoState: false,
        mouseEnteredElement: new ControllerEvent<any>(),
        mouseLeftElement: new ControllerEvent<any>(),
        mouseDownElement: new ControllerEvent<any>(),
        mouseUpElement: new ControllerEvent<any>(),
        contextMenuRequested: new ControllerEvent<any>(),
        selectionChanged: new ControllerEvent<any>(),
        elementDragEnter: new ControllerEvent<any>(),
        elementDragLeave: new ControllerEvent<any>(),
        elementDrop: new ControllerEvent<any>(),
        viewDragEnter: new ControllerEvent<any>(),
        viewDragOver: new ControllerEvent<any>(),
        viewDragLeave: new ControllerEvent<any>(),
        viewDrop: new ControllerEvent<any>(),
        windowToCanvas: (x: number, y: number) => new Point(x, y),
        isSelected: (element) => host.selectedElements.indexOf(element) !== -1,
        endTextEdit: jest.fn(),
        replaceCurrentUndoSnapshot: jest.fn(),
        invalidate: jest.fn(),
        drawIfNeeded: jest.fn(),
        resolvePointContextMenuActions: () => ({
            canAddPoint: true,
            addPoint: jest.fn(() => true),
        }),
    };

    return { host, model, plain, component, componentDragEnter, componentDragLeave, componentSelect, componentDeselect };
}

describe('DesignCanvasInteractionService', () => {
    test('setMouseDownElement updates hover and pressed element events', () => {
        const service = new DesignCanvasInteractionService();
        const { host, plain, component } = createHost();
        const mouseEntered = jest.fn();
        const mouseDown = jest.fn();
        const mouseUp = jest.fn();

        host.mouseEnteredElement.add(mouseEntered);
        host.mouseDownElement.add(mouseDown);
        host.mouseUpElement.add(mouseUp);

        service.setMouseDownElement(host, plain);
        service.setMouseDownElement(host, component);

        expect(host.mouseOverElement).toBe(component);
        expect(mouseEntered).toHaveBeenCalledTimes(2);
        expect(mouseDown).toHaveBeenCalledTimes(2);
        expect(mouseUp).toHaveBeenCalledTimes(1);
        expect(mouseUp.mock.calls[0][1]).toBe(plain);
    });

    test('onCanvasContextMenu targets the top-most element and preserves selected elements snapshot', () => {
        const service = new DesignCanvasInteractionService();
        const { host, component } = createHost();
        const contextMenuRequested = jest.fn();
        const preventDefault = jest.fn();
        const stopPropagation = jest.fn();
        host.contextMenuRequested.add(contextMenuRequested);

        service.onCanvasContextMenu(host, {
            clientX: 45,
            clientY: 35,
            preventDefault,
            stopPropagation,
        } as unknown as MouseEvent);

        expect(contextMenuRequested).toHaveBeenCalledTimes(1);
        expect(contextMenuRequested.mock.calls[0][1]?.element).toBe(component);
        expect(contextMenuRequested.mock.calls[0][1]?.selectedElements).toEqual([component]);
        expect(contextMenuRequested.mock.calls[0][1]?.canAddPoint).toBe(true);
        expect(contextMenuRequested.mock.calls[0][1]?.canRemovePoint).toBe(false);
        expect(preventDefault).toHaveBeenCalled();
        expect(stopPropagation).toHaveBeenCalled();
    });

    test('drag-over transitions update component and controller drag enter leave events', () => {
        const service = new DesignCanvasInteractionService();
        const { host, plain, component, componentDragEnter, componentDragLeave } = createHost();
        const controllerDragEnter = jest.fn();
        const controllerDragLeave = jest.fn();

        host.elementDragEnter.add(controllerDragEnter);
        host.elementDragLeave.add(controllerDragLeave);
        componentDragEnter.add(jest.fn());
        componentDragLeave.add(jest.fn());

        service.setDragOverElement(host, component, {} as DragEvent);
        service.setDragOverElement(host, plain, {} as DragEvent);

        expect(host.dragOverElement).toBe(plain);
        expect(controllerDragEnter).toHaveBeenCalledTimes(2);
        expect(controllerDragLeave).toHaveBeenCalledTimes(1);
    });

    test('onCanvasDragOver resolves draggable component targets and fires view drag notifications', () => {
        const service = new DesignCanvasInteractionService();
        const { host, component } = createHost();
        const dragOver = jest.fn();
        host.viewDragOver.add(dragOver);

        service.onCanvasDragOver(host, {
            clientX: 40,
            clientY: 30,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as DragEvent);

        expect(dragOver).toHaveBeenCalledTimes(1);
        expect(host.dragOverElement).toBe(component);
        expect(host.drawIfNeeded).toHaveBeenCalled();
    });

    test('onSelectionChanged ends text editing, resets transient selection state, and updates undo snapshot', () => {
        const service = new DesignCanvasInteractionService();
        const { host, plain, component, componentSelect, componentDeselect } = createHost();
        const selectionChanged = jest.fn();
        componentSelect.add(jest.fn());
        componentDeselect.add(jest.fn());
        host.selectionChanged.add(selectionChanged);
        host.selectedElements = [plain];

        service.onSelectionChanged(host);

        expect(host.endTextEdit).toHaveBeenCalledTimes(1);
        expect(host.rotationCenter).toBeUndefined();
        expect(host.originalPivotCenter).toBeUndefined();
        expect(selectionChanged).toHaveBeenCalledWith(host.controller, 1);
        expect(host.replaceCurrentUndoSnapshot).toHaveBeenCalledTimes(1);
        expect(host.invalidate).toHaveBeenCalledTimes(1);
    });
});