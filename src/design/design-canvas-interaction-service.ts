import { IController } from '../controller/controller';
import type { IControllerEvent } from '../controller/controller-event';
import { IMouseEvent } from '../core/mouse-event';
import { Point } from '../core/point';
import { ViewDragArgs } from '../core/view-drag-args';
import { ElementBase } from '../elements/element-base';
import { ElementDragArgs } from '../elements/element-drag-args';
import { ComponentElement } from './component/component-element';
import { DesignContextMenuEventArgs, type DesignContextMenuPointActions } from './design-context-menu-event-args';

export interface DesignCanvasInteractionHost {
    controller: IController;
    enabled: boolean;
    canvas?: HTMLCanvasElement;
    model?: {
        elements: ElementBase[];
        firstActiveElementAt(context: CanvasRenderingContext2D, x: number, y: number): ElementBase | undefined;
        elementsAt(context: CanvasRenderingContext2D, x: number, y: number): ElementBase[] | undefined;
    };
    activeToolIsCreating: boolean;
    isDragging: boolean;
    mouseOverElement?: ElementBase;
    pressedElement?: ElementBase;
    dragOverElement?: ElementBase;
    selectedElements: ElementBase[];
    editingTextElement?: ElementBase;
    rotationCenter?: Point;
    originalPivotCenter?: Point;
    restoringUndoState: boolean;
    mouseEnteredElement: IControllerEvent<ElementBase>;
    mouseLeftElement: IControllerEvent<ElementBase>;
    mouseDownElement: IControllerEvent<ElementBase>;
    mouseUpElement: IControllerEvent<ElementBase>;
    contextMenuRequested: IControllerEvent<DesignContextMenuEventArgs>;
    selectionChanged: IControllerEvent<number>;
    elementDragEnter: IControllerEvent<ElementDragArgs>;
    elementDragLeave: IControllerEvent<ElementDragArgs>;
    elementDrop: IControllerEvent<ElementDragArgs>;
    viewDragEnter: IControllerEvent<ViewDragArgs>;
    viewDragOver: IControllerEvent<ViewDragArgs>;
    viewDragLeave: IControllerEvent<ViewDragArgs>;
    viewDrop: IControllerEvent<ViewDragArgs>;
    windowToCanvas(x: number, y: number): Point;
    isSelected(element: ElementBase): boolean;
    endTextEdit(): void;
    replaceCurrentUndoSnapshot(): void;
    invalidate(): void;
    drawIfNeeded(): void;
    resolvePointContextMenuActions(point: Point, element?: ElementBase): DesignContextMenuPointActions;
}

export class DesignCanvasInteractionService {
    public onCanvasDragEnter(host: DesignCanvasInteractionHost, e: DragEvent): void {
        e.stopPropagation();
        e.preventDefault();
        if (!host.enabled) {
            return;
        }
        host.isDragging = true;
        if (host.viewDragEnter.hasListeners()) {
            host.viewDragEnter.trigger(host.controller, new ViewDragArgs(e, undefined));
        }
        host.drawIfNeeded();
    }

    public onCanvasDragOver(host: DesignCanvasInteractionHost, e: DragEvent): void {
        e.stopPropagation();
        e.preventDefault();

        if (!host.enabled || !host.canvas || !host.model) {
            return;
        }

        const point = host.windowToCanvas(e.clientX, e.clientY);
        if (host.viewDragOver.hasListeners()) {
            const eventArgs = Object.assign(new ViewDragArgs(e, new Point(point.x, point.y)), {
                controller: host.controller,
            });
            host.viewDragOver.trigger(host.controller, eventArgs);
        }

        const context = host.canvas.getContext('2d');
        if (context) {
            const elementsAtPoint = host.model.elementsAt(context, point.x, point.y);
            if (elementsAtPoint && elementsAtPoint.length > 0) {
                let draggable: ElementBase | undefined;
                for (let index = elementsAtPoint.length - 1; index >= 0; index--) {
                    const activeElement = elementsAtPoint[index];
                    if (activeElement instanceof ComponentElement && activeElement.component && activeElement.component.acceptsDrag) {
                        draggable = activeElement;
                        break;
                    }
                }
                this.setDragOverElement(host, draggable, e);
            }
            else {
                this.setDragOverElement(host, undefined, e);
            }
        }
        host.drawIfNeeded();
    }

    public onCanvasDragLeave(host: DesignCanvasInteractionHost, e: DragEvent | undefined): void {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (!host.enabled) {
            return;
        }
        host.isDragging = false;
        this.setDragOverElement(host, undefined, e);
        if (host.viewDragLeave.hasListeners()) {
            host.viewDragLeave.trigger(host.controller, new ViewDragArgs(e, undefined));
        }
        host.drawIfNeeded();
    }

    public onCanvasDrop(host: DesignCanvasInteractionHost, e: DragEvent): void {
        e.stopPropagation();
        e.preventDefault();
        if (!host.enabled) {
            return;
        }

        host.isDragging = false;
        const point = host.windowToCanvas(e.clientX, e.clientY);
        if (host.dragOverElement) {
            if (host.dragOverElement instanceof ComponentElement) {
                const componentElement = host.dragOverElement;
                if (componentElement.component && componentElement.component.dragLeave.hasListeners()) {
                    componentElement.component.dragLeave.trigger(componentElement.component, new ElementDragArgs(host.dragOverElement, e));
                    host.invalidate();
                }
            }
            if (host.elementDrop.hasListeners()) {
                const eventArgs = Object.assign(new ElementDragArgs(host.dragOverElement, e), {
                    controller: host.controller,
                });
                host.elementDrop.trigger(host.controller, eventArgs);
            }
        }
        else if (host.viewDrop.hasListeners()) {
            const eventArgs = Object.assign(new ViewDragArgs(e, new Point(point.x, point.y)), {
                controller: host.controller,
            });
            host.viewDrop.trigger(host.controller, eventArgs);
        }
        host.drawIfNeeded();
    }

    public setMouseDownElement(host: DesignCanvasInteractionHost, element?: ElementBase): void {
        if (element) {
            this.setMouseOverElement(host, element);
        }
        if (element !== host.pressedElement) {
            if (host.pressedElement && host.mouseUpElement.hasListeners()) {
                host.mouseUpElement.trigger(host.controller, host.pressedElement);
            }
            host.pressedElement = element;
            if (element && host.mouseDownElement.hasListeners()) {
                host.mouseDownElement.trigger(host.controller, element);
            }
        }
    }

    public onCanvasContextMenu(host: DesignCanvasInteractionHost, e: MouseEvent | IMouseEvent): void {
        if (!host.enabled || !host.model || !host.canvas) {
            return;
        }
        if (host.activeToolIsCreating) {
            e.preventDefault?.();
            e.stopPropagation?.();
            return;
        }

        const context = host.canvas.getContext('2d');
        if (!context) {
            return;
        }

        const point = host.windowToCanvas(e.clientX, e.clientY);
        const element = host.model.firstActiveElementAt(context, point.x, point.y);
        const pointActions = host.resolvePointContextMenuActions(new Point(point.x, point.y), element);
        const args = new DesignContextMenuEventArgs(e, new Point(point.x, point.y), element, host.selectedElements, pointActions);

        if (host.contextMenuRequested.hasListeners()) {
            e.preventDefault?.();
            e.stopPropagation?.();
        }

        host.contextMenuRequested.trigger(host.controller, args);
    }

    public setMouseOverElement(host: DesignCanvasInteractionHost, element?: ElementBase): void {
        if (element !== host.mouseOverElement) {
            if (host.mouseOverElement && host.mouseLeftElement.hasListeners()) {
                host.mouseLeftElement.trigger(host.controller, host.mouseOverElement);
            }
            host.mouseOverElement = element;
            if (element && host.mouseEnteredElement.hasListeners()) {
                host.mouseEnteredElement.trigger(host.controller, element);
            }
        }
    }

    public setDragOverElement(host: DesignCanvasInteractionHost, element?: ElementBase, evt?: DragEvent): void {
        if (element !== host.dragOverElement) {
            if (host.dragOverElement) {
                if (host.dragOverElement instanceof ComponentElement) {
                    const componentElement = host.dragOverElement;
                    if (componentElement.component) {
                        componentElement.component.dragLeave.trigger(componentElement.component, new ElementDragArgs(host.dragOverElement, evt));
                    }
                }
                if (host.elementDragLeave.hasListeners()) {
                    host.elementDragLeave.trigger(host.controller, new ElementDragArgs(host.dragOverElement, evt));
                }
            }
            host.dragOverElement = element;
            if (element) {
                if (element instanceof ComponentElement && element.component) {
                    element.component.dragEnter.trigger(element.component, new ElementDragArgs(element, evt));
                }
                if (host.elementDragEnter.hasListeners()) {
                    host.elementDragEnter.trigger(host.controller, new ElementDragArgs(element, evt));
                }
            }
            host.invalidate();
        }
    }

    public onSelectionChanged(host: DesignCanvasInteractionHost): void {
        const selected: string[] = [];
        if (!host.model) {
            return;
        }
        if (host.editingTextElement && host.selectedElements.indexOf(host.editingTextElement) === -1) {
            host.endTextEdit();
        }
        host.rotationCenter = undefined;
        host.originalPivotCenter = undefined;
        host.model.elements.forEach((element) => {
            if (host.isSelected(element) && element.id) {
                selected.push(element.id);
                if (element instanceof ComponentElement && element.component) {
                    element.component.select.trigger(element.component, element);
                }
            }
            else if (element instanceof ComponentElement && element.component) {
                element.component.deselect.trigger(element.component, element);
            }
        });
        if (host.selectionChanged.hasListeners()) {
            host.selectionChanged.trigger(host.controller, selected.length);
        }
        if (!host.restoringUndoState && host.model) {
            host.replaceCurrentUndoSnapshot();
        }
        host.invalidate();
    }
}