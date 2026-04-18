import { IController } from '../controller/controller';
import type { IControllerEvent } from '../controller/controller-event';
import { ErrorMessages } from '../core/error-messages';
import { Matrix2D } from '../core/matrix-2d';
import { Model } from '../core/model';
import { IMouseEvent } from '../core/mouse-event';
import { MouseLocationArgs } from '../core/mouse-location-args';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import { PointEventParameters } from '../core/point-event-parameters';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { ElementBase } from '../elements/element-base';
import { ElementSizeProps } from '../elements/element-size-props';
import { PathElement } from '../elements/path-element';
import { RectangleElement } from '../elements/rectangle-element';
import { TextElement } from '../elements/text-element';
import { TextPathElement } from '../elements/text-path-element';
import { ComponentElement } from './component/component-element';
import type { PathPointInsertionMode } from './design-point-edit-utils';
import { type DesignMovableSelectionEntry, type DesignSmartAlignmentGuides } from './design-movement-service';
import { Handle } from './handle';
import { DesignTool } from './tools/design-tool';

const EPSILON = 2e-23;

export interface DesignMouseInteractionHost {
    controller: IController;
    enabled: boolean;
    model?: Model;
    canvas?: HTMLCanvasElement;
    activeTool?: DesignTool;
    mouseDownPosition?: Point;
    textCaretPreferredX?: number;
    currentX?: number;
    currentY?: number;
    currentWidth?: number;
    currentHeight?: number;
    lastClientX: number;
    lastClientY: number;
    lastDeltaX: number;
    lastDeltaY: number;
    isMouseDown: boolean;
    isMoving: boolean;
    isResizing: boolean;
    isRotating: boolean;
    isMovingPivot: boolean;
    isMovingPoint: boolean;
    isMovingCornerRadius: boolean;
    isSelectingText: boolean;
    selecting: boolean;
    selectionEnabled: boolean;
    snapToGrid: boolean;
    cancelAction: boolean;
    activePointIndex?: number;
    movingPointIndex?: number;
    movingPointLocation?: Point;
    rubberBandActive: boolean;
    rubberBandRegion?: Region;
    sizeHandles?: Handle[];
    selectedElements: ElementBase[];
    editingTextElement?: TextElement;
    textSelectionAnchor: number;
    textSelectionStart: number;
    textSelectionEnd: number;
    pressedElement?: ElementBase;
    mouseOverElement?: ElementBase;
    rotationCenter?: Point;
    originalPivotCenter?: Point;
    originalTransform?: string;
    rotationStartAngle: number;
    originalRotation: number;
    minElementSize: Size;
    mouseDownView: IControllerEvent<PointEventParameters>;
    smartAlignmentGuides: DesignSmartAlignmentGuides;
    mouseMovedView: IControllerEvent<PointEventParameters>;
    mouseUpView: IControllerEvent<PointEventParameters>;
    mouseUpElement: IControllerEvent<ElementBase>;
    elementClicked: IControllerEvent<ElementBase>;
    elementCreated: IControllerEvent<Region>;
    captureMouse(): void;
    windowToCanvas(x: number, y: number): Point;
    resolveTextEditInteractionPoint(element: TextElement, bounds: Region, point: Point): Point | undefined;
    beginTextEdit(element?: TextElement, index?: number): boolean;
    getSelectedTextElement(): TextElement | undefined;
    selectedElementCount(): number;
    movableSelectedElementCount(): number;
    resizeableSelectedElementCount(): number;
    getElementHandles(element: ElementBase): Handle[];
    getSelectedMovableEntries(): DesignMovableSelectionEntry[];
    constrainMoveDeltaToBounds(entries: DesignMovableSelectionEntry[], deltaX: number, deltaY: number): Point;
    snapMoveDeltaToGrid(entries: DesignMovableSelectionEntry[], deltaX: number, deltaY: number): Point;
    getSmartAlignmentDelta(entries: DesignMovableSelectionEntry[], deltaX: number, deltaY: number): {
        deltaX: number;
        deltaY: number;
        guides: DesignSmartAlignmentGuides;
    };
    getElementMoveLocation(element: ElementBase): Point;
    setElementMoveLocation(element: ElementBase, location: Point, size: Size): void;
    getElementResizeSize(element: ElementBase): Size;
    setElementResizeSize(element: ElementBase, size: Size, location?: Point): void;
    clearElementMoveLocations(): void;
    clearElementResizeSizes(): void;
    onElementMoved(element: ElementBase, location: Point): void;
    onElementSized(element: ElementBase, size: Size): void;
    onElementRotating(element: ElementBase, angle: number): void;
    onElementRotated(element: ElementBase, angle: number): void;
    setIsDirty(value: boolean): void;
    beginToolHistorySession(): void;
    commitUndoSnapshot(): void;
    finalizeToolHistorySession(): void;
    draw(): void;
    drawIfNeeded(): void;
    invalidate(): void;
    setMouseDownElement(element?: ElementBase): void;
    setMouseOverElement(element?: ElementBase): void;
    isSelected(element: ElementBase): boolean;
    onSelectionChanged(): void;
    clearSelections(): void;
    selectElement(element: ElementBase): void;
    toggleSelected(element: ElementBase): void;
    getNearestSnapX(x: number): number;
    getNearestSnapY(y: number): number;
    getHandleCornerRadii(handle?: Handle): [number, number, number, number] | undefined;
    areCornerRadiiEqual(
        left?: [number, number, number, number] | number[],
        right?: [number, number, number, number] | number[],
    ): boolean;
    insertPointAtLocation(point: Point, mode?: PathPointInsertionMode): number | undefined;
}

export class DesignMouseInteractionService {
    public onCanvasMouseDown(host: DesignMouseInteractionHost, e: MouseEvent | IMouseEvent): void {
        if (!host.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!host.canvas) {
            return;
        }
        if (!host.enabled) {
            return;
        }

        const point = host.windowToCanvas(e.clientX, e.clientY);
        const button = e.button || 0;

        if (button === 2) {
            if (host.activeTool && host.activeTool.isCreating) {
                host.activeTool.cancel();
                host.finalizeToolHistorySession();
                e.preventDefault?.();
                e.stopPropagation?.();
                host.isMouseDown = false;
                host.draw();
                return;
            }

            if (host.mouseDownView.hasListeners()) {
                host.mouseDownView.trigger(host.controller, new PointEventParameters(e, new Point(point.x, point.y)));
            }
            return;
        }

        const context = host.canvas.getContext('2d');
        if (!context) {
            return;
        }

        if (!host.activeTool) {
            const selectedHandle = this.findSelectedHandle(host, context, point);
            const insertionMode = this.resolvePathInsertionMode(host, e);
            if (!selectedHandle && insertionMode) {
                const insertedPointIndex = host.insertPointAtLocation(new Point(point.x, point.y), insertionMode);
                if (insertedPointIndex !== undefined) {
                    return;
                }
            }

            if (!selectedHandle && this.getClickCount(e) >= 2) {
                const insertedPointIndex = host.insertPointAtLocation(new Point(point.x, point.y));
                if (insertedPointIndex !== undefined) {
                    return;
                }
            }
        }

        host.captureMouse();

        host.currentX = point.x;
        host.currentY = point.y;
        host.currentWidth = 0;
        host.currentHeight = 0;
        host.mouseDownPosition = new Point(point.x, point.y);
        host.isMouseDown = true;

        if (host.activeTool) {
            const toolPoint = this.getActiveToolPoint(host, point);
            if (!host.activeTool.isCreating) {
                host.beginToolHistorySession();
            }
            host.activeTool.mouseDown(new MouseLocationArgs(e, toolPoint));

            if (host.mouseDownView.hasListeners()) {
                host.mouseDownView.trigger(host.controller, new PointEventParameters(e, new Point(point.x, point.y)));
            }
            return;
        }

        if (host.mouseDownView.hasListeners()) {
            host.mouseDownView.trigger(host.controller, new PointEventParameters(e, new Point(point.x, point.y)));
        }

        if (this.handleExistingTextEditPointerDown(host, context, e, point)) {
            return;
        }

        if (this.handleSelectedTextEditPointerDown(host, context, e, point)) {
            return;
        }

        const activeElement = host.model.firstActiveElementAt(context, point.x, point.y);
        host.setMouseDownElement(activeElement);
        host.cancelAction = false;

        const selectedHandle = this.findSelectedHandle(host, context, point);
        if (selectedHandle) {
            if (this.beginHandleInteraction(host, selectedHandle, point)) {
                return;
            }
        }

        this.handleSelectionOrRubberBand(host, context, e, point);
        host.invalidate();
        host.drawIfNeeded();
    }

    public onCanvasMouseMove(host: DesignMouseInteractionHost, e: MouseEvent | IMouseEvent): void {
        if (!host.enabled) {
            return;
        }
        if (!host.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!host.canvas) {
            return;
        }
        if (e.button === 2) {
            return;
        }

        host.lastClientX = e.clientX;
        host.lastClientY = e.clientY;

        const point = host.windowToCanvas(e.clientX, e.clientY);
        this.updateCurrentDragExtent(host, point);
        const delta = this.getMouseDelta(host, point);
        if (!delta) {
            return;
        }

        if (host.mouseMovedView.hasListeners()) {
            host.mouseMovedView.trigger(host.controller, new PointEventParameters(e, new Point(point.x, point.y)));
        }

        if (this.updateTextSelection(host, point)) {
            host.drawIfNeeded();
            return;
        }

        if (host.activeTool) {
            host.activeTool.mouseMove(new MouseLocationArgs(e, this.getActiveToolPoint(host, point)));
            return;
        }

        if (this.updateHandleInteraction(host, e, point, delta.x, delta.y)) {
            host.drawIfNeeded();
            return;
        }

        if (host.isMoving) {
            this.updateMovePreview(host, delta.x, delta.y);
        }
        else if (host.isMovingPoint && host.movingPointIndex !== undefined) {
            this.updatePointPreview(host, delta.x, delta.y);
        }
        else if (host.isMouseDown) {
            this.updateMouseDownPreview(host, delta.x, delta.y);
        }
        else {
            this.updateHoverState(host, e, point);
        }

        host.drawIfNeeded();
    }

    public onCanvasMouseUp(host: DesignMouseInteractionHost, e: MouseEvent | IMouseEvent): void {
        if (!host.enabled) {
            return;
        }
        if (!host.mouseDownPosition) {
            return;
        }
        if (!host.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!host.canvas) {
            return;
        }

        const point = host.windowToCanvas(e.clientX, e.clientY);
        const deltaX = point.x - host.mouseDownPosition.x;
        const deltaY = point.y - host.mouseDownPosition.y;

        host.isMouseDown = false;
        if (host.mouseUpView.hasListeners()) {
            host.mouseUpView.trigger(host.controller, new PointEventParameters(e, new Point(point.x, point.y)));
        }

        if (host.activeTool) {
            host.activeTool.mouseUp(new MouseLocationArgs(e, this.getActiveToolPoint(host, point)));
            if (!host.activeTool.isCreating) {
                host.finalizeToolHistorySession();
            }
            return;
        }

        if (host.isSelectingText) {
            host.isSelectingText = false;
            host.invalidate();
            host.drawIfNeeded();
            return;
        }

        if (e.button === 0) {
            this.handleLeftMouseUp(host, deltaX, deltaY);
        }

        this.releasePressedElement(host);
        host.drawIfNeeded();
    }

    private updateCurrentDragExtent(host: DesignMouseInteractionHost, point: Point): void {
        if (host.isMouseDown && host.currentX !== undefined && host.currentY !== undefined) {
            host.currentWidth = point.x - host.currentX;
            host.currentHeight = point.y - host.currentY;
        }
        else {
            host.currentX = point.x;
            host.currentY = point.y;
            host.currentWidth = 0;
            host.currentHeight = 0;
        }
    }

    private getActiveToolPoint(host: DesignMouseInteractionHost, point: Point): Point {
        if (!host.snapToGrid) {
            return new Point(point.x, point.y);
        }

        return new Point(host.getNearestSnapX(point.x), host.getNearestSnapY(point.y));
    }

    private getMouseDelta(host: DesignMouseInteractionHost, point: Point): Point | undefined {
        let deltaX = 0;
        let deltaY = 0;
        if (host.mouseDownPosition) {
            const size = host.model?.getSize();
            if (size) {
                deltaX = point.x - host.mouseDownPosition.x;
                if (host.mouseDownPosition.x + deltaX < 0) {
                    deltaX = -host.mouseDownPosition.x;
                    host.currentX = 0;
                    host.currentWidth = host.mouseDownPosition.x;
                }
                else if (host.mouseDownPosition.x + deltaX >= size.width) {
                    deltaX = size.width - host.mouseDownPosition.x;
                    host.currentX = size.width - 1;
                    host.currentWidth = deltaX;
                }
                deltaY = point.y - host.mouseDownPosition.y;
                if (host.mouseDownPosition.y + deltaY < 0) {
                    deltaY = -host.mouseDownPosition.y;
                    host.currentY = 0;
                    host.currentHeight = host.mouseDownPosition.y;
                }
                else if (host.mouseDownPosition.y + deltaY >= size.height) {
                    deltaY = size.height - host.mouseDownPosition.y;
                    host.currentY = size.height - 1;
                    host.currentHeight = deltaY;
                }
                if (deltaX === host.lastDeltaX && deltaY === host.lastDeltaY) {
                    return undefined;
                }
            }
        }
        host.lastDeltaX = deltaX;
        host.lastDeltaY = deltaY;
        return new Point(deltaX, deltaY);
    }

    private updateTextSelection(host: DesignMouseInteractionHost, point: Point): boolean {
        if (!host.isSelectingText || !host.editingTextElement || !host.canvas) {
            return false;
        }

        const editingBounds = host.editingTextElement.getBounds();
        const canvasContext = host.canvas.getContext('2d');
        const localPoint = editingBounds
            ? host.resolveTextEditInteractionPoint(host.editingTextElement, editingBounds, new Point(point.x, point.y))
            : undefined;
        if (!editingBounds || !canvasContext || !localPoint) {
            return false;
        }

        const caretIndex = host.editingTextElement.getTextIndexAtPoint(
            canvasContext,
            editingBounds.location,
            editingBounds.size,
            localPoint,
        );
        host.textSelectionStart = host.textSelectionAnchor;
        host.textSelectionEnd = caretIndex;
        host.invalidate();
        return true;
    }

    private handleExistingTextEditPointerDown(
        host: DesignMouseInteractionHost,
        context: CanvasRenderingContext2D,
        e: MouseEvent | IMouseEvent,
        point: Point,
    ): boolean {
        if (!host.editingTextElement || host.selectedElements.indexOf(host.editingTextElement) === -1) {
            return false;
        }

        const editingBounds = host.editingTextElement.getBounds();
        const localPoint = editingBounds
            ? host.resolveTextEditInteractionPoint(host.editingTextElement, editingBounds, new Point(point.x, point.y))
            : undefined;
        if (!editingBounds || !localPoint || !editingBounds.containsCoordinate(localPoint.x, localPoint.y)) {
            return false;
        }

        const caretIndex = host.editingTextElement.getTextIndexAtPoint(
            context,
            editingBounds.location,
            editingBounds.size,
            localPoint,
        );
        this.beginTextSelection(host, host.editingTextElement, caretIndex, this.getClickCount(e));
        return true;
    }

    private handleSelectedTextEditPointerDown(
        host: DesignMouseInteractionHost,
        context: CanvasRenderingContext2D,
        e: MouseEvent | IMouseEvent,
        point: Point,
    ): boolean {
        const selectedTextElement = host.getSelectedTextElement();
        if (!selectedTextElement || !e.shiftKey) {
            return false;
        }

        const editingBounds = selectedTextElement.getBounds();
        const localPoint = editingBounds
            ? host.resolveTextEditInteractionPoint(selectedTextElement, editingBounds, new Point(point.x, point.y))
            : undefined;
        if (!editingBounds || !localPoint || !editingBounds.containsCoordinate(localPoint.x, localPoint.y)) {
            return false;
        }

        const caretIndex = selectedTextElement.getTextIndexAtPoint(
            context,
            editingBounds.location,
            editingBounds.size,
            localPoint,
        );
        host.beginTextEdit(selectedTextElement, caretIndex);
        this.beginTextSelection(host, selectedTextElement, caretIndex, this.getClickCount(e));
        return true;
    }

    private beginTextSelection(
        host: DesignMouseInteractionHost,
        element: TextElement,
        caretIndex: number,
        clickCount: number,
    ): void {
        host.textCaretPreferredX = undefined;
        if (clickCount >= 2) {
            const [start, end] = element.getWordRangeAt(caretIndex);
            host.textSelectionAnchor = start;
            host.textSelectionStart = start;
            host.textSelectionEnd = end;
            host.isSelectingText = false;
        }
        else {
            host.textSelectionAnchor = caretIndex;
            host.textSelectionStart = caretIndex;
            host.textSelectionEnd = caretIndex;
            host.isSelectingText = true;
        }
        host.invalidate();
        host.drawIfNeeded();
    }

    private findSelectedHandle(
        host: DesignMouseInteractionHost,
        context: CanvasRenderingContext2D,
        point: Point,
    ): Handle | undefined {
        for (const element of host.selectedElements) {
            const handles = host.getElementHandles(element);

            if (element.transform && host.model) {
                context.save();
                const bounds = element.getBounds();
                if (!bounds) {
                    continue;
                }
                let reference = new Point(bounds.x, bounds.y);
                if (host.isMoving && element.canMove()) {
                    reference = host.getElementMoveLocation(element);
                }
                else if (host.isResizing && element.canResize()) {
                    reference = host.getElementMoveLocation(element);
                }
                host.model.setRenderTransform(context, element.transform, reference);
                for (const handle of handles) {
                    context.beginPath();
                    if (handle.region) {
                        context.rect(handle.region.x, handle.region.y, handle.region.width, handle.region.height);
                    }
                    const hit = context.isPointInPath(point.x, point.y);
                    context.closePath();
                    if (hit) {
                        host.canvas!.style.cursor = handle.cursor;
                        context.restore();
                        return handle;
                    }
                }
                context.restore();
                continue;
            }

            for (const handle of handles) {
                const region = handle.region;
                if (!region) {
                    continue;
                }
                let hit = region.containsCoordinate(point.x, point.y);
                if (!hit && handle.barRegion && handle.barRegion.containsCoordinate(point.x, point.y)) {
                    hit = true;
                }
                if (hit) {
                    host.canvas!.style.cursor = handle.cursor;
                    return handle;
                }
            }
        }
        return undefined;
    }

    private beginHandleInteraction(host: DesignMouseInteractionHost, selectedHandle: Handle, point: Point): boolean {
        host.sizeHandles = [];
        const handleId = selectedHandle.handleId;
        if (typeof handleId === 'string' && handleId.startsWith('rotate-')) {
            host.sizeHandles.push(selectedHandle);
            host.isRotating = true;
            const element = selectedHandle.element;
            const bounds = element.getBounds();
            if (bounds) {
                if (!host.rotationCenter) {
                    const rotationCenter = element.getRotationCenter();
                    host.rotationCenter = rotationCenter
                        ? new Point(bounds.x + rotationCenter.x, bounds.y + rotationCenter.y)
                        : new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
                }
                let canvasCenter = new Point(host.rotationCenter.x, host.rotationCenter.y);
                if (element.transform) {
                    const matrix = Matrix2D.fromTransformString(element.transform, new Point(bounds.x, bounds.y));
                    canvasCenter = matrix.transformPoint(host.rotationCenter);
                }
                host.rotationStartAngle = Math.atan2(point.y - canvasCenter.y, point.x - canvasCenter.x);
                host.originalRotation = element.getRotation();
                host.originalTransform = element.transform;
            }
            return true;
        }
        if (typeof handleId === 'string' && handleId === 'pivot') {
            host.sizeHandles.push(selectedHandle);
            host.isMovingPivot = true;
            const pivotElement = selectedHandle.element;
            const pivotBounds = pivotElement.getBounds();
            if (pivotBounds) {
                if (!host.rotationCenter) {
                    const rotationCenter = pivotElement.getRotationCenter();
                    host.rotationCenter = rotationCenter
                        ? new Point(pivotBounds.x + rotationCenter.x, pivotBounds.y + rotationCenter.y)
                        : new Point(pivotBounds.x + pivotBounds.width / 2, pivotBounds.y + pivotBounds.height / 2);
                }
                host.originalPivotCenter = new Point(host.rotationCenter.x, host.rotationCenter.y);
            }
            return true;
        }
        if (typeof handleId === 'string' && handleId.startsWith('cornerRadius-')) {
            host.sizeHandles.push(selectedHandle);
            host.isMovingCornerRadius = true;
            return true;
        }

        if (host.resizeableSelectedElementCount() > 0) {
            for (const selectedElement of host.selectedElements) {
                if (!selectedElement.canResize()) {
                    continue;
                }
                const elementHandles = host.getElementHandles(selectedElement);
                elementHandles.forEach((handle) => {
                    if (handle.handleId === selectedHandle.handleId) {
                        host.sizeHandles!.push(handle);
                    }
                });
            }
            host.isResizing = true;
            return true;
        }

        if (host.selectedElementCount() === 1) {
            const element = host.selectedElements[0];
            if (element.canMovePoint()) {
                const pointIndex = selectedHandle.handleIndex;
                if (pointIndex !== undefined) {
                    host.activePointIndex = pointIndex;
                    host.sizeHandles.push(selectedHandle);
                    host.isMovingPoint = true;
                    host.movingPointLocation = element.getPointAt(pointIndex, PointDepth.Full);
                    host.movingPointIndex = pointIndex;
                    return true;
                }
            }
        }

        host.sizeHandles = undefined;
        return false;
    }

    private handleSelectionOrRubberBand(
        host: DesignMouseInteractionHost,
        context: CanvasRenderingContext2D,
        e: MouseEvent | IMouseEvent,
        point: Point,
    ): void {
        if (host.selectionEnabled || e.ctrlKey || e.metaKey) {
            const elementsAtPoint = host.model?.elementsAt(context, point.x, point.y);
            if (elementsAtPoint && elementsAtPoint.length > 0) {
                host.rubberBandActive = false;
                host.canvas!.style.cursor = 'pointer';

                let elementSelected = false;
                for (const elementAtPoint of elementsAtPoint) {
                    if (host.isSelected(elementAtPoint)) {
                        elementSelected = true;
                        break;
                    }
                }

                const activeElement = elementsAtPoint[elementsAtPoint.length - 1];
                if (e.shiftKey) {
                    host.toggleSelected(activeElement);
                }
                else if (host.selectionEnabled && (e.ctrlKey || e.metaKey)) {
                    host.toggleSelected(activeElement);
                }
                else if (!elementSelected) {
                    host.clearSelections();
                    host.selectElement(activeElement);
                }
                else if (elementsAtPoint.length === 1 && elementsAtPoint[0].canEditPoints() && elementsAtPoint[0].editPoints) {
                    elementsAtPoint[0].editPoints = false;
                    host.activePointIndex = undefined;
                }
                return;
            }

            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                host.clearSelections();
            }
            host.rubberBandRegion = new Region(point.x, point.y, 0, 0);
            host.rubberBandActive = true;
            host.selecting = host.selectionEnabled ? true : !!(e.ctrlKey || e.metaKey || e.shiftKey);
            host.invalidate();
            return;
        }

        host.clearSelections();
        host.rubberBandRegion = new Region(point.x, point.y, 0, 0);
        host.rubberBandActive = true;
        host.selecting = false;
        host.invalidate();
    }

    private getClickCount(e: MouseEvent | IMouseEvent): number {
        return typeof (e as MouseEvent).detail === 'number' ? (e as MouseEvent).detail : 1;
    }

    private resolvePathInsertionMode(
        host: DesignMouseInteractionHost,
        e: MouseEvent | IMouseEvent,
    ): PathPointInsertionMode | undefined {
        if (!(e.ctrlKey || e.metaKey) || host.selectedElements.length !== 1) {
            return undefined;
        }

        const selectedElement = host.selectedElements[0];
        if (!selectedElement.editPoints || !(selectedElement instanceof PathElement || selectedElement instanceof TextPathElement)) {
            return undefined;
        }

        return e.altKey ? 'bezier' : 'anchor';
    }

    private updateHandleInteraction(
        host: DesignMouseInteractionHost,
        e: MouseEvent | IMouseEvent,
        point: Point,
        deltaX: number,
        deltaY: number,
    ): boolean {
        if (host.isRotating && host.sizeHandles && host.sizeHandles.length > 0) {
            host.sizeHandles.forEach((handle) => {
                if (handle.handleMoved) {
                    handle.handleMoved(handle, {
                        deltaX: 0,
                        deltaY: 0,
                        mouseX: point.x,
                        mouseY: point.y,
                        shiftKey: e.shiftKey,
                    });
                }
            });
            const rotatingElement = host.sizeHandles[0]?.element;
            if (rotatingElement) {
                host.onElementRotating(rotatingElement, rotatingElement.getRotation());
            }
            return true;
        }

        if (host.isMovingPivot && host.sizeHandles && host.sizeHandles.length > 0) {
            host.sizeHandles.forEach((handle) => {
                if (handle.handleMoved) {
                    const localDelta = this.transformDeltaToLocal(handle.element, host.model, deltaX, deltaY);
                    handle.handleMoved(handle, { deltaX: localDelta.x, deltaY: localDelta.y });
                }
            });
            return true;
        }

        if (host.isResizing && host.sizeHandles && host.sizeHandles.length > 0) {
            host.sizeHandles.forEach((handle) => {
                if (handle.handleMoved) {
                    const localDelta = this.transformDeltaToLocal(handle.element, host.model, deltaX, deltaY);
                    handle.handleMoved(handle, {
                        deltaX: localDelta.x,
                        deltaY: localDelta.y,
                        shiftKey: e.shiftKey,
                    });
                }
            });
            return true;
        }

        if (host.isMovingCornerRadius && host.sizeHandles && host.sizeHandles.length > 0) {
            host.sizeHandles.forEach((handle) => {
                if (handle.handleMoved) {
                    const localDelta = this.transformDeltaToLocal(handle.element, host.model, deltaX, deltaY);
                    handle.handleMoved(handle, {
                        deltaX: localDelta.x,
                        deltaY: localDelta.y,
                        shiftKey: e.shiftKey,
                    });
                }
            });
            return true;
        }

        return false;
    }

    private updateMovePreview(host: DesignMouseInteractionHost, deltaX: number, deltaY: number): void {
        const movableEntries = host.getSelectedMovableEntries();
        if (movableEntries.length === 0) {
            return;
        }

        const constrainedDelta = host.constrainMoveDeltaToBounds(movableEntries, deltaX, deltaY);
        const snappedDelta = host.snapMoveDeltaToGrid(movableEntries, constrainedDelta.x, constrainedDelta.y);
        let moveDeltaX = snappedDelta.x;
        let moveDeltaY = snappedDelta.y;
        const smartAligned = host.getSmartAlignmentDelta(movableEntries, moveDeltaX, moveDeltaY);
        if (
            Math.abs(smartAligned.deltaX - moveDeltaX) > EPSILON ||
            Math.abs(smartAligned.deltaY - moveDeltaY) > EPSILON
        ) {
            const reclampedDelta = host.constrainMoveDeltaToBounds(movableEntries, smartAligned.deltaX, smartAligned.deltaY);
            if (
                Math.abs(reclampedDelta.x - smartAligned.deltaX) <= EPSILON &&
                Math.abs(reclampedDelta.y - smartAligned.deltaY) <= EPSILON
            ) {
                moveDeltaX = smartAligned.deltaX;
                moveDeltaY = smartAligned.deltaY;
                host.smartAlignmentGuides = smartAligned.guides;
            }
            else {
                host.smartAlignmentGuides = { vertical: [], horizontal: [] };
                moveDeltaX = reclampedDelta.x;
                moveDeltaY = reclampedDelta.y;
            }
        }
        else {
            host.smartAlignmentGuides = smartAligned.guides;
        }

        for (const entry of movableEntries) {
            const moveSize = host.getElementResizeSize(entry.element);
            const moveLocation = new Point(Math.round(entry.bounds.x + moveDeltaX), Math.round(entry.bounds.y + moveDeltaY));
            host.setElementMoveLocation(entry.element, moveLocation, moveSize);
        }
        host.invalidate();
    }

    private updatePointPreview(host: DesignMouseInteractionHost, deltaX: number, deltaY: number): void {
        const pointHolder = host.selectedElements[0];
        let depth = PointDepth.Simple;
        if (host.selectedElementCount() === 1) {
            depth = PointDepth.Full;
        }
        const pointLocation = pointHolder.getPointAt(host.movingPointIndex!, depth);
        let localDX = deltaX;
        let localDY = deltaY;
        if (pointHolder.transform && host.model) {
            const bounds = pointHolder.getBounds();
            if (bounds) {
                const reference = new Point(bounds.x, bounds.y);
                const matrix = Matrix2D.fromTransformString(pointHolder.transform, reference);
                const inverse = matrix.inverse();
                const local = inverse.transformVector(deltaX, deltaY);
                localDX = local.x;
                localDY = local.y;
            }
        }
        host.movingPointLocation = host.snapToGrid
            ? new Point(
                host.getNearestSnapX(pointLocation.x + localDX),
                host.getNearestSnapY(pointLocation.y + localDY),
            )
            : new Point(Math.round(pointLocation.x + localDX), Math.round(pointLocation.y + localDY));
        host.invalidate();
    }

    private updateMouseDownPreview(host: DesignMouseInteractionHost, deltaX: number, deltaY: number): void {
        if (!host.isMoving) {
            if (host.movableSelectedElementCount() > 0 && deltaX * deltaX + deltaY * deltaY > 8) {
                host.selectedElements.forEach((selectedElement) => {
                    if (selectedElement.canMove()) {
                        const location = selectedElement.getLocation();
                        const size = selectedElement.getSize();
                        if (location && size) {
                            host.setElementMoveLocation(selectedElement, new Point(location.x, location.y), size);
                            host.setElementResizeSize(selectedElement, new Size(size.width, size.height), location);
                        }
                    }
                });
                host.isMoving = true;
                host.invalidate();
            }
        }

        if (host.rubberBandActive && host.mouseDownPosition && host.model) {
            let left = Math.min(host.mouseDownPosition.x, host.mouseDownPosition.x + deltaX);
            let top = Math.min(host.mouseDownPosition.y, host.mouseDownPosition.y + deltaY);
            let width = Math.abs(deltaX);
            let height = Math.abs(deltaY);

            if (host.snapToGrid) {
                left = host.getNearestSnapX(host.mouseDownPosition.x);
                top = host.getNearestSnapY(host.mouseDownPosition.y);
            }
            if (left < 0) {
                left = 0;
            }
            if (top < 0) {
                top = 0;
            }
            const size = host.model.getSize();
            if (size) {
                if (left + width > size.width) {
                    width = size.width - left;
                }
                if (top + height > size.height) {
                    height = size.height - top;
                }
                host.rubberBandRegion = new Region(left, top, width, height);
            }
            host.invalidate();
            host.canvas!.style.cursor = 'none';
        }
    }

    private updateHoverState(host: DesignMouseInteractionHost, e: MouseEvent | IMouseEvent, point: Point): void {
        let foundHandle = false;
        const selectionLength = host.selectedElements.length;
        for (let selectionIndex = 0; selectionIndex < selectionLength; selectionIndex++) {
            const selectedElement = host.selectedElements[selectionIndex];
            const handles = host.getElementHandles(selectedElement);

            if (selectedElement.transform) {
                const context = host.canvas?.getContext('2d');
                if (context && host.model) {
                    context.save();
                    const bounds = selectedElement.getBounds();
                    if (!bounds) {
                        continue;
                    }
                    let reference = new Point(bounds.x, bounds.y);
                    if (host.isMoving && selectedElement.canMove()) {
                        reference = host.getElementMoveLocation(selectedElement);
                    }
                    else if (host.isResizing && selectedElement.canResize()) {
                        reference = host.getElementMoveLocation(selectedElement);
                    }
                    host.model.setRenderTransform(context, selectedElement.transform, reference);
                    for (const handle of handles) {
                        context.beginPath();
                        if (!handle.region) {
                            return;
                        }
                        context.rect(handle.region.x, handle.region.y, handle.region.width, handle.region.height);
                        const hit = context.isPointInPath(point.x, point.y);
                        context.closePath();
                        if (hit) {
                            host.canvas!.style.cursor = handle.cursor;
                            foundHandle = true;
                            break;
                        }
                    }
                    context.restore();
                }
            }
            else {
                for (const handle of handles) {
                    if (!handle.region) {
                        continue;
                    }
                    if (handle.region.containsCoordinate(point.x, point.y)) {
                        host.canvas!.style.cursor = handle.cursor;
                        foundHandle = true;
                        break;
                    }
                }
                if (foundHandle) {
                    break;
                }
            }
        }

        if (foundHandle) {
            return;
        }

        const context = host.canvas?.getContext('2d');
        if (!context || !host.model) {
            return;
        }
        const elementsAtPoint = host.model.elementsAt(context, point.x, point.y);
        if (elementsAtPoint && elementsAtPoint.length > 0) {
            if (e.ctrlKey || e.metaKey) {
                host.canvas!.style.cursor = 'pointer';
            }
            else if (host.selectionEnabled) {
                host.canvas!.style.cursor = 'pointer';
            }
            else {
                host.canvas!.style.cursor = 'crosshair';
            }
            const activeElement = elementsAtPoint[elementsAtPoint.length - 1];
            host.setMouseOverElement(activeElement);
            return;
        }

        host.canvas!.style.cursor = 'crosshair';
        host.setMouseOverElement(undefined);
    }

    private handleLeftMouseUp(host: DesignMouseInteractionHost, deltaX: number, deltaY: number): void {
        host.isMouseDown = false;

        if (host.rubberBandActive && host.rubberBandRegion && host.model) {
            host.rubberBandActive = false;
            if (host.selecting) {
                let itemsSelected = false;
                for (const element of host.model.elements) {
                    if (!element.interactive) {
                        continue;
                    }
                    const bounds = element.getBounds();
                    if (!bounds) {
                        continue;
                    }
                    if (deltaX < 0 && deltaY < 0) {
                        if (host.rubberBandRegion.containsRegion(bounds) && !host.isSelected(element)) {
                            host.selectedElements.push(element);
                            itemsSelected = true;
                        }
                    }
                    else if (bounds.intersectsWith(host.rubberBandRegion) && !host.isSelected(element)) {
                        host.selectedElements.push(element);
                        itemsSelected = true;
                    }
                }
                if (itemsSelected) {
                    host.onSelectionChanged();
                }
                host.selecting = false;
            }
            else if (!host.cancelAction) {
                if (
                    host.elementCreated.hasListeners() &&
                    host.rubberBandRegion.width >= host.minElementSize.width &&
                    host.rubberBandRegion.height >= host.minElementSize.height
                ) {
                    host.elementCreated.trigger(host.controller, host.rubberBandRegion);
                }
            }
        }

        host.invalidate();

        if (host.cancelAction) {
            this.cancelInteraction(host);
            return;
        }

        this.commitInteraction(host);
    }

    private cancelInteraction(host: DesignMouseInteractionHost): void {
        if (host.pressedElement) {
            if (host.mouseUpElement.hasListeners()) {
                host.mouseUpElement.trigger(host.controller, host.pressedElement);
            }
            host.pressedElement = undefined;
        }

        if (host.isMoving) {
            host.clearElementMoveLocations();
            this.notifySelectedComponentSizes(host);
            host.isMoving = false;
            host.invalidate();
            return;
        }

        if (host.isResizing) {
            host.clearElementMoveLocations();
            host.clearElementResizeSizes();
            this.notifySelectedComponentSizes(host);
            host.sizeHandles = undefined;
            host.isResizing = false;
            host.invalidate();
            host.canvas!.style.cursor = 'crosshair';
            return;
        }

        if (host.isMovingPoint) {
            host.clearElementMoveLocations();
            host.clearElementResizeSizes();
            host.selectedElements.forEach((element) => {
                element.clearBounds();
            });
            host.activePointIndex = undefined;
            host.sizeHandles = undefined;
            host.isMovingPoint = false;
            host.movingPointLocation = undefined;
            host.invalidate();
            host.canvas!.style.cursor = 'crosshair';
            return;
        }

        if (host.isMovingCornerRadius) {
            const selectedHandle = host.sizeHandles && host.sizeHandles.length > 0 ? host.sizeHandles[0] : undefined;
            const originalRadii = host.getHandleCornerRadii(selectedHandle);
            if (selectedHandle?.element instanceof RectangleElement && originalRadii) {
                selectedHandle.element.setCornerRadii(
                    originalRadii[0],
                    originalRadii[1],
                    originalRadii[2],
                    originalRadii[3],
                );
            }
            host.sizeHandles = undefined;
            host.isMovingCornerRadius = false;
            host.invalidate();
            host.canvas!.style.cursor = 'crosshair';
            return;
        }

        if (host.isRotating) {
            if (host.selectedElements.length > 0) {
                host.selectedElements[0].transform = host.originalTransform;
            }
            host.sizeHandles = undefined;
            host.isRotating = false;
            host.originalTransform = undefined;
            host.invalidate();
            host.canvas!.style.cursor = 'crosshair';
            return;
        }

        if (host.isMovingPivot) {
            if (host.originalPivotCenter) {
                host.rotationCenter = new Point(host.originalPivotCenter.x, host.originalPivotCenter.y);
            }
            host.originalPivotCenter = undefined;
            host.sizeHandles = undefined;
            host.isMovingPivot = false;
            host.invalidate();
            host.canvas!.style.cursor = 'crosshair';
        }
    }

    private commitInteraction(host: DesignMouseInteractionHost): void {
        if (host.isMoving) {
            for (const selectedElement of host.selectedElements) {
                if (!selectedElement.canMove()) {
                    continue;
                }
                const moveLocation = host.getElementMoveLocation(selectedElement);
                selectedElement.setLocation(new Point(Math.round(moveLocation.x), Math.round(moveLocation.y)));
                const resizeSize = host.getElementResizeSize(selectedElement);
                selectedElement.setSize(new Size(Math.round(resizeSize.width), Math.round(resizeSize.height)));
                const bounds = selectedElement.getBounds();
                if (bounds) {
                    host.onElementMoved(selectedElement, new Point(bounds.x, bounds.y));
                    host.onElementSized(selectedElement, new Size(bounds.width, bounds.height));
                }
                host.invalidate();
            }
            host.isMoving = false;
            host.rotationCenter = undefined;
            host.commitUndoSnapshot();
            host.invalidate();
            return;
        }

        if (host.isResizing) {
            for (const selectedElement of host.selectedElements) {
                if (!selectedElement.canResize()) {
                    continue;
                }
                const oldBounds = selectedElement.getBounds();
                const moveLocation = host.getElementMoveLocation(selectedElement);
                const resizeSize = host.getElementResizeSize(selectedElement);

                if (oldBounds && selectedElement.transform && oldBounds.width > 0 && oldBounds.height > 0) {
                    const rotationCenter = selectedElement.getRotationCenter();
                    if (rotationCenter) {
                        const newCx = (rotationCenter.x / oldBounds.width) * resizeSize.width;
                        const newCy = (rotationCenter.y / oldBounds.height) * resizeSize.height;
                        if (selectedElement.isSimpleRotation()) {
                            const angle = selectedElement.getRotation();
                            selectedElement.setRotation(angle, newCx, newCy);
                        }
                        else {
                            const transform = selectedElement.transform.trim();
                            const parenIdx = transform.indexOf('(', transform.indexOf('(') + 1);
                            if (parenIdx !== -1) {
                                const base = transform.substring(0, parenIdx);
                                selectedElement.transform = `${base}(${newCx},${newCy}))`;
                            }
                        }
                    }
                }

                selectedElement.setLocation(new Point(Math.round(moveLocation.x), Math.round(moveLocation.y)));
                selectedElement.setSize(new Size(Math.round(resizeSize.width), Math.round(resizeSize.height)));
                const bounds = selectedElement.getBounds();
                if (bounds) {
                    host.onElementMoved(selectedElement, new Point(bounds.x, bounds.y));
                    host.onElementSized(selectedElement, new Size(bounds.width, bounds.height));
                }
                host.invalidate();
            }
            host.sizeHandles = undefined;
            host.isResizing = false;
            host.rotationCenter = undefined;
            host.commitUndoSnapshot();
            host.invalidate();
            host.canvas!.style.cursor = 'crosshair';
            return;
        }

        if (host.isMovingPoint && host.movingPointIndex !== undefined && host.movingPointLocation) {
            const selectedElement = host.selectedElements[0];
            let depth = PointDepth.Simple;
            if (host.selectedElementCount() === 1) {
                depth = PointDepth.Full;
            }
            selectedElement.setPointAt(
                host.movingPointIndex,
                new Point(Math.round(host.movingPointLocation.x), Math.round(host.movingPointLocation.y)),
                depth,
            );
            selectedElement.clearBounds();
            host.clearElementMoveLocations();
            host.clearElementResizeSizes();
            host.activePointIndex = host.movingPointIndex;
            host.sizeHandles = undefined;
            host.isMovingPoint = false;
            host.movingPointLocation = undefined;
            host.setIsDirty(true);
            host.commitUndoSnapshot();
            host.invalidate();
            host.canvas!.style.cursor = 'crosshair';
            return;
        }

        if (host.isMovingCornerRadius) {
            const selectedHandle = host.sizeHandles && host.sizeHandles.length > 0 ? host.sizeHandles[0] : undefined;
            let changed = false;
            const startRadii = host.getHandleCornerRadii(selectedHandle);
            if (selectedHandle?.element instanceof RectangleElement && startRadii) {
                const currentRadii = selectedHandle.element.cornerRadii
                    ? [
                        selectedHandle.element.cornerRadii[0],
                        selectedHandle.element.cornerRadii[1],
                        selectedHandle.element.cornerRadii[2],
                        selectedHandle.element.cornerRadii[3],
                    ]
                    : undefined;
                changed = !host.areCornerRadiiEqual(startRadii, currentRadii);
            }
            host.sizeHandles = undefined;
            host.isMovingCornerRadius = false;
            if (changed) {
                host.setIsDirty(true);
                host.commitUndoSnapshot();
            }
            host.invalidate();
            host.canvas!.style.cursor = 'crosshair';
            return;
        }

        if (host.isRotating) {
            if (host.selectedElements.length > 0) {
                const element = host.selectedElements[0];
                host.onElementRotated(element, element.getRotation());
            }
            host.sizeHandles = undefined;
            host.isRotating = false;
            host.rotationCenter = undefined;
            host.originalTransform = undefined;
            host.commitUndoSnapshot();
            host.invalidate();
            host.canvas!.style.cursor = 'crosshair';
            return;
        }

        if (host.isMovingPivot) {
            host.originalPivotCenter = undefined;
            host.sizeHandles = undefined;
            host.isMovingPivot = false;
            host.setIsDirty(true);
            host.commitUndoSnapshot();
            host.invalidate();
            host.canvas!.style.cursor = 'crosshair';
        }
    }

    private releasePressedElement(host: DesignMouseInteractionHost): void {
        if (!host.pressedElement) {
            return;
        }
        const element = host.pressedElement;
        if (host.mouseUpElement.hasListeners()) {
            host.mouseUpElement.trigger(host.controller, element);
        }
        if (element === host.mouseOverElement && host.elementClicked.hasListeners()) {
            host.elementClicked.trigger(host.controller, element);
        }
        host.pressedElement = undefined;
    }

    private notifySelectedComponentSizes(host: DesignMouseInteractionHost): void {
        host.selectedElements.forEach((element) => {
            if (element instanceof ComponentElement && element.component && element.component.size.hasListeners()) {
                const size = element.getSize();
                if (size) {
                    element.component.size.trigger(element.component, new ElementSizeProps(element, size));
                }
            }
        });
    }

    private transformDeltaToLocal(element: ElementBase, model: Model | undefined, deltaX: number, deltaY: number): Point {
        let localX = Math.round(deltaX);
        let localY = Math.round(deltaY);
        if (element.transform && model) {
            const bounds = element.getBounds();
            if (bounds) {
                const reference = new Point(bounds.x, bounds.y);
                const matrix = Matrix2D.fromTransformString(element.transform, reference);
                const inverse = matrix.inverse();
                const local = inverse.transformVector(deltaX, deltaY);
                localX = Math.round(local.x);
                localY = Math.round(local.y);
            }
        }
        return new Point(localX, localY);
    }
}