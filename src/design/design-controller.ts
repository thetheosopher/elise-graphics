import { ElementCommandHandler } from '../command/element-command-handler';
import { UndoManager, UndoState } from '../command/undo-manager';
import { IController } from '../controller/controller';
import { ControllerEvent, IControllerEvent } from '../controller/controller-event';
import { ControllerEventArgs } from '../controller/controller-event-args';
import { Color } from '../core/color';
import { ErrorMessages } from '../core/error-messages';
import { Logging } from '../core/logging';
import { Matrix2D } from '../core/matrix-2d';
import { Model } from '../core/model';
import { IMouseEvent } from '../core/mouse-event';
import { MouseEventArgs } from '../core/mouse-event-args';
import { MouseLocationArgs } from '../core/mouse-location-args';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import { PointEventParameters } from '../core/point-event-parameters';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { TimerParameters } from '../core/timer-parameters';
import { Utility } from '../core/utility';
import { ViewDragArgs } from '../core/view-drag-args';
import { ElementBase } from '../elements/element-base';
import type { ElementModel } from '../elements/element-base';
import { ElementCreationProps } from '../elements/element-creation-props';
import { ElementDragArgs } from '../elements/element-drag-args';
import { ElementLocationArgs } from '../elements/element-location-args';
import { ElementRotationArgs } from '../elements/element-rotation-args';
import { ElementSizeArgs } from '../elements/element-size-args';
import { ElementSizeProps } from '../elements/element-size-props';
import { MoveLocation } from '../elements/move-location';
import { RectangleElement } from '../elements/rectangle-element';
import { ResizeSize } from '../elements/resize-size';
import { Component } from './component/component';
import { ComponentElement } from './component/component-element';
import { ComponentRegistry } from './component/component-registry';
import { DesignRenderer } from './design-renderer';
import { GridType } from './grid-type';
import { Handle } from './handle';
import { HandleFactory } from './handle-factory';
import { DesignTool } from './tools/design-tool';

const log = Logging.log;

const EPSILON = 2e-23;

interface UndoSelectionState {
    id?: string;
    index: number;
    editPoints: boolean;
}

interface DesignUndoSnapshot {
    model: Model;
    selectedElements: UndoSelectionState[];
    isDirty: boolean;
    signature: string;
}

/**
 * Design controller for interactive element creation
 */
export class DesignController implements IController {
    /**
     * Global captured DesignController when mouse is down
     */
    public static captured?: DesignController;

    /**
     * Determines if a location and size are within the bounds of a model.
     * If an element transform is provided, the check uses the axis-aligned bounding
     * box of the transformed rectangle.
     * @param p - Point
     * @param s - Size
     * @param model - Model
     * @param transform - Optional element transform string
     */
    public static isInBounds(p: Point, s: Size, model: Model | ElementModel, transform?: string): boolean {
        const size = model.getSize();
        if (!size) {
            return false;
        }
        if (transform) {
            const tb = DesignController.getTransformedAABB(p, s, transform);
            return tb.x >= 0 && tb.y >= 0 && tb.x + tb.width <= size.width && tb.y + tb.height <= size.height;
        }
        if (p.x < 0 || p.y < 0) {
            return false;
        }
        if (p.x + s.width > size.width) {
            return false;
        }
        if (p.y + s.height > size.height) {
            return false;
        }
        return true;
    }

    /**
     * Returns the axis-aligned bounding box of a rectangle after applying a transform
     * @param location - Element location
     * @param s - Element size
     * @param transform - Transform string
     * @returns Axis-aligned bounding region in model space
     */
    public static getTransformedAABB(location: Point, s: Size, transform: string): Region {
        const mat = Matrix2D.fromTransformString(transform, location);
        const corners = [
            mat.transformPoint(new Point(location.x, location.y)),
            mat.transformPoint(new Point(location.x + s.width, location.y)),
            mat.transformPoint(new Point(location.x + s.width, location.y + s.height)),
            mat.transformPoint(new Point(location.x, location.y + s.height)),
        ];
        let minX = corners[0].x;
        let minY = corners[0].y;
        let maxX = corners[0].x;
        let maxY = corners[0].y;
        for (let i = 1; i < 4; i++) {
            if (corners[i].x < minX) {
                minX = corners[i].x;
            }
            if (corners[i].y < minY) {
                minY = corners[i].y;
            }
            if (corners[i].x > maxX) {
                maxX = corners[i].x;
            }
            if (corners[i].y > maxY) {
                maxY = corners[i].y;
            }
        }
        return new Region(minX, minY, maxX - minX, maxY - minY);
    }

    /**
     * Create a new view controller and canvas and bind to host DIV element
     * @param hostDiv - Host div element
     * @param model - Drawing model
     * @param scale - Rendering scale
     * @returns New design controller
     */
    public static initializeTarget(hostDiv: HTMLDivElement, model: Model, scale?: number): DesignController {
        log('Initializing view controller target');
        if (!hostDiv) {
            throw new Error(ErrorMessages.HostElementUndefined);
        }
        hostDiv.innerHTML = '';
        if (!hostDiv.id) {
            hostDiv.id = Utility.guid();
        }

        // Disable arrow/navigation keys to prevent scrolling
        // and allow handling in contained canvas
        const ar = [37, 38, 39, 40];

        // Change to use DOM 0 Style binding to prevent multiples
        hostDiv.onkeydown = (e) => {
            const key = e.which;
            ar.forEach((k) => {
                if (k === key) {
                    e.preventDefault();
                    return false;
                }
            });
            return true;
        };

        const controller = new DesignController();
        const designScale = scale === undefined ? 1 : scale;
        controller.setScale(designScale);
        controller.setModel(model);
        const canvas = controller.getCanvas();
        if (canvas) {
            hostDiv.appendChild(canvas);
            canvas.setAttribute('id', hostDiv.id + '_canvas');
        }
        const size = model.getSize();
        if (size) {
            hostDiv.style.width = size.width * designScale + 'px';
            hostDiv.style.height = size.height * designScale + 'px';
        }
        controller.draw();
        model.controllerAttached.trigger(model, controller);
        return controller;
    }

    /**
     * Fired when model is updated
     */
    public modelUpdated: IControllerEvent<Model> = new ControllerEvent<Model>();

    /**
     * Fired when enabled state is changed
     */
    public enabledChanged: IControllerEvent<boolean> = new ControllerEvent<boolean>();

    /**
     * Fired when mouse enters view
     */
    public mouseEnteredView: IControllerEvent<MouseEventArgs> = new ControllerEvent<MouseEventArgs>();

    /**
     * Fired when mouse leaves view
     */
    public mouseLeftView: IControllerEvent<MouseEventArgs> = new ControllerEvent<MouseEventArgs>();

    /**
     * Fired when mouse is pressed over view. Captures mouse activity.
     */
    public mouseDownView: IControllerEvent<PointEventParameters> = new ControllerEvent<PointEventParameters>();

    /**
     * Fired when mouse is released and mouse is captured.
     */
    public mouseUpView: IControllerEvent<PointEventParameters> = new ControllerEvent<PointEventParameters>();

    /**
     * Fired when mouse is moved over view
     */
    public mouseMovedView: IControllerEvent<PointEventParameters> = new ControllerEvent<PointEventParameters>();

    /**
     * Fired when mouse enters element bounds
     */
    public mouseEnteredElement: IControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when mouse leaves element bounds
     */
    public mouseLeftElement: IControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when mouse is pressed over element
     */
    public mouseDownElement: IControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when mouse is released over element
     */
    public mouseUpElement: IControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when mouse is pressed and released over an element
     */
    public elementClicked: IControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Period animation event timer fired when timer is enabled
     */
    public timer: ControllerEvent<TimerParameters> = new ControllerEvent<TimerParameters>();

    /**
     * Fired when elements are selected or deselected
     */
    public selectionChanged: IControllerEvent<number> = new ControllerEvent<number>();

    /**
     * Fired when element is drag created
     */
    public elementCreated: IControllerEvent<Region> = new ControllerEvent<Region>();

    /**
     * Fired when an element is added to the model
     */
    public elementAdded: IControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when an element is removed from the model
     */
    public elementRemoved: IControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when a delete request is trigger
     */
    public onDelete: IControllerEvent<ControllerEventArgs> = new ControllerEvent<ControllerEventArgs>();

    /**
     * Fired when an element is being moved
     */
    public elementMoving: IControllerEvent<ElementLocationArgs> = new ControllerEvent<ElementLocationArgs>();

    /**
     * Fired when an element has been moved
     */
    public elementMoved: IControllerEvent<ElementLocationArgs> = new ControllerEvent<ElementLocationArgs>();

    /**
     * Fired when an element is being sized
     */
    public elementSizing: IControllerEvent<ElementSizeArgs> = new ControllerEvent<ElementSizeArgs>();

    /**
     * Fired when an element has been sized
     */
    public elementSized: IControllerEvent<ElementSizeArgs> = new ControllerEvent<ElementSizeArgs>();

    /**
     * Fired when an element is being rotated
     */
    public elementRotating: IControllerEvent<ElementRotationArgs> = new ControllerEvent<ElementRotationArgs>();

    /**
     * Fired when an element has been rotated
     */
    public elementRotated: IControllerEvent<ElementRotationArgs> = new ControllerEvent<ElementRotationArgs>();

    /**
     * Fired when a mouse drag has started over the view
     */
    public viewDragEnter: IControllerEvent<ViewDragArgs> = new ControllerEvent<ViewDragArgs>();

    /**
     * Fired while a mouse drag is occurring over the view
     */
    public viewDragOver: IControllerEvent<ViewDragArgs> = new ControllerEvent<ViewDragArgs>();

    /**
     * Fired when a mouse drag has left the view
     */
    public viewDragLeave: IControllerEvent<ViewDragArgs> = new ControllerEvent<ViewDragArgs>();

    /**
     * Fired when a mouse drop has occurred on the view
     */
    public viewDrop: IControllerEvent<ViewDragArgs> = new ControllerEvent<ViewDragArgs>();

    /**
     * Fired when a mouse drag has entered an element
     */
    public elementDragEnter: IControllerEvent<ElementDragArgs> = new ControllerEvent<ElementDragArgs>();

    /**
     * Fired when a mouse drag has left an element
     */
    public elementDragLeave: IControllerEvent<ElementDragArgs> = new ControllerEvent<ElementDragArgs>();

    /**
     * Fired when a mouse drop occurs on an element
     */
    public elementDrop: IControllerEvent<ElementDragArgs> = new ControllerEvent<ElementDragArgs>();

    /**
     * Fired when elements are reordered
     */
    public elementsReordered: IControllerEvent<ElementBase[]> = new ControllerEvent<ElementBase[]>();

    /**
     * Fired when IsDirty state changes
     */
    public isDirtyChanged: IControllerEvent<boolean> = new ControllerEvent<boolean>();

    /**
     * Fired when undo/redo availability changes
     */
    public undoChanged: IControllerEvent<UndoState> = new ControllerEvent<UndoState>();

    /**
     * Controlled model
     */
    public model?: Model;

    /**
     * Canvas rendering target
     */
    public canvas?: HTMLCanvasElement;

    /**
     * User interaction enabled flag
     */
    public enabled: boolean;

    /**
     * Unsaved changed (dirty) flag
     */
    public isDirty: boolean;

    /**
     * True when an undo operation is available
     */
    public canUndo: boolean;

    /**
     * True when a redo operation is available
     */
    public canRedo: boolean;

    /**
     * Current mouse x position
     */
    public currentX?: number;

    /**
     * Current mouse y position
     */
    public currentY?: number;

    /**
     * Current drag rectangle width
     */
    public currentWidth?: number;

    /**
     * Current drag rectangle height
     */
    public currentHeight?: number;

    /**
     * Last mouse client X position
     */
    public lastClientX: number;

    /**
     * Last mouse client Y position
     */
    public lastClientY: number;

    /**
     * Active touch identifier while single-touch interaction is in progress
     */
    public activeTouchId?: number;

    /**
     * True while a two-finger gesture is active
     */
    public touchGestureActive: boolean;

    /**
     * Starting distance for the active pinch gesture
     */
    public gestureStartDistance?: number;

    /**
     * Starting scale for the active pinch gesture
     */
    public gestureStartScale?: number;

    /**
     * Last gesture center in client coordinates for panning
     */
    public gestureLastCenter?: Point;

    /**
     * True when mouse is down and captured over view
     */
    public isMouseDown: boolean;

    /**
     * True when elements are being moved
     */
    public isMoving: boolean;

    /**
     * True when elements are being resized
     */
    public isResizing: boolean;

    /**
     * True when element is being rotated
     */
    public isRotating: boolean;

    /**
     * True when pivot handle is being moved
     */
    public isMovingPivot: boolean;

    /**
     * True when point container point is being moved
     */
    public isMovingPoint: boolean;

    /**
     * True when a rectangle corner radius handle is being dragged.
     */
    public isMovingCornerRadius: boolean;

    /**
     * True when drag operation is in effect
     */
    public isDragging: boolean;

    /**
     * Index of point into current element being moved
     */
    public movingPointIndex?: number;

    /**
     * Location at which mouse was pressed
     */
    public mouseDownPosition?: Point;

    /**
     * Topmost element at mouse location
     */
    public mouseOverElement?: ElementBase;

    /**
     * Topmost element over which mouse was pressed
     */
    public pressedElement?: ElementBase;

    /**
     * Topmost element over which mouse drag is occurring
     */
    public dragOverElement?: ElementBase;

    /**
     * Last mouse movement X delta
     */
    public lastDeltaX: number;

    /**
     * Last mouse movement Y delta
     */
    public lastDeltaY: number;

    /**
     * Selected element array
     */
    public selectedElements: ElementBase[] = [];

    /**
     * True when drag selecting
     */
    public selecting: boolean;

    /**
     * Sizing handle array for selected elements
     */
    public sizeHandles?: Handle[];

    /**
     * Location of point container point in motion
     */
    public movingPointLocation?: Point;

    /**
     * Rotation center (pivot) in canvas coordinates
     */
    public rotationCenter?: Point;

    /**
     * Original pivot center at drag start for cumulative delta tracking
     */
    public originalPivotCenter?: Point;

    /**
     * Angle from rotation center to mouse at drag start (radians)
     */
    public rotationStartAngle: number;

    /**
     * Element rotation angle at drag start (degrees)
     */
    public originalRotation: number;

    /**
     * Element transform string before rotation started (for cancel)
     */
    public originalTransform?: string;

    /**
     * Array of tentative sizes for elements being sized
     */
    public elementResizeSizes: ResizeSize[] = [];

    /**
     * Array of tentative locations for elements being sized or moved
     */
    public elementMoveLocations: MoveLocation[] = [];

    /**
     * True when rubber band is active
     */
    public rubberBandActive: boolean;

    /**
     * Rubber band rectangle region
     */
    public rubberBandRegion?: Region;

    /**
     * Snap element move and size actions to grid
     */
    public snapToGrid: boolean;

    /**
     * Design grid spacing
     */
    public gridSpacing: number;

    /**
     * Lock aspect ratio of resized items
     */
    public lockAspect: boolean;

    /**
     * Constrain elements to model bounds
     */
    public constrainToBounds: boolean;

    /**
     * Minimum size to which elements can be sized
     */
    public minElementSize: Size = new Size(4, 4);

    /**
     * Design surface grid type
     */
    public gridType: GridType = GridType.Lines;

    /**
     * Design surface grid color as string
     */
    public gridColor: string;

    /**
     * Design surface disabled state fill
     */
    public disabledFill?: string;

    /**
     * Cancel mouse action flag
     */
    public cancelAction: boolean;

    /**
     * True when selection is enabled
     */
    public selectionEnabled: boolean;

    /**
     * Rendering scale
     */
    public scale: number;

    /**
     * True when redraw is required
     */
    public needsRedraw: boolean;

    /**
     * Design renderer
     */
    public renderer?: DesignRenderer;

    /**
     * Large keyboard nudge amount
     */
    public largeJump: number;

    /**
     * Active element creation component
     */
    public activeComponent?: Component;

    /**
     * Active element creation tool
     */
    public activeTool?: DesignTool;

    /**
     * Element creation fill image
     */
    public fillImage?: HTMLImageElement;

    /**
     * Last frame render time
     */
    public lastFrameTime?: number;

    /**
     * Command handler for handling routed events
     */
    public commandHandler?: ElementCommandHandler;

    private undoManager: UndoManager<DesignUndoSnapshot>;
    private restoringUndoState: boolean;
    private pendingToolHistoryBaseline?: string;

    /**
     * Manages rendering and interaction with rendered model content
     */
    constructor() {
        this.setModel = this.setModel.bind(this);
        this.setEnabled = this.setEnabled.bind(this);
        this.undo = this.undo.bind(this);
        this.redo = this.redo.bind(this);
        this.addElement = this.addElement.bind(this);
        this.removeElement = this.removeElement.bind(this);
        this.removeSelected = this.removeSelected.bind(this);
        this.addComponentElement = this.addComponentElement.bind(this);
        this.getCanvas = this.getCanvas.bind(this);
        this.drawIfNeeded = this.drawIfNeeded.bind(this);
        this.createCanvas = this.createCanvas.bind(this);
        this.detach = this.detach.bind(this);
        this.setScale = this.setScale.bind(this);
        this.windowToCanvas = this.windowToCanvas.bind(this);
        this.windowMouseUp = this.windowMouseUp.bind(this);
        this.windowMouseMove = this.windowMouseMove.bind(this);
        this.windowTouchEnd = this.windowTouchEnd.bind(this);
        this.windowTouchMove = this.windowTouchMove.bind(this);
        this.windowTouchCancel = this.windowTouchCancel.bind(this);
        this.onCanvasMouseEnter = this.onCanvasMouseEnter.bind(this);
        this.onCanvasMouseLeave = this.onCanvasMouseLeave.bind(this);
        this.onCanvasMouseDown = this.onCanvasMouseDown.bind(this);
        this.onCanvasMouseMove = this.onCanvasMouseMove.bind(this);
        this.onCanvasMouseUp = this.onCanvasMouseUp.bind(this);
        this.onCanvasTouchStart = this.onCanvasTouchStart.bind(this);
        this.onCanvasTouchMove = this.onCanvasTouchMove.bind(this);
        this.onCanvasTouchEnd = this.onCanvasTouchEnd.bind(this);
        this.onCanvasTouchCancel = this.onCanvasTouchCancel.bind(this);
        this.onCanvasKeyDown = this.onCanvasKeyDown.bind(this);
        this.onCanvasDragEnter = this.onCanvasDragEnter.bind(this);
        this.onCanvasDragOver = this.onCanvasDragOver.bind(this);
        this.onCanvasDragLeave = this.onCanvasDragLeave.bind(this);
        this.onCanvasDrop = this.onCanvasDrop.bind(this);
        this.ensureInBounds = this.ensureInBounds.bind(this);
        this.setMouseDownElement = this.setMouseDownElement.bind(this);
        this.setMouseOverElement = this.setMouseOverElement.bind(this);
        this.setDragOverElement = this.setDragOverElement.bind(this);
        this.onSelectionChanged = this.onSelectionChanged.bind(this);
        this.onElementAdded = this.onElementAdded.bind(this);
        this.onElementRemoved = this.onElementRemoved.bind(this);
        this.onModelUpdated = this.onModelUpdated.bind(this);
        this.onElementSizing = this.onElementSizing.bind(this);
        this.onElementSized = this.onElementSized.bind(this);
        this.setElementLocation = this.setElementLocation.bind(this);
        this.onElementMoved = this.onElementMoved.bind(this);
        this.renderGrid = this.renderGrid.bind(this);
        this.drawDashedLine = this.drawDashedLine.bind(this);
        this.getElementHandles = this.getElementHandles.bind(this);
        this.drawRubberBand = this.drawRubberBand.bind(this);
        this.drawHotspot = this.drawHotspot.bind(this);
        this.drawDashedHorizontalLine = this.drawDashedHorizontalLine.bind(this);
        this.drawDashedVerticalLine = this.drawDashedVerticalLine.bind(this);
        this.drawHorizontalLine = this.drawHorizontalLine.bind(this);
        this.drawVerticalLine = this.drawVerticalLine.bind(this);
        this.drawGuidewires = this.drawGuidewires.bind(this);
        this.draw = this.draw.bind(this);
        this.calculateFPS = this.calculateFPS.bind(this);
        this.invalidate = this.invalidate.bind(this);
        this.selectedElementCount = this.selectedElementCount.bind(this);
        this.selectedElement = this.selectedElement.bind(this);
        this.clearSelections = this.clearSelections.bind(this);
        this.isSelected = this.isSelected.bind(this);
        this.selectElement = this.selectElement.bind(this);
        this.deselectElement = this.deselectElement.bind(this);
        this.toggleSelected = this.toggleSelected.bind(this);
        this.selectAll = this.selectAll.bind(this);
        this.selectElements = this.selectElements.bind(this);
        this.onElementsReordered = this.onElementsReordered.bind(this);
        this.moveElementToBottom = this.moveElementToBottom.bind(this);
        this.moveElementToTop = this.moveElementToTop.bind(this);
        this.moveElementBackward = this.moveElementBackward.bind(this);
        this.moveElementForward = this.moveElementForward.bind(this);
        this.sendToBack = this.sendToBack.bind(this);
        this.bringToFront = this.bringToFront.bind(this);
        this.sendBackward = this.sendBackward.bind(this);
        this.bringForward = this.bringForward.bind(this);
        this.alignSelectedHorizontally = this.alignSelectedHorizontally.bind(this);
        this.alignSelectedVertically = this.alignSelectedVertically.bind(this);
        this.resizeSelectedToSameWidth = this.resizeSelectedToSameWidth.bind(this);
        this.resizeSelectedToSameHeight = this.resizeSelectedToSameHeight.bind(this);
        this.resizeSelectedToSameSize = this.resizeSelectedToSameSize.bind(this);
        this.duplicateSelectedElements = this.duplicateSelectedElements.bind(this);
        this.removeUnusedResourcesFromResourceManager = this.removeUnusedResourcesFromResourceManager.bind(this);
        this.movableSelectedElementCount = this.movableSelectedElementCount.bind(this);
        this.resizeableSelectedElementCount = this.resizeableSelectedElementCount.bind(this);
        this.nudgeableSelectedElementCount = this.nudgeableSelectedElementCount.bind(this);
        this.clearElementResizeSizes = this.clearElementResizeSizes.bind(this);
        this.setElementResizeSize = this.setElementResizeSize.bind(this);
        this.getElementResizeSize = this.getElementResizeSize.bind(this);
        this.clearElementMoveLocations = this.clearElementMoveLocations.bind(this);
        this.setElementMoveLocation = this.setElementMoveLocation.bind(this);
        this.getElementMoveLocation = this.getElementMoveLocation.bind(this);
        this.nudgeSize = this.nudgeSize.bind(this);
        this.nudgeLocation = this.nudgeLocation.bind(this);
        this.setSelectedRectangleCornerRadius = this.setSelectedRectangleCornerRadius.bind(this);
        this.setSelectedRectangleCornerRadii = this.setSelectedRectangleCornerRadii.bind(this);
        this.setRubberBandActive = this.setRubberBandActive.bind(this);
        this.setRubberBandRegion = this.setRubberBandRegion.bind(this);
        this.setGridType = this.setGridType.bind(this);
        this.setGridSpacing = this.setGridSpacing.bind(this);
        this.setGridColor = this.setGridColor.bind(this);
        this.bindTarget = this.bindTarget.bind(this);
        this.onElementRotating = this.onElementRotating.bind(this);
        this.onElementRotated = this.onElementRotated.bind(this);
        this.commitUndoSnapshot = this.commitUndoSnapshot.bind(this);
        this.beginToolHistorySession = this.beginToolHistorySession.bind(this);
        this.finalizeToolHistorySession = this.finalizeToolHistorySession.bind(this);

        this.enabled = true;
        this.scale = 1.0;
        this.lastDeltaX = -1;
        this.lastDeltaY = -1;
        this.isDirty = false;
        this.isMouseDown = false;
        this.isMoving = false;
        this.isResizing = false;
        this.isRotating = false;
        this.isMovingPivot = false;
        this.isMovingPoint = false;
        this.isMovingCornerRadius = false;
        this.isDragging = false;
        this.lastClientX = -1;
        this.lastClientY = -1;
        this.activeTouchId = undefined;
        this.touchGestureActive = false;
        this.selecting = false;
        this.rubberBandActive = false;
        this.snapToGrid = false;
        this.gridSpacing = 8;
        this.lockAspect = true;
        this.constrainToBounds = true;
        this.gridColor = 'Black';
        this.cancelAction = false;
        this.selectionEnabled = true;
        this.needsRedraw = false;
        this.largeJump = 10;
        this.rotationStartAngle = 0;
        this.originalRotation = 0;
        this.canUndo = false;
        this.canRedo = false;
        this.undoManager = new UndoManager<DesignUndoSnapshot>();
        this.restoringUndoState = false;
    }

    /**
     * Sets controller model
     */
    public setModel(model: Model): void {
        if (model === this.model) {
            return;
        }
        if (this.model) {
            this.model.controllerDetached.trigger(this.model, this);
            if (this.model.controller === this) {
                this.model.controller = undefined;
            }
        }
        log('Setting design controller model');
        this.model = model;
        this.model.controller = this;
        this.currentX = undefined;
        this.currentY = undefined;
        this.currentWidth = undefined;
        this.currentHeight = undefined;

        this.isMouseDown = false;
        this.isMoving = false;
        this.isResizing = false;
        this.isRotating = false;
        this.isMovingPivot = false;
        this.isMovingPoint = false;
        this.isMovingCornerRadius = false;
        this.isDragging = false;
        this.mouseDownPosition = undefined;
        this.mouseOverElement = undefined;
        this.pressedElement = undefined;
        this.dragOverElement = undefined;
        this.lastDeltaX = -1;
        this.lastDeltaY = -1;
        this.activeTouchId = undefined;
        this.touchGestureActive = false;
        this.gestureStartDistance = undefined;
        this.gestureStartScale = undefined;
        this.gestureLastCenter = undefined;

        this.selectedElements = [];
        this.selecting = false;
        this.sizeHandles = undefined;
        this.movingPointLocation = undefined;
        this.rotationCenter = undefined;
        this.originalPivotCenter = undefined;
        this.rotationStartAngle = 0;
        this.originalRotation = 0;
        this.originalTransform = undefined;
        this.elementResizeSizes = [];
        this.elementMoveLocations = [];
        this.rubberBandActive = false;
        this.rubberBandRegion = undefined;

        if (!this.canvas) {
            this.createCanvas();
        } else {
            const size = model.getSize();
            if (!size) {
                throw new Error(ErrorMessages.SizeUndefined);
            }
            const width = size.width * this.scale;
            const height = size.height * this.scale;
            this.canvas.width = width;
            this.canvas.height = height;
            const element = this.canvas.parentElement;
            if (element) {
                element.style.width = width + 'px';
                element.style.height = height + 'px';
            }
        }

        if (this.model.elements) {
            this.model.elements.forEach((element) => {
                if (element.interactive === undefined) {
                    element.interactive = true;
                }
            });
        }
        this.pendingToolHistoryBaseline = undefined;
        this.resetUndoHistory();
    }

    /**
     * Sets enabled state with optional disabled state overlay fill
     * @param enabled - User interactivity enabled state
     * @param disabledFill - Optional disabled state fill as string
     */
    public setEnabled(enabled: boolean, disabledFill?: string): void {
        if (enabled === this.enabled) {
            return;
        }
        this.enabled = enabled;
        if (disabledFill !== undefined) {
            this.disabledFill = disabledFill;
        }
        if (!enabled) {
            if (this.isMouseDown) {
                this.cancelAction = true;
                this.onCanvasMouseUp({ clientX: this.lastClientX, clientY: this.lastClientY });
            }
            if (this.isDragging) {
                this.onCanvasDragLeave(undefined);
            }
        }
        this.draw();
        if (this.enabledChanged) {
            this.enabledChanged.trigger(this, this.enabled);
        }
    }

    public clearActiveTool() {
        if (this.activeTool) {
            this.activeTool.cancel();
            this.finalizeToolHistorySession();
            this.activeTool.controller = undefined;
            this.activeTool.model = undefined;
            this.activeTool = undefined;
        }
    }

    public setActiveTool(tool: DesignTool) {
        this.clearSelections();
        if (this.activeTool) {
            this.activeTool.cancel();
            this.finalizeToolHistorySession();
            this.activeTool.controller = undefined;
            this.activeTool.model = undefined;
        }
        tool.model = this.model;
        tool.controller = this;
        this.activeTool = tool;
    }

    /**
     * Adds an element to the model
     * @param el - Element to add
     */
    public addElement(el: ElementBase): void {
        if (el.interactive === undefined) {
            el.interactive = true;
        }
        if (this.model) {
            this.model.add(el);
        }
        if (this.constrainToBounds) {
            this.ensureInBounds(el);
        }
        this.onElementAdded(el);
        this.onModelUpdated();
        this.commitUndoSnapshot();
        this.drawIfNeeded();
    }

    /**
     * Removed an element from the model
     * @param el - Element to remove
     */
    public removeElement(el: ElementBase): void {
        if (this.model) {
            const index = this.model.remove(el);
            if (index !== -1) {
                this.onElementRemoved(el);
                this.deselectElement(el);
                this.onModelUpdated();
                this.commitUndoSnapshot();
                this.drawIfNeeded();
            }
        }
    }

    /**
     * Removes all selected elements
     */
    public removeSelected(): void {
        const self = this;
        let itemsRemoved = false;
        self.selectedElements.forEach((el) => {
            if (self.model) {
                const index = self.model.remove(el);
                if (index !== -1) {
                    itemsRemoved = true;
                    self.onElementRemoved(el);
                }
            }
        });
        if (itemsRemoved) {
            self.selectedElements = [];
            self.onSelectionChanged();
            self.onModelUpdated();
            self.commitUndoSnapshot();
            self.drawIfNeeded();
        }
    }

    /**
     * Adds a new component element to the model
     * @param type - Type of component element to add
     * @param id - New element id
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param width - Width
     * @param height - Height
     * @param props - Element creation props
     * @param callback - Element created callback (element: Elise.ElementBase)
     */
    public addComponentElement(
        type: string,
        id: string,
        x: number,
        y: number,
        width: number,
        height: number,
        props: ElementCreationProps,
        callback: (element: ElementBase) => void,
    ) {
        const self = this;
        const component = ComponentRegistry.getComponent(type);
        if (!component) {
            throw new Error(ErrorMessages.ComponentTypeNotRegistered + ': ' + type);
        }
        if (self.model) {
            const el = component.CreateElement(self.model, id, x, y, width, height, props);
            el.interactive = true;
            self.model.prepareResources(undefined, (success) => {
                if (success) {
                    self.onElementAdded(el);
                    self.onModelUpdated();
                    self.commitUndoSnapshot();
                    self.drawIfNeeded();
                    if (callback) {
                        callback(el);
                    }
                } else {
                    throw new Error(ErrorMessages.ResourcesFailedToLoad);
                }
            });
        }
    }

    /**
     * Creates if necessary and returns canvas element
     */
    public getCanvas(): HTMLCanvasElement | undefined {
        if (!this.canvas) {
            this.createCanvas();
        }
        return this.canvas;
    }

    /**
     * Renders to canvas if needed and clears redraw flag
     */
    public drawIfNeeded(): void {
        if (this.needsRedraw) {
            this.draw();
            this.needsRedraw = false;
        }
    }

    /**
     * Creates canvas for model at current scale and attached event handlers
     */
    public createCanvas() {
        log('Creating canvas and attaching event handlers');
        const self = this;
        if (!self.model) {
            return;
        }
        const size = self.model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        const canvas = document.createElement('canvas');
        canvas.width = size.width * self.scale;
        canvas.height = size.height * self.scale;
        canvas.setAttribute('tabindex', '0');
        canvas.style.touchAction = 'none';

        canvas.addEventListener('mouseenter', self.onCanvasMouseEnter);
        canvas.addEventListener('mouseleave', self.onCanvasMouseLeave);
        canvas.addEventListener('mousedown', self.onCanvasMouseDown);
        canvas.addEventListener('mousemove', self.onCanvasMouseMove);
        canvas.addEventListener('touchstart', self.onCanvasTouchStart, { passive: false });
        canvas.addEventListener('touchmove', self.onCanvasTouchMove, { passive: false });
        canvas.addEventListener('touchend', self.onCanvasTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', self.onCanvasTouchCancel, { passive: false });
        canvas.addEventListener('keydown', self.onCanvasKeyDown);
        canvas.addEventListener('dragenter', self.onCanvasDragEnter);
        canvas.addEventListener('dragover', self.onCanvasDragOver);
        canvas.addEventListener('dragleave', self.onCanvasDragLeave);
        canvas.addEventListener('drop', self.onCanvasDrop);

        self.canvas = canvas;
        self.renderer = new DesignRenderer(self);
    }

    /**
     * Detaches and destroys current canvas
     */
    public detach(): void {
        if (this.model) {
            if (this.model.controller === this) {
                this.model.controller = undefined;
            }
            this.model.controllerDetached.trigger(this.model, this);
            this.model.controllerDetached.clear();
            this.model.controllerAttached.clear();
        }
        window.removeEventListener('touchend', this.windowTouchEnd, true);
        window.removeEventListener('touchmove', this.windowTouchMove, true);
        window.removeEventListener('touchcancel', this.windowTouchCancel, true);
        if (!this.canvas) {
            return;
        }
        log('Detaching event handlers and destroying canvas');
        this.canvas.removeEventListener('mouseenter', this.onCanvasMouseEnter);
        this.canvas.removeEventListener('mouseleave', this.onCanvasMouseLeave);
        this.canvas.removeEventListener('mousedown', this.onCanvasMouseDown);
        this.canvas.removeEventListener('mousemove', this.onCanvasMouseMove);
        this.canvas.removeEventListener('touchstart', this.onCanvasTouchStart);
        this.canvas.removeEventListener('touchmove', this.onCanvasTouchMove);
        this.canvas.removeEventListener('touchend', this.onCanvasTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.onCanvasTouchCancel);
        this.canvas.removeEventListener('keydown', this.onCanvasKeyDown);
        this.canvas.removeEventListener('dragenter', this.onCanvasDragEnter);
        this.canvas.removeEventListener('dragover', this.onCanvasDragOver);
        this.canvas.removeEventListener('dragleave', this.onCanvasDragLeave);
        this.canvas.removeEventListener('drop', this.onCanvasDrop);
        const element = this.canvas.parentElement;
        if (element) {
            element.removeChild(this.canvas);
        }
        this.modelUpdated.clear();
        this.enabledChanged.clear();
        this.mouseEnteredView.clear();
        this.mouseLeftView.clear();
        this.mouseDownView.clear();
        this.mouseUpView.clear();
        this.mouseMovedView.clear();
        this.mouseEnteredElement.clear();
        this.mouseLeftElement.clear();
        this.mouseDownElement.clear();
        this.mouseUpElement.clear();
        this.elementClicked.clear();
        this.timer.clear();
        this.selectionChanged.clear();
        this.elementCreated.clear();
        this.elementAdded.clear();
        this.elementRemoved.clear();
        this.onDelete.clear();
        this.elementMoving.clear();
        this.elementMoved.clear();
        this.elementSizing.clear();
        this.elementSized.clear();
        this.elementRotating.clear();
        this.elementRotated.clear();
        this.viewDragEnter.clear();
        this.viewDragOver.clear();
        this.viewDragLeave.clear();
        this.viewDrop.clear();
        this.elementDragEnter.clear();
        this.elementDragLeave.clear();
        this.elementDrop.clear();
        this.elementsReordered.clear();
        this.isDirtyChanged.clear();
        this.undoChanged.clear();
        this.canvas = undefined;
    }

    public undo(): boolean {
        if (!this.canApplyUndoRedo()) {
            return false;
        }
        const snapshot = this.undoManager.undo();
        if (!snapshot) {
            this.updateUndoAvailability();
            return false;
        }
        this.applyUndoSnapshot(snapshot);
        return true;
    }

    public redo(): boolean {
        if (!this.canApplyUndoRedo()) {
            return false;
        }
        const snapshot = this.undoManager.redo();
        if (!snapshot) {
            this.updateUndoAvailability();
            return false;
        }
        this.applyUndoSnapshot(snapshot);
        return true;
    }

    /**
     * Changes design surface rendering scale
     * @param scale - New rendering scale
     */
    public setScale(scale: number, force?: boolean): void {
        if (scale === this.scale && !force) {
            return;
        }
        this.scale = scale;
        if (this.canvas) {
            if (this.model) {
                const size = this.model.getSize();
                if (!size) {
                    throw new Error(ErrorMessages.SizeUndefined);
                }
                const width = size.width * scale;
                const height = size.height * scale;
                this.canvas.width = width;
                this.canvas.height = height;
                const element = this.canvas.parentElement;
                if (element) {
                    element.style.width = width + 'px';
                    element.style.height = height + 'px';
                }
                this.draw();
            }
        }
    }

    public getNearestSnapX(newX: number) {
        let diff = newX % this.gridSpacing;
        if (diff > EPSILON) {
            if (diff < this.gridSpacing / 2) {
                newX -= diff;
            } else {
                diff = this.gridSpacing - diff;
                newX += diff;
            }
            return newX;
        } else {
            return newX;
        }
    }

    public getNearestSnapY(newY: number) {
        let diff = newY % this.gridSpacing;
        if (diff > EPSILON) {
            if (diff < this.gridSpacing / 2) {
                newY -= diff;
            } else {
                diff = this.gridSpacing - diff;
                newY += diff;
            }
            return newY;
        } else {
            return newY;
        }
    }

    /**
     * Translates raw window coordinates to model coordinates
     * compensating for current scale and origin offset
     * @param x - Raw x coordinate
     * @param y - Raw y coordinate
     */
    public windowToCanvas(x: number, y: number): Point {
        if (!this.canvas) {
            return new Point(x, y);
        }
        const bounds = this.canvas.getBoundingClientRect();
        return new Point(
            Math.round((x - bounds.left * (this.canvas.width / bounds.width)) / this.scale),
            Math.round((y - bounds.top * (this.canvas.height / bounds.height)) / this.scale),
        );
    }

    /**
     * Handles captured mouse up event
     * @param e - Window mouse up event
     */
    public windowMouseUp(e: MouseEvent): void {
        const captured = DesignController.captured;
        if (captured) {
            log(`Window mouse up ${e.clientX}:${e.clientY}`);
            captured.onCanvasMouseUp(e);
            captured.drawIfNeeded();
            window.removeEventListener('mouseup', captured.windowMouseUp, true);
            window.removeEventListener('mousemove', captured.windowMouseMove, true);
            DesignController.captured = undefined;
        }
    }

    /**
     * Handles captured mouse move event
     * @param e - Window mouse up event
     */
    public windowMouseMove(e: MouseEvent): void {
        const captured = DesignController.captured;
        if (captured) {
            log(`Window mouse move ${e.clientX}:${e.clientY}`);
            e.preventDefault();
            e.stopPropagation();
            captured.onCanvasMouseMove(e);
            captured.drawIfNeeded();
        }
    }

    /**
     * Handles captured touch end event.
     * @param e - Window touch end event
     */
    public windowTouchEnd(e: TouchEvent): void {
        this.onCanvasTouchEnd(e);
        this.drawIfNeeded();
    }

    /**
     * Handles captured touch move event.
     * @param e - Window touch move event
     */
    public windowTouchMove(e: TouchEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.onCanvasTouchMove(e);
        this.drawIfNeeded();
    }

    /**
     * Handles captured touch cancel event.
     * @param e - Window touch cancel event
     */
    public windowTouchCancel(e: TouchEvent): void {
        this.onCanvasTouchCancel(e);
        this.drawIfNeeded();
    }

    /**
     * Handles canvas mouse enter event
     * @param e - DOM mouse event
     */
    public onCanvasMouseEnter(e: MouseEvent): void {
        log('Canvas mouse enter');
        if (!this.enabled) {
            return;
        }
        if (this.mouseEnteredView.hasListeners()) {
            this.mouseEnteredView.trigger(this, new MouseEventArgs(e));
        }
        this.drawIfNeeded();
    }

    /**
     * Handles canvas mouse leave event
     * @param e - DOM mouse event
     */
    public onCanvasMouseLeave(e: MouseEvent): void {
        log('Canvas mouse leave');
        if (!this.enabled) {
            return;
        }
        if (this.mouseLeftView.hasListeners()) {
            this.mouseLeftView.trigger(this, new MouseEventArgs(e));
        }
        this.drawIfNeeded();
    }

    /**
     * Handles canvas mouse down event
     * @param e - Mouse event
     */
    public onCanvasMouseDown(e: MouseEvent | IMouseEvent): void {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!this.canvas) {
            return;
        }
        log(`Canvas mouse down ${e.clientX}:${e.clientY}`);
        DesignController.captured = this;
        window.addEventListener('mouseup', this.windowMouseUp, true);
        window.addEventListener('mousemove', this.windowMouseMove, true);
        if (!this.enabled) {
            return;
        }
        const p = this.windowToCanvas(e.clientX, e.clientY);
        const context = this.canvas.getContext('2d');
        if (!context) {
            return;
        }

        // Set current location and empty width/height
        this.currentX = p.x;
        this.currentY = p.y;
        this.currentWidth = 0;
        this.currentHeight = 0;
        this.mouseDownPosition = new Point(p.x, p.y);
        this.isMouseDown = true;

        // Get button clicked (0 = Left)
        const button = e.button;

        // If we have an active tool
        if (this.activeTool) {
            // If it's creating and right button pressed, cancel and return
            if (this.activeTool.isCreating && button === 2) {
                this.activeTool.cancel();
                this.finalizeToolHistorySession();
                e.preventDefault?.();
                e.stopPropagation?.();
                this.isMouseDown = false;
                this.draw();
                return;
            }

            // If not right mouse button, pass to tool
            if (button !== 2) {
                if (!this.activeTool.isCreating) {
                    this.beginToolHistorySession();
                }
                this.activeTool.mouseDown(new MouseLocationArgs(e, new Point(p.x, p.y)));
            }

            // Fire mouse down event
            if (this.mouseDownView.hasListeners()) {
                this.mouseDownView.trigger(this, new PointEventParameters(e, new Point(p.x, p.y)));
            }

            return;
        }

        // Fire mouse down event
        if (this.mouseDownView.hasListeners()) {
            this.mouseDownView.trigger(this, new PointEventParameters(e, new Point(p.x, p.y)));
        }

        // Set active element if any at location
        const activeElement = this.model.firstActiveElementAt(context, p.x, p.y);
        this.setMouseDownElement(activeElement);

        // Clear cancel action flag
        this.cancelAction = false;

        // Left button
        if (button === 0 || button === 2) {
            let foundHandle = false;
            let selectedHandle: Handle | undefined;

            for (const el of this.selectedElements) {
                const handles = this.getElementHandles(el);

                // If element is transformed, hit test against transformed rectangles
                if (el.transform) {
                    context.save();
                    const b = el.getBounds();
                    if (!b) {
                        continue;
                    }
                    let reference = new Point(b.x, b.y);
                    if (this.isMoving && el.canMove()) {
                        reference = this.getElementMoveLocation(el);
                    } else if (this.isResizing && el.canResize()) {
                        reference = this.getElementMoveLocation(el);
                    }
                    this.model.setRenderTransform(context, el.transform, reference);
                    for (const h of handles) {
                        context.beginPath();
                        if (h.region) {
                            context.rect(h.region.x, h.region.y, h.region.width, h.region.height);
                        }
                        const hit = context.isPointInPath(p.x, p.y);
                        context.closePath();
                        if (hit) {
                            this.canvas.style.cursor = h.cursor;
                            foundHandle = true;
                            selectedHandle = h;
                            break;
                        }
                    }
                    context.restore();
                } else {
                    // No element transform, so test handle regions
                    for (const h of handles) {
                        const hr = h.region;
                        if (!hr) {
                            continue;
                        }
                        let hit = hr.containsCoordinate(p.x, p.y);
                        if (!hit) {
                            if (h.barRegion && h.barRegion.containsCoordinate(p.x, p.y)) {
                                hit = true;
                            }
                        }
                        if (hit) {
                            this.canvas.style.cursor = h.cursor;
                            selectedHandle = h;
                            foundHandle = true;
                            break;
                        }
                    }
                    if (foundHandle) {
                        break;
                    }
                }
            }

            // If handle found put in resizing mode
            if (foundHandle && button === 0 && selectedHandle) {
                // If multiple elements selected
                this.sizeHandles = [];

                // Check for rotation or pivot handle
                const hid = selectedHandle.handleId;
                if (typeof hid === 'string' && hid.startsWith('rotate-')) {
                    this.sizeHandles.push(selectedHandle);
                    this.isRotating = true;
                    const el = selectedHandle.element;
                    const b = el.getBounds();
                    if (b) {
                        // Determine rotation center in canvas space
                        if (!this.rotationCenter) {
                            const rc = el.getRotationCenter();
                            if (rc) {
                                this.rotationCenter = new Point(b.x + rc.x, b.y + rc.y);
                            } else {
                                this.rotationCenter = new Point(b.x + b.width / 2, b.y + b.height / 2);
                            }
                        }
                        // Transform local center to canvas space for angle calculation
                        let canvasCenter = new Point(this.rotationCenter.x, this.rotationCenter.y);
                        if (el.transform) {
                            const mat = Matrix2D.fromTransformString(el.transform, new Point(b.x, b.y));
                            canvasCenter = mat.transformPoint(this.rotationCenter);
                        }
                        this.rotationStartAngle = Math.atan2(p.y - canvasCenter.y, p.x - canvasCenter.x);
                        this.originalRotation = el.getRotation();
                        this.originalTransform = el.transform;
                    }
                    return;
                } else if (typeof hid === 'string' && hid === 'pivot') {
                    this.sizeHandles.push(selectedHandle);
                    this.isMovingPivot = true;
                    // Initialize rotation center from element or default
                    const pivotEl = selectedHandle.element;
                    const pivotBounds = pivotEl.getBounds();
                    if (pivotBounds) {
                        if (!this.rotationCenter) {
                            const rc = pivotEl.getRotationCenter();
                            if (rc) {
                                this.rotationCenter = new Point(pivotBounds.x + rc.x, pivotBounds.y + rc.y);
                            } else {
                                this.rotationCenter = new Point(
                                    pivotBounds.x + pivotBounds.width / 2,
                                    pivotBounds.y + pivotBounds.height / 2,
                                );
                            }
                        }
                        this.originalPivotCenter = new Point(this.rotationCenter.x, this.rotationCenter.y);
                    }
                    return;
                } else if (typeof hid === 'string' && hid.startsWith('cornerRadius-')) {
                    this.sizeHandles.push(selectedHandle);
                    this.isMovingCornerRadius = true;
                    return;
                }

                if (this.resizeableSelectedElementCount() > 0) {
                    const self = this;
                    this.selectedElements.forEach((selectedElement) => {
                        if (selectedElement.canResize()) {
                            const elementHandles = self.getElementHandles(selectedElement);
                            elementHandles.forEach((handle) => {
                                if (selectedHandle && handle.handleId === selectedHandle.handleId) {
                                    if (!self.sizeHandles) {
                                        self.sizeHandles = [];
                                    }
                                    self.sizeHandles.push(handle);
                                }
                            }, self);
                        }
                    }, this);
                    this.isResizing = true;
                } else if (this.selectedElementCount() === 1) {
                    const el = this.selectedElements[0];
                    if (el.canMovePoint()) {
                        const pointIndex = selectedHandle.handleIndex;
                        if (pointIndex !== undefined) {
                            this.sizeHandles.push(selectedHandle);
                            this.isMovingPoint = true;
                            this.movingPointLocation = el.getPointAt(pointIndex, PointDepth.Full);
                            this.movingPointIndex = pointIndex;
                        }
                    }
                }
                return;
            }

            // Select/deselect element
            if (this.selectionEnabled || e.ctrlKey || e.metaKey || button === 2) {
                const elementsAtPoint = this.model.elementsAt(context, p.x, p.y);
                if (elementsAtPoint && elementsAtPoint.length > 0) {
                    this.rubberBandActive = false;
                    this.canvas.style.cursor = 'pointer';

                    // If any elements under point are already selected, do nothing
                    let elementSelected = false;
                    for (const elementAtPoint of elementsAtPoint) {
                        if (this.isSelected(elementAtPoint)) {
                            elementSelected = true;
                            break;
                        }
                    }

                    // Select element
                    if (e.shiftKey) {
                        if (button === 0) {
                            this.toggleSelected(elementsAtPoint[elementsAtPoint.length - 1]);
                        } else if (button === 2) {
                            this.selectElement(elementsAtPoint[elementsAtPoint.length - 1]);
                        }
                    } else if (this.selectionEnabled && (e.ctrlKey || e.metaKey)) {
                        if (button === 0) {
                            this.toggleSelected(elementsAtPoint[elementsAtPoint.length - 1]);
                        } else if (button === 2) {
                            this.selectElement(elementsAtPoint[elementsAtPoint.length - 1]);
                        }
                    } else {
                        // Select current element and clear others
                        if (!elementSelected) {
                            this.clearSelections();
                            this.selectElement(elementsAtPoint[elementsAtPoint.length - 1]);
                        } else {
                            // Toggle edit points mode
                            if (elementsAtPoint.length === 1) {
                                if (elementsAtPoint[0].canEditPoints()) {
                                    if (elementsAtPoint[0].editPoints) {
                                        elementsAtPoint[0].editPoints = false;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Deselect all elements
                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                        this.clearSelections();
                    }

                    // Enable rubber band
                    this.rubberBandRegion = new Region(p.x, p.y, 0, 0);
                    this.rubberBandActive = true;

                    if (this.selectionEnabled) {
                        this.selecting = true;
                    } else {
                        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                            this.selecting = false;
                        } else {
                            this.selecting = true;
                        }
                    }

                    this.invalidate();
                }
            } else {
                // Enable rubber band
                this.clearSelections();
                this.rubberBandRegion = new Region(p.x, p.y, 0, 0);
                this.rubberBandActive = true;
                this.selecting = false;
                this.invalidate();
            }
            this.invalidate();
        }
        this.drawIfNeeded();
    }

    /**
     * Handles canvas mouse move event
     * @param e - Mouse event
     */
    public onCanvasMouseMove(e: MouseEvent | IMouseEvent): void {
        if (!this.enabled) {
            return;
        }
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!this.canvas) {
            return;
        }
        if (e.button === 2) {
            return;
        }

        this.lastClientX = e.clientX;
        this.lastClientY = e.clientY;

        const p = this.windowToCanvas(e.clientX, e.clientY);
        if (this.isMouseDown && this.currentX !== undefined && this.currentY !== undefined) {
            this.currentWidth = p.x - this.currentX;
            this.currentHeight = p.y - this.currentY;
        } else {
            this.currentX = p.x;
            this.currentY = p.y;
            this.currentWidth = 0;
            this.currentHeight = 0;
        }

        // Get distance moved
        let deltaX = 0;
        let deltaY = 0;
        if (this.mouseDownPosition) {
            const size = this.model.getSize();
            if (size) {
                deltaX = p.x - this.mouseDownPosition.x;
                if (this.mouseDownPosition.x + deltaX < 0) {
                    deltaX = -this.mouseDownPosition.x;
                    this.currentX = 0;
                    this.currentWidth = this.mouseDownPosition.x;
                } else if (this.mouseDownPosition.x + deltaX >= size.width) {
                    deltaX = size.width - this.mouseDownPosition.x;
                    this.currentX = size.width - 1;
                    this.currentWidth = deltaX;
                }
                deltaY = p.y - this.mouseDownPosition.y;
                if (this.mouseDownPosition.y + deltaY < 0) {
                    deltaY = -this.mouseDownPosition.y;
                    this.currentY = 0;
                    this.currentHeight = this.mouseDownPosition.y;
                } else if (this.mouseDownPosition.y + deltaY >= size.height) {
                    deltaY = size.height - this.mouseDownPosition.y;
                    this.currentY = size.height - 1;
                    this.currentHeight = deltaY;
                }
                if (deltaX === this.lastDeltaX && deltaY === this.lastDeltaY) {
                    return;
                }
            }
        }
        this.lastDeltaX = deltaX;
        this.lastDeltaY = deltaY;

        // Fire view mouse moved event
        if (this.mouseMovedView.hasListeners()) {
            this.mouseMovedView.trigger(this, new PointEventParameters(e, new Point(p.x, p.y)));
        }

        // If we have an active tool, then delegate and return
        if (this.activeTool) {
            this.activeTool.mouseMove(new MouseLocationArgs(e, new Point(p.x, p.y)));
            return;
        }

        // If rotating
        if (this.isRotating && this.sizeHandles && this.sizeHandles.length > 0) {
            this.sizeHandles.forEach((h) => {
                if (h.handleMoved) {
                    h.handleMoved(h, {
                        deltaX: 0,
                        deltaY: 0,
                        mouseX: p.x,
                        mouseY: p.y,
                        shiftKey: e.shiftKey,
                    });
                }
            });
            if (this.sizeHandles.length > 0) {
                const rotEl = this.sizeHandles[0].element;
                this.onElementRotating(rotEl, rotEl.getRotation());
            }
        }
        // If moving pivot
        else if (this.isMovingPivot && this.sizeHandles && this.sizeHandles.length > 0) {
            this.sizeHandles.forEach((h) => {
                if (h.handleMoved) {
                    let dx = Math.round(deltaX);
                    let dy = Math.round(deltaY);
                    // Convert screen-space deltas to local element space for transformed elements
                    const el = h.element;
                    if (el.transform && this.model) {
                        const b = el.getBounds();
                        if (b) {
                            const ref = new Point(b.x, b.y);
                            const mat = Matrix2D.fromTransformString(el.transform, ref);
                            const inv = mat.inverse();
                            const local = inv.transformVector(deltaX, deltaY);
                            dx = Math.round(local.x);
                            dy = Math.round(local.y);
                        }
                    }
                    h.handleMoved(h, { deltaX: dx, deltaY: dy });
                }
            });
        }
        // If resizing
        else if (this.isResizing && this.sizeHandles && this.sizeHandles.length > 0) {
            this.sizeHandles.forEach((h) => {
                if (h.handleMoved) {
                    let dx = Math.round(deltaX);
                    let dy = Math.round(deltaY);
                    // Convert screen-space deltas to local element space for transformed elements
                    const el = h.element;
                    if (el.transform && this.model) {
                        const b = el.getBounds();
                        if (b) {
                            const ref = new Point(b.x, b.y);
                            const mat = Matrix2D.fromTransformString(el.transform, ref);
                            const inv = mat.inverse();
                            const local = inv.transformVector(deltaX, deltaY);
                            dx = Math.round(local.x);
                            dy = Math.round(local.y);
                        }
                    }
                    h.handleMoved(h, { deltaX: dx, deltaY: dy, shiftKey: e.shiftKey });
                }
            });
        } else if (this.isMovingCornerRadius && this.sizeHandles && this.sizeHandles.length > 0) {
            this.sizeHandles.forEach((h) => {
                if (h.handleMoved) {
                    let dx = Math.round(deltaX);
                    let dy = Math.round(deltaY);
                    const el = h.element;
                    if (el.transform && this.model) {
                        const b = el.getBounds();
                        if (b) {
                            const ref = new Point(b.x, b.y);
                            const mat = Matrix2D.fromTransformString(el.transform, ref);
                            const inv = mat.inverse();
                            const local = inv.transformVector(deltaX, deltaY);
                            dx = Math.round(local.x);
                            dy = Math.round(local.y);
                        }
                    }
                    h.handleMoved(h, { deltaX: dx, deltaY: dy, shiftKey: e.shiftKey });
                }
            });
        } else if (this.isMoving) {
            // Ensure no moves will result in out of bounds
            let allOkay = true;
            if (this.constrainToBounds) {
                for (const selectedElement of this.selectedElements) {
                    if (selectedElement.canMove()) {
                        const b = selectedElement.getBounds();
                        if (!b) {
                            continue;
                        }
                        const moveLocation = new Point(Math.round(b.x + deltaX), Math.round(b.y + deltaY));
                        if (!DesignController.isInBounds(moveLocation, b.size, this.model, selectedElement.transform)) {
                            allOkay = false;
                            break;
                        }
                    }
                }
            }
            if (allOkay) {
                for (const selectedElement of this.selectedElements) {
                    if (selectedElement.canMove()) {
                        const b = selectedElement.getBounds();
                        if (b) {
                            const moveLocation = new Point(Math.round(b.x + deltaX), Math.round(b.y + deltaY));
                            this.setElementMoveLocation(selectedElement, moveLocation, b.size);
                            this.invalidate();
                        }
                    }
                }
            } else {
                // Determine maximum we can move and set new diffX/diffY
                let x1 = Number.POSITIVE_INFINITY;
                let x2 = Number.NEGATIVE_INFINITY;
                let y1 = Number.POSITIVE_INFINITY;
                let y2 = Number.NEGATIVE_INFINITY;
                for (const selectedElement of this.selectedElements) {
                    if (selectedElement.canMove()) {
                        const b = selectedElement.getBounds();
                        if (b) {
                            if (b.x < x1) {
                                x1 = b.x;
                            }
                            if (b.x + b.width > x2) {
                                x2 = b.x + b.width;
                            }
                            if (b.y < y1) {
                                y1 = b.y;
                            }
                            if (b.y + b.height > y2) {
                                y2 = b.y + b.height;
                            }
                        }
                    }
                }
                const size = this.model.getSize();
                if (size) {
                    if (deltaX < 0 && x1 + deltaX < 0) {
                        deltaX = -x1;
                    } else if (deltaX > 0 && x2 + deltaX > size.width) {
                        deltaX = size.width - x2;
                    }
                    if (deltaY < 0 && y1 + deltaY < 0) {
                        deltaY = -y1;
                    } else if (deltaY > 0 && y2 + deltaY > size.height) {
                        deltaY = size.height - y2;
                    }
                }
                for (const selectedElement of this.selectedElements) {
                    if (selectedElement.canMove()) {
                        const b = selectedElement.getBounds();
                        if (b) {
                            const moveLocation = new Point(Math.round(b.x + deltaX), Math.round(b.y + deltaY));
                            this.setElementMoveLocation(selectedElement, moveLocation, b.size);
                            this.invalidate();
                        }
                    }
                }
            }
        } else if (this.isMovingPoint && this.movingPointIndex !== undefined) {
            const pointHolder = this.selectedElements[0];
            let depth = PointDepth.Simple;
            if (this.selectedElementCount() === 1) {
                depth = PointDepth.Full;
            }
            const pointLocation = pointHolder.getPointAt(this.movingPointIndex, depth);
            // Convert deltas to local element space for transformed elements
            let localDX = deltaX;
            let localDY = deltaY;
            if (pointHolder.transform && this.model) {
                const b = pointHolder.getBounds();
                if (b) {
                    const ref = new Point(b.x, b.y);
                    const mat = Matrix2D.fromTransformString(pointHolder.transform, ref);
                    const inv = mat.inverse();
                    const local = inv.transformVector(deltaX, deltaY);
                    localDX = local.x;
                    localDY = local.y;
                }
            }
            let newLocation: Point;
            if (this.snapToGrid) {
                newLocation = new Point(
                    this.getNearestSnapX(pointLocation.x + localDX),
                    this.getNearestSnapY(pointLocation.y + localDY),
                );
            } else {
                newLocation = new Point(Math.round(pointLocation.x + localDX), Math.round(pointLocation.y + localDY));
            }
            this.movingPointLocation = newLocation;
            this.invalidate();
        } else if (this.isMouseDown) {
            if (!this.isMoving) {
                // Determine if any movable elements selected and if so, initiate move
                if (this.movableSelectedElementCount() > 0) {
                    if (deltaX * deltaX + deltaY * deltaY > 8) {
                        this.isMoving = true;
                        this.invalidate();
                    }
                }
            }

            // If rubber banding, update
            if (this.rubberBandActive && this.mouseDownPosition) {
                let left = Math.min(this.mouseDownPosition.x, this.mouseDownPosition.x + deltaX);
                let top = Math.min(this.mouseDownPosition.y, this.mouseDownPosition.y + deltaY);
                let width = Math.abs(deltaX);
                let height = Math.abs(deltaY);

                // If snapping to grid
                if (this.snapToGrid) {
                    const snappedLeft = this.getNearestSnapX(this.mouseDownPosition.x);
                    left = snappedLeft;

                    const snappedTop = this.getNearestSnapY(this.mouseDownPosition.y);
                    top = snappedTop;
                }
                if (left < 0) {
                    left = 0;
                }
                if (top < 0) {
                    top = 0;
                }
                const size = this.model.getSize();
                if (size) {
                    if (left + width > size.width) {
                        width = size.width - left;
                    }
                    if (top + height > size.height) {
                        height = size.height - top;
                    }
                    this.rubberBandRegion = new Region(left, top, width, height);
                }
                this.invalidate();
                if (this.canvas) {
                    this.canvas.style.cursor = 'none';
                }
            }
        } else {
            // Determine if over handle
            let foundHandle = false;
            const sl = this.selectedElements.length;
            for (let si = 0; si < sl; si++) {
                const selectedElement = this.selectedElements[si];
                const handles = this.getElementHandles(selectedElement);

                // If element is transformed, hit test against transformed rectangles
                if (selectedElement.transform) {
                    const context = this.canvas.getContext('2d');
                    if (context) {
                        context.save();
                        const b = selectedElement.getBounds();
                        if (!b) {
                            continue;
                        }
                        let reference = new Point(b.x, b.y);
                        if (this.isMoving && selectedElement.canMove()) {
                            reference = this.getElementMoveLocation(selectedElement);
                        } else if (this.isResizing && selectedElement.canResize()) {
                            reference = this.getElementMoveLocation(selectedElement);
                        }
                        this.model.setRenderTransform(context, selectedElement.transform, reference);
                        for (const h of handles) {
                            context.beginPath();
                            if (!h.region) {
                                return;
                            }
                            context.rect(h.region.x, h.region.y, h.region.width, h.region.height);
                            const hit = context.isPointInPath(p.x, p.y);
                            context.closePath();
                            if (hit) {
                                this.canvas.style.cursor = h.cursor;
                                foundHandle = true;
                                break;
                            }
                        }
                        context.restore();
                    }
                } else {
                    // No element transform, so test handle regions
                    for (const h of handles) {
                        if (!h.region) {
                            continue;
                        }
                        const hit = h.region.containsCoordinate(p.x, p.y);
                        if (hit) {
                            this.canvas.style.cursor = h.cursor;
                            foundHandle = true;
                            break;
                        }
                    }
                    if (foundHandle) {
                        break;
                    }
                }
            }
            if (!foundHandle) {
                const context = this.canvas.getContext('2d');
                if (context) {
                    const elementsAtPoint = this.model.elementsAt(context, p.x, p.y);
                    if (elementsAtPoint && elementsAtPoint.length > 0) {
                        if (e.ctrlKey || e.metaKey) {
                            this.canvas.style.cursor = 'pointer';
                        } else if (this.selectionEnabled) {
                            this.canvas.style.cursor = 'pointer';
                        } else {
                            this.canvas.style.cursor = 'crosshair';
                        }
                        const activeElement = elementsAtPoint[elementsAtPoint.length - 1];
                        this.setMouseOverElement(activeElement);
                    } else {
                        this.canvas.style.cursor = 'crosshair';
                        this.setMouseOverElement(undefined);
                    }
                }
            }
        }
        this.drawIfNeeded();
    }

    /**
     * Handles canvas mouse up
     * @param e - Mouse event info
     */
    public onCanvasMouseUp(e: MouseEvent | IMouseEvent): void {
        log(`Canvas mouse up ${e.clientX}:${e.clientY}`);
        if (!this.enabled) {
            return;
        }
        if (!this.mouseDownPosition) {
            return;
        }
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!this.canvas) {
            return;
        }

        const p = this.windowToCanvas(e.clientX, e.clientY);
        const deltaX = p.x - this.mouseDownPosition.x;
        const deltaY = p.y - this.mouseDownPosition.y;

        // Clear mouse down state and call any mouse up or click listeners
        this.isMouseDown = false;
        if (this.mouseUpView.hasListeners()) {
            this.mouseUpView.trigger(this, new PointEventParameters(e, new Point(p.x, p.y)));
        }

        // If we have an active tool, then delegate and return
        if (this.activeTool) {
            this.activeTool.mouseUp(new MouseLocationArgs(e, new Point(p.x, p.y)));
            if (!this.activeTool.isCreating) {
                this.finalizeToolHistorySession();
            }
            return;
        }

        // Left button up
        const button = e.button;
        if (button === 0) {
            this.isMouseDown = false;

            // If rubber banding
            if (this.rubberBandActive && this.rubberBandRegion) {
                this.rubberBandActive = false;
                if (this.selecting) {
                    let itemsSelected = false;
                    for (const el of this.model.elements) {
                        if (el.interactive) {
                            const b = el.getBounds();
                            if (!b) {
                                continue;
                            }

                            // If DX and DY are both negative, use full select
                            if (deltaX < 0 && deltaY < 0) {
                                if (this.rubberBandRegion.containsRegion(b)) {
                                    if (!this.isSelected(el)) {
                                        this.selectedElements.push(el);
                                        itemsSelected = true;
                                    }
                                }
                            } else {
                                if (b.intersectsWith(this.rubberBandRegion)) {
                                    if (!this.isSelected(el)) {
                                        this.selectedElements.push(el);
                                        itemsSelected = true;
                                    }
                                }
                            }
                        }
                    }
                    if (itemsSelected) {
                        this.onSelectionChanged();
                    }
                    this.selecting = false;
                } else {
                    // If action not cancelled
                    if (!this.cancelAction) {
                        if (
                            this.elementCreated.hasListeners() &&
                            this.rubberBandRegion.width >= this.minElementSize.width &&
                            this.rubberBandRegion.height >= this.minElementSize.height
                        ) {
                            this.elementCreated.trigger(this, this.rubberBandRegion);
                        }
                    }
                }
            }

            this.invalidate();

            // Exit if action cancelled
            if (this.cancelAction) {
                if (this.pressedElement) {
                    const el = this.pressedElement;
                    if (this.mouseUpElement.hasListeners()) {
                        this.mouseUpElement.trigger(this, el);
                    }
                    this.pressedElement = undefined;
                }
                if (this.isMoving) {
                    this.clearElementMoveLocations();
                    this.selectedElements.forEach((el) => {
                        if (el instanceof ComponentElement && el.component) {
                            if (el.component.size.hasListeners()) {
                                const size = el.getSize();
                                if (size) {
                                    el.component.size.trigger(el.component, new ElementSizeProps(el, size));
                                }
                            }
                        }
                    });
                    this.isMoving = false;
                    this.invalidate();
                } else if (this.isResizing) {
                    this.clearElementMoveLocations();
                    this.clearElementResizeSizes();
                    this.selectedElements.forEach((el) => {
                        if (el instanceof ComponentElement && el.component) {
                            if (el.component.size.hasListeners()) {
                                const size = el.getSize();
                                if (size) {
                                    el.component.size.trigger(el.component, new ElementSizeProps(el, size));
                                }
                            }
                        }
                    });
                    this.sizeHandles = undefined;
                    this.isResizing = false;
                    this.invalidate();
                    this.canvas.style.cursor = 'crosshair';
                } else if (this.isMovingPoint) {
                    this.clearElementMoveLocations();
                    this.clearElementResizeSizes();
                    this.selectedElements.forEach((el) => {
                        el.clearBounds();
                    });
                    this.sizeHandles = undefined;
                    this.isMovingPoint = false;
                    this.movingPointLocation = undefined;
                    this.invalidate();
                    this.canvas.style.cursor = 'crosshair';
                } else if (this.isMovingCornerRadius) {
                    const selectedHandle = this.sizeHandles && this.sizeHandles.length > 0 ? this.sizeHandles[0] : undefined;
                    const originalRadii = DesignController.getHandleCornerRadii(selectedHandle);
                    if (selectedHandle?.element instanceof RectangleElement && originalRadii) {
                        selectedHandle.element.setCornerRadii(
                            originalRadii[0],
                            originalRadii[1],
                            originalRadii[2],
                            originalRadii[3],
                        );
                    }
                    this.sizeHandles = undefined;
                    this.isMovingCornerRadius = false;
                    this.invalidate();
                    this.canvas.style.cursor = 'crosshair';
                } else if (this.isRotating) {
                    // Restore original transform on cancel
                    if (this.selectedElements.length > 0) {
                        const el = this.selectedElements[0];
                        el.transform = this.originalTransform;
                    }
                    this.sizeHandles = undefined;
                    this.isRotating = false;
                    this.originalTransform = undefined;
                    this.invalidate();
                    this.canvas.style.cursor = 'crosshair';
                } else if (this.isMovingPivot) {
                    // Restore original pivot position on cancel
                    if (this.originalPivotCenter) {
                        this.rotationCenter = new Point(this.originalPivotCenter.x, this.originalPivotCenter.y);
                    }
                    this.originalPivotCenter = undefined;
                    this.sizeHandles = undefined;
                    this.isMovingPivot = false;
                    this.invalidate();
                    this.canvas.style.cursor = 'crosshair';
                }
                return;
            }

            // If elements were being moved, commit move
            if (this.isMoving) {
                for (const selectedElement of this.selectedElements) {
                    if (selectedElement.canMove()) {
                        const moveLocation = this.getElementMoveLocation(selectedElement);
                        selectedElement.setLocation(new Point(Math.round(moveLocation.x), Math.round(moveLocation.y)));
                        const resizeSize = this.getElementResizeSize(selectedElement);
                        selectedElement.setSize(new Size(Math.round(resizeSize.width), Math.round(resizeSize.height)));
                        const bounds = selectedElement.getBounds();
                        if (bounds) {
                            this.onElementMoved(selectedElement, new Point(bounds.x, bounds.y));
                            this.onElementSized(selectedElement, new Size(bounds.width, bounds.height));
                        }
                        this.invalidate();
                    }
                }
                this.isMoving = false;
                this.rotationCenter = undefined;
                this.commitUndoSnapshot();
                this.invalidate();
            } else if (this.isResizing) {
                for (const selectedElement of this.selectedElements) {
                    if (selectedElement.canResize()) {
                        const oldBounds = selectedElement.getBounds();
                        const moveLocation = this.getElementMoveLocation(selectedElement);
                        const resizeSize = this.getElementResizeSize(selectedElement);

                        // Proportionally update rotation center in element transform
                        if (oldBounds && selectedElement.transform && oldBounds.width > 0 && oldBounds.height > 0) {
                            const rc = selectedElement.getRotationCenter();
                            if (rc) {
                                const newCx = (rc.x / oldBounds.width) * resizeSize.width;
                                const newCy = (rc.y / oldBounds.height) * resizeSize.height;
                                if (selectedElement.isSimpleRotation()) {
                                    const angle = selectedElement.getRotation();
                                    selectedElement.setRotation(angle, newCx, newCy);
                                } else {
                                    // For matrix/complex transforms, update center in the transform string
                                    const t = selectedElement.transform!.trim();
                                    const parenIdx = t.indexOf('(', t.indexOf('(') + 1);
                                    if (parenIdx !== -1) {
                                        const base = t.substring(0, parenIdx);
                                        selectedElement.transform = `${base}(${newCx},${newCy}))`;
                                    }
                                }
                            }
                        }

                        selectedElement.setLocation(new Point(Math.round(moveLocation.x), Math.round(moveLocation.y)));
                        selectedElement.setSize(new Size(Math.round(resizeSize.width), Math.round(resizeSize.height)));
                        const bounds = selectedElement.getBounds();
                        if (bounds) {
                            this.onElementMoved(selectedElement, new Point(bounds.x, bounds.y));
                            this.onElementSized(selectedElement, new Size(bounds.width, bounds.height));
                        }
                        this.invalidate();
                    }
                }
                this.sizeHandles = undefined;
                this.isResizing = false;
                this.rotationCenter = undefined;
                this.commitUndoSnapshot();
                this.invalidate();
                this.canvas.style.cursor = 'crosshair';
            } else if (this.isMovingPoint && this.movingPointIndex !== undefined && this.movingPointLocation) {
                const selectedElement = this.selectedElements[0];
                const moveLocation = this.movingPointLocation;
                let depth = PointDepth.Simple;
                if (this.selectedElementCount() === 1) {
                    depth = PointDepth.Full;
                }
                selectedElement.setPointAt(
                    this.movingPointIndex,
                    new Point(Math.round(moveLocation.x), Math.round(moveLocation.y)),
                    depth,
                );
                selectedElement.clearBounds();
                this.clearElementMoveLocations();
                this.clearElementResizeSizes();
                this.sizeHandles = undefined;
                this.isMovingPoint = false;
                this.movingPointLocation = undefined;
                this.setIsDirty(true);
                this.commitUndoSnapshot();
                this.invalidate();
                this.canvas.style.cursor = 'crosshair';
            } else if (this.isMovingCornerRadius) {
                const selectedHandle = this.sizeHandles && this.sizeHandles.length > 0 ? this.sizeHandles[0] : undefined;
                let changed = false;
                const startRadii = DesignController.getHandleCornerRadii(selectedHandle);
                if (selectedHandle?.element instanceof RectangleElement && startRadii) {
                    const currentRadii = selectedHandle.element.cornerRadii
                        ? [
                            selectedHandle.element.cornerRadii[0],
                            selectedHandle.element.cornerRadii[1],
                            selectedHandle.element.cornerRadii[2],
                            selectedHandle.element.cornerRadii[3],
                        ]
                        : undefined;
                    changed = !DesignController.areCornerRadiiEqual(startRadii, currentRadii);
                }
                this.sizeHandles = undefined;
                this.isMovingCornerRadius = false;
                if (changed) {
                    this.setIsDirty(true);
                    this.commitUndoSnapshot();
                }
                this.invalidate();
                this.canvas.style.cursor = 'crosshair';
            } else if (this.isRotating) {
                // Rotation is already applied to element transform during drag
                if (this.selectedElements.length > 0) {
                    const el = this.selectedElements[0];
                    this.onElementRotated(el, el.getRotation());
                }
                this.sizeHandles = undefined;
                this.isRotating = false;
                this.rotationCenter = undefined;
                this.originalTransform = undefined;
                this.commitUndoSnapshot();
                this.invalidate();
                this.canvas.style.cursor = 'crosshair';
            } else if (this.isMovingPivot) {
                this.originalPivotCenter = undefined;
                this.sizeHandles = undefined;
                this.isMovingPivot = false;
                this.setIsDirty(true);
                this.commitUndoSnapshot();
                this.invalidate();
                this.canvas.style.cursor = 'crosshair';
            }
        }

        if (this.pressedElement) {
            const el = this.pressedElement;
            if (this.mouseUpElement.hasListeners()) {
                this.mouseUpElement.trigger(this, el);
            }
            if (el === this.mouseOverElement) {
                if (this.elementClicked.hasListeners()) {
                    this.elementClicked.trigger(this, el);
                }
            }
            this.pressedElement = undefined;
        }
        this.drawIfNeeded();
    }

    /**
     * Handles canvas touch start.
     * Single-touch gestures route through the existing mouse editing path.
     * Two-touch gestures start pinch zoom and pan mode.
     * @param e - Touch event
     */
    public onCanvasTouchStart(e: TouchEvent): void {
        if (!this.enabled) {
            return;
        }
        if (!this.canvas) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        window.addEventListener('touchend', this.windowTouchEnd, true);
        window.addEventListener('touchmove', this.windowTouchMove, true);
        window.addEventListener('touchcancel', this.windowTouchCancel, true);

        if (e.touches.length >= 2) {
            const primary = e.touches[0];
            if (this.isMouseDown) {
                this.cancelAction = true;
                this.onCanvasMouseUp(this.createTouchMouseEvent(primary, e));
            }
            this.activeTouchId = undefined;
            this.beginTouchGesture(e);
            return;
        }

        if (this.touchGestureActive || e.touches.length !== 1) {
            return;
        }
        const touch = e.touches[0];
        this.activeTouchId = touch.identifier;
        this.onCanvasMouseDown(this.createTouchMouseEvent(touch, e));
    }

    /**
     * Handles canvas touch move.
     * @param e - Touch event
     */
    public onCanvasTouchMove(e: TouchEvent): void {
        if (!this.enabled) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();

        if (e.touches.length >= 2 || this.touchGestureActive) {
            if (!this.touchGestureActive) {
                this.beginTouchGesture(e);
            }
            this.updateTouchGesture(e);
            return;
        }

        if (this.activeTouchId === undefined) {
            return;
        }
        const touch = this.findTouchById(e.touches, this.activeTouchId);
        if (!touch) {
            return;
        }
        this.onCanvasMouseMove(this.createTouchMouseEvent(touch, e));
    }

    /**
     * Handles canvas touch end.
     * @param e - Touch event
     */
    public onCanvasTouchEnd(e: TouchEvent): void {
        e.preventDefault();
        e.stopPropagation();

        if (this.touchGestureActive) {
            if (e.touches.length >= 2) {
                this.updateTouchGesture(e);
                return;
            }
            this.endTouchGesture();
            return;
        }

        if (this.activeTouchId === undefined) {
            return;
        }

        const touch = this.findTouchById(e.changedTouches, this.activeTouchId);
        if (!touch) {
            return;
        }

        window.removeEventListener('touchend', this.windowTouchEnd, true);
        window.removeEventListener('touchmove', this.windowTouchMove, true);
        window.removeEventListener('touchcancel', this.windowTouchCancel, true);
        this.activeTouchId = undefined;
        this.onCanvasMouseUp(this.createTouchMouseEvent(touch, e));
    }

    /**
     * Handles canvas touch cancel.
     * @param e - Touch event
     */
    public onCanvasTouchCancel(e: TouchEvent): void {
        if (this.touchGestureActive) {
            this.endTouchGesture();
            return;
        }
        this.cancelAction = true;
        this.onCanvasTouchEnd(e);
    }

    /**
     * Handles canvas key down
     * @param e - DOM Keyboard event
     */
    public onCanvasKeyDown(e: KeyboardEvent): boolean {
        if (!this.enabled) {
            return false;
        }

        switch (e.keyCode) {
            case 90: // 'Z' key
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.shiftKey) {
                        return this.redo();
                    }
                    return this.undo();
                }
                return false;

            case 89: // 'Y' key
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    return this.redo();
                }
                return false;

            case 37: // Left Arrow
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    this.nudgeSize(-this.largeJump, 0);
                } else if (e.ctrlKey || e.metaKey) {
                    this.nudgeSize(-1, 0);
                } else if (e.shiftKey) {
                    this.nudgeLocation(-this.largeJump, 0);
                } else {
                    this.nudgeLocation(-1, 0);
                }
                return true;

            case 39: // Right Arrow
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    this.nudgeSize(this.largeJump, 0);
                } else if (e.ctrlKey || e.metaKey) {
                    this.nudgeSize(1, 0);
                } else if (e.shiftKey) {
                    this.nudgeLocation(this.largeJump, 0);
                } else {
                    this.nudgeLocation(1, 0);
                }
                return true;

            case 38: // Up Arrow
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    this.nudgeSize(0, -this.largeJump);
                } else if (e.ctrlKey || e.metaKey) {
                    this.nudgeSize(0, -1);
                } else if (e.shiftKey) {
                    this.nudgeLocation(0, -this.largeJump);
                } else {
                    this.nudgeLocation(0, -1);
                }
                return true;

            case 40: // Down Arrow
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    this.nudgeSize(0, this.largeJump);
                } else if (e.ctrlKey || e.metaKey) {
                    this.nudgeSize(0, 1);
                } else if (e.shiftKey) {
                    this.nudgeLocation(0, this.largeJump);
                } else {
                    this.nudgeLocation(0, 1);
                }
                return true;

            case 65: // 'A' key
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectAll();
                    return true;
                }
                return false;

            case 46: // Delete
            case 8: // Backspace
                e.preventDefault();
                if (this.onDelete.hasListeners()) {
                    this.onDelete.trigger(this, new ControllerEventArgs(e));
                } else {
                    this.removeSelected();
                }
                return true;

            case 27: // ESC key
                if (this.activeTool) {
                    this.activeTool.cancel();
                    this.finalizeToolHistorySession();
                }
                if (this.isMouseDown) {
                    this.cancelAction = true;
                    this.selecting = false;
                    this.onCanvasMouseUp({
                        button: 0,
                        clientX: this.lastClientX,
                        clientY: this.lastClientY,
                    });
                    return true;
                }
                if (this.selectedElementCount() > 0) {
                    this.clearSelections();
                    return true;
                }
                return false;

            default:
                // console.log('Key Down Code: ' + e.keyCode);
                return false;
        }
    }

    /**
     * Fired when drag begins over canvas
     * @param e - Mouse drag event
     */
    public onCanvasDragEnter(e: DragEvent): void {
        log('Canvas drag enter');
        e.stopPropagation();
        e.preventDefault();
        if (!this.enabled) {
            return;
        }
        this.isDragging = true;
        if (this.viewDragEnter.hasListeners()) {
            this.viewDragEnter.trigger(this, new ViewDragArgs(e, undefined));
        }
        this.drawIfNeeded();
    }

    /**
     * Fired while drag is occurring over canvas
     * @param e - Mouse drag event
     */
    public onCanvasDragOver(e: DragEvent): void {
        log(`Canvas drag over ${e.clientX}:${e.clientY}`);
        e.stopPropagation();
        e.preventDefault();

        if (!this.enabled) {
            return;
        }
        if (!this.canvas) {
            return;
        }
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const p = this.windowToCanvas(e.clientX, e.clientY);

        // Fire view drag over event
        if (this.viewDragOver.hasListeners()) {
            const evt = {
                controller: this,
                event: e,
                location: new Point(p.x, p.y),
            };
            this.viewDragOver.trigger(this, evt);
        }

        // Determine if over element
        const context = this.canvas.getContext('2d');
        if (context) {
            const elementsAtPoint = this.model.elementsAt(context, p.x, p.y);
            if (elementsAtPoint && elementsAtPoint.length > 0) {
                let draggable: ElementBase | undefined;
                for (let i = elementsAtPoint.length - 1; i >= 0; i--) {
                    const activeElement = elementsAtPoint[i];
                    if (activeElement instanceof ComponentElement && activeElement.component) {
                        if (activeElement.component.acceptsDrag) {
                            draggable = activeElement;
                            break;
                        }
                    }
                }
                this.setDragOverElement(draggable, e);
            } else {
                this.setDragOverElement(undefined, e);
            }
        }
        this.drawIfNeeded();
    }

    /**
     * Fired when drag had ended over canvas
     * @param e - Mouse drag event
     */
    public onCanvasDragLeave(e: DragEvent | undefined): void {
        log('Canvas drag leave');
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (!this.enabled) {
            return;
        }
        this.isDragging = false;
        this.setDragOverElement(undefined, e);
        if (this.viewDragLeave.hasListeners()) {
            this.viewDragLeave.trigger(this, new ViewDragArgs(e, undefined));
        }
        this.drawIfNeeded();
    }

    /**
     * Fired while drop occurs on canvas
     * @param e - Mouse drag event
     */
    public onCanvasDrop(e: DragEvent): void {
        log(`Canvas drag over ${e.clientX}:${e.clientY}`);
        e.stopPropagation();
        e.preventDefault();
        if (!this.enabled) {
            return;
        }
        this.isDragging = false;
        const p = this.windowToCanvas(e.clientX, e.clientY);
        if (this.dragOverElement) {
            if (this.dragOverElement instanceof ComponentElement) {
                const ce = this.dragOverElement as ComponentElement;
                if (ce.component && ce.component.dragLeave.hasListeners()) {
                    ce.component.dragLeave.trigger(ce.component, new ElementDragArgs(this.dragOverElement, e));
                    this.invalidate();
                }
            }
            if (this.elementDrop.hasListeners()) {
                const evt = {
                    controller: this,
                    element: this.dragOverElement,
                    event: e,
                };
                this.elementDrop.trigger(this, evt);
            }
        } else if (this.viewDrop.hasListeners()) {
            const evt = {
                controller: this,
                event: e,
                location: new Point(p.x, p.y),
            };
            this.viewDrop.trigger(this, evt);
        }
        this.drawIfNeeded();
    }

    /**
     * Coerces an element into the bounds of its model
     * @param el - Element
     */
    public ensureInBounds(el: ElementBase): void {
        const model = this.model;
        if (!model) {
            return;
        }
        const modelSize = model.getSize();
        if (!modelSize) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        let b = el.getBounds();
        if (!b) {
            return;
        }
        if (DesignController.isInBounds(b.location, b.size, model, el.transform)) {
            return;
        }
        if (!el.canResize()) {
            return;
        }

        // If can't fit in bounds, scale down to fit
        if (b.size.width > modelSize.width || b.size.height > modelSize.height) {
            let aspect = 1.0;
            if (b.size.height !== 0) {
                aspect = b.size.width / b.size.height;
            }
            let newWidth = b.size.width;
            let newHeight = b.size.height;
            let fits = false;
            while (!fits) {
                newWidth--;
                if (aspect !== 0) {
                    newHeight = Math.round(newWidth / aspect);
                }
                fits = newWidth <= modelSize.width && newHeight <= modelSize.height;
            }
            el.setSize(new Size(newWidth, newHeight));
        }

        // If out of bounds, but big enough to fit, then put back in bounds
        b = el.getBounds();
        if (!b) {
            return;
        }
        let newX = b.location.x;
        let newY = b.location.y;
        if (b.size.width <= modelSize.width && b.size.height <= modelSize.height) {
            if (b.location.x < 0) {
                newX = 0;
            }
            if (b.location.x + b.size.width > modelSize.width) {
                newX = modelSize.width - b.size.width;
            }
            if (b.location.y < 0) {
                newY = 0;
            }
            if (b.location.y + b.size.height > modelSize.height) {
                newY = modelSize.height - b.size.height;
            }
            el.setLocation(new Point(newX, newY));
        }
    }

    /**
     * Sets current mouse down element
     * @param el - Mouse down element
     */
    public setMouseDownElement(el?: ElementBase): void {
        if (el) {
            this.setMouseOverElement(el);
        }
        if (el !== this.pressedElement) {
            if (this.pressedElement) {
                if (this.mouseUpElement.hasListeners()) {
                    this.mouseUpElement.trigger(this, this.pressedElement);
                }
            }
            this.pressedElement = el;
            if (el) {
                if (this.mouseDownElement.hasListeners()) {
                    this.mouseDownElement.trigger(this, el);
                }
            }
        }
    }

    /**
     * Sets current mouse over element
     * @param el - Mouse over element
     */
    public setMouseOverElement(el?: ElementBase): void {
        if (el !== this.mouseOverElement) {
            if (this.mouseOverElement) {
                if (this.mouseLeftElement.hasListeners()) {
                    this.mouseLeftElement.trigger(this, this.mouseOverElement);
                }
            }
            this.mouseOverElement = el;
            if (el) {
                if (this.mouseEnteredElement.hasListeners()) {
                    this.mouseEnteredElement.trigger(this, el);
                }
            }
        }
    }

    /**
     * Sets current drag over element
     * @param el - Drag over element
     */
    public setDragOverElement(el?: ElementBase, evt?: DragEvent): void {
        if (el !== this.dragOverElement) {
            if (this.dragOverElement) {
                if (this.dragOverElement instanceof ComponentElement) {
                    const ce = this.dragOverElement as ComponentElement;
                    if (ce.component) {
                        ce.component.dragLeave.trigger(ce.component, new ElementDragArgs(this.dragOverElement, evt));
                    }
                }
                if (this.elementDragLeave.hasListeners()) {
                    this.elementDragLeave.trigger(this, new ElementDragArgs(this.dragOverElement, evt));
                }
            }
            this.dragOverElement = el;
            if (el) {
                if (el instanceof ComponentElement && el.component) {
                    el.component.dragEnter.trigger(el.component, new ElementDragArgs(el, evt));
                }
                if (this.elementDragEnter.hasListeners()) {
                    this.elementDragEnter.trigger(this, new ElementDragArgs(el, evt));
                }
            }
            this.invalidate();
        }
    }

    /**
     * Called when selected elements are changed
     */
    public onSelectionChanged(): void {
        const self = this;
        const selected: string[] = [];
        if (!self.model) {
            return;
        }
        // Clear transient rotation state when selection changes
        self.rotationCenter = undefined;
        self.originalPivotCenter = undefined;
        self.model.elements.forEach((el) => {
            if (self.isSelected(el) && el.id) {
                selected.push(el.id);
                if (el instanceof ComponentElement && el.component) {
                    el.component.select.trigger(el.component, el);
                }
            } else if (el instanceof ComponentElement && el.component) {
                el.component.deselect.trigger(el.component, el);
            }
        });
        if (self.selectionChanged.hasListeners()) {
            self.selectionChanged.trigger(self, selected.length);
        }
        if (!self.restoringUndoState && self.model) {
            self.undoManager.replaceCurrent(self.createUndoSnapshot());
            self.updateUndoAvailability();
        }
        self.invalidate();
    }

    /**
     * Called when an element is added to the model
     * @param el - Element added
     */
    public onElementAdded(el: ElementBase): void {
        this.elementAdded.trigger(this, el);
        this.invalidate();
    }

    /**
     * Called when an element is removed from the model
     * @param el - Element removed
     */
    public onElementRemoved(el: ElementBase): void {
        if (el === this.mouseOverElement) {
            this.mouseOverElement = undefined;
        }
        if (el === this.pressedElement) {
            this.pressedElement = undefined;
        }
        if (el === this.dragOverElement) {
            this.dragOverElement = undefined;
        }
        this.elementRemoved.trigger(this, el);
        this.invalidate();
    }

    /**
     * Called when the model is updated
     */
    public onModelUpdated(): void {
        if (this.model) {
            this.modelUpdated.trigger(this, this.model);
        }
        this.setIsDirty(true);
        this.invalidate();
    }

    /**
     * Called while an element is being resized
     * @param el - Element being sized
     * @param size - Tentative size
     */
    public onElementSizing(el: ElementBase, size: Size): void {
        if (el instanceof ComponentElement && el.component) {
            if (el.component.size.hasListeners()) {
                el.component.size.trigger(el.component, new ElementSizeArgs(el, size));
            }
        }
        if (this.elementSizing.hasListeners()) {
            this.elementSizing.trigger(this, new ElementSizeArgs(el, size));
        }
    }

    /**
     * Called while an element is being moved or sized
     * @param el - Element being moved or sized
     * @param location - Tentative location
     */
    public onElementMoving(el: ElementBase, location: Point): void {
        if (this.elementMoving.hasListeners()) {
            this.elementMoving.trigger(this, new ElementLocationArgs(el, location));
        }
    }

    /**
     * Called after and element has been resized
     * @param el - Resized element
     * @param size - New size
     */
    public onElementSized(el: ElementBase, size: Size): void {
        if (this.constrainToBounds) {
            this.ensureInBounds(el);
        }
        if (el instanceof ComponentElement && el.component) {
            if (el.component.size.hasListeners()) {
                const elsize = el.getSize();
                if (elsize) {
                    el.component.size.trigger(el.component, new ElementSizeArgs(el, elsize));
                }
            }
        }
        if (this.elementSized.hasListeners()) {
            this.elementSized.trigger(this, new ElementSizeArgs(el, size));
        }
        this.setIsDirty(true);
    }

    /**
     * Sets a new element location and size
     * @param el - Element to be moved
     * @param location - New location
     * @param size - New size
     */
    public setElementLocation(el: ElementBase, location: Point, size: Size): void {
        el.setLocation(location);
        el.setSize(size);
        if (this.isSelected(el)) {
            this.setElementMoveLocation(el, location, size);
            this.setElementResizeSize(el, size, location);
        }
        const newlocation = el.getLocation();
        if (newlocation) {
            this.onElementMoved(el, newlocation);
        }
        const newSize = el.getSize();
        if (newSize) {
            this.onElementSized(el, newSize);
        }
        this.invalidate();
    }

    /**
     * Called when an element has been moved or sized
     * @param el - Element being moved or sized
     * @param location - New location
     */
    public onElementMoved(el: ElementBase, location: Point): void {
        if (this.constrainToBounds) {
            this.ensureInBounds(el);
        }
        if (this.elementMoved.hasListeners()) {
            this.elementMoved.trigger(this, new ElementLocationArgs(el, location));
        }
        this.setIsDirty(true);
    }

    /**
     * Called while an element is being rotated
     * @param el - Element being rotated
     * @param angle - Tentative rotation angle in degrees
     */
    public onElementRotating(el: ElementBase, angle: number): void {
        if (this.elementRotating.hasListeners()) {
            this.elementRotating.trigger(this, new ElementRotationArgs(el, angle));
        }
    }

    /**
     * Called after an element has been rotated
     * @param el - Rotated element
     * @param angle - Final rotation angle in degrees
     */
    public onElementRotated(el: ElementBase, angle: number): void {
        if (this.elementRotated.hasListeners()) {
            this.elementRotated.trigger(this, new ElementRotationArgs(el, angle));
        }
        this.setIsDirty(true);
    }

    /**
     * Renders design surface grid
     */
    public renderGrid(): void {
        return;
    }

    /**
     * Renders dashed line
     * @param c - Rendering context
     * @param x1 - Starting x coordinate
     * @param y1 - Starting y coordinate
     * @param x2 - Ending x coordinate
     * @param y2 - Ending x coordinate
     * @param dashLength - Dash length
     */
    public drawDashedLine(
        c: CanvasRenderingContext2D,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        dashLength: number,
    ): void {
        c.beginPath();
        dashLength = dashLength === undefined ? 5 : dashLength;
        const deltaX = x2 - x1;
        const deltaY = y2 - y1;
        const numDashes = Math.floor(Math.sqrt(deltaX * deltaX + deltaY * deltaY) / dashLength);
        for (let i = 0; i < numDashes; ++i) {
            c[i % 2 === 0 ? 'moveTo' : 'lineTo'](x1 + (deltaX / numDashes) * i, y1 + (deltaY / numDashes) * i);
        }
        c.stroke();
    }

    /**
     * Retrieves design handled for an element
     * @param el - Element
     * @returns Handle array
     */
    public getElementHandles(el: ElementBase): Handle[] {
        const handles = HandleFactory.handlesForElement(el, this, this.scale);
        /*
        const hl = handles.length;
        for (let hi = 0; hi < hl; hi++) {
            const h = handles[hi];
            h.controller = this;
            h.element = el;
        }*/
        return handles;
    }

    /**
     * Renders current rubber band region
     * @param c - Rendering context
     */
    public drawRubberBand(c: CanvasRenderingContext2D): void {
        if (!this.selecting || !this.rubberBandRegion) {
            this.drawHotspot(c);
            return;
        }

        const x1 = this.rubberBandRegion.x;
        const x2 = this.rubberBandRegion.x + this.rubberBandRegion.width;
        const y1 = this.rubberBandRegion.y;
        const y2 = this.rubberBandRegion.y + this.rubberBandRegion.height;

        c.strokeStyle = 'black';
        c.lineWidth = 1.0 / this.scale;
        c.strokeRect(x1, y1, this.rubberBandRegion.width, this.rubberBandRegion.height);

        c.strokeStyle = 'white';
        this.drawDashedLine(c, x1, y1, x2, y1, 1);
        this.drawDashedLine(c, x2, y1, x2, y2, 1);
        this.drawDashedLine(c, x2, y2, x1, y2, 1);
        this.drawDashedLine(c, x1, y2, x1, y1, 1);
    }

    /**
     * Renders hotspot for rubber band region
     * @param c - Rendering context
     */
    public drawHotspot(c: CanvasRenderingContext2D): void {
        if (!this.rubberBandRegion) {
            return;
        }
        c.save();
        c.strokeStyle = 'red';
        c.lineWidth = 1.0 / this.scale;
        if (this.activeComponent && this.activeComponent.setCreationFill) {
            this.activeComponent.setCreationFill(c);
        } else if (this.fillImage) {
            const pattern = c.createPattern(this.fillImage, 'repeat');
            if (pattern) {
                c.fillStyle = pattern;
            }
        } else {
            c.fillStyle = Color.Gold.toStyleString();
        }
        c.globalAlpha = 0.5;
        c.fillRect(
            this.rubberBandRegion.x,
            this.rubberBandRegion.y,
            this.rubberBandRegion.width,
            this.rubberBandRegion.height,
        );
        c.globalAlpha = 1.0;
        c.strokeRect(
            this.rubberBandRegion.x,
            this.rubberBandRegion.y,
            this.rubberBandRegion.width,
            this.rubberBandRegion.height,
        );
        c.restore();
    }

    /**
     * Renders dashed horizontal line
     * @param c - Rendering context
     * @param y - Y coordinate
     */
    public drawDashedHorizontalLine(c: CanvasRenderingContext2D, y: number) {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const size = this.model.getSize();
        if (size) {
            this.drawDashedLine(c, 0, y, size.width, y, 1);
        }
    }

    /**
     * Renders dashed vertical line
     * @param c - Rendering context
     * @param x - X coordinate
     */
    public drawDashedVerticalLine(c: CanvasRenderingContext2D, x: number) {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const size = this.model.getSize();
        if (size) {
            this.drawDashedLine(c, x, 0, x, size.height, 1);
        }
    }

    /**
     * Renders horizontal line
     * @param c - Rendering context
     * @param y - Y coordinate
     */
    public drawHorizontalLine(c: CanvasRenderingContext2D, y: number) {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const size = this.model.getSize();
        if (!size) {
            return;
        }
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(size.width, y);
        c.stroke();
    }

    /**
     * Renders vertical line
     * @param c - Rendering context
     * @param x - X coordinate
     */
    public drawVerticalLine(c: CanvasRenderingContext2D, x: number) {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const size = this.model.getSize();
        if (!size) {
            return;
        }
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, size.height);
        c.stroke();
    }

    /**
     * Renders design guide wires
     * @param c - Rendering context
     * @param x - X coordinate
     * @param y - Y coordinate
     */
    public drawGuidewires(c: CanvasRenderingContext2D, x: number, y: number) {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const size = this.model.getSize();
        if (!size) {
            return;
        }
        const _scale = this.scale;
        const lw = 1.0 / _scale;
        const dl = 2 / _scale;

        c.strokeStyle = new Color(166, 0, 0, 0).toStyleString();
        c.lineWidth = lw;
        this.drawHorizontalLine(c, y);
        this.drawVerticalLine(c, x);

        c.strokeStyle = new Color(204, 255, 255, 255).toStyleString();
        this.drawDashedLine(c, x, y, 0, y, dl);
        this.drawDashedLine(c, x, y, size.width, y, dl);
        this.drawDashedLine(c, x, y, x, 0, dl);
        this.drawDashedLine(c, x, y, x, size.height, dl);

        c.strokeStyle = new Color(153, 0, 0, 0).toStyleString();
        c.beginPath();
        c.arc(x, y, 6 / _scale, 0, Math.PI * 2);
        c.stroke();

        c.strokeStyle = new Color(191, 255, 255, 255).toStyleString();
        c.beginPath();
        c.arc(x, y, 5 / _scale, 0, Math.PI * 2);
        c.stroke();

        c.strokeStyle = new Color(153, 0, 0, 0).toStyleString();
        c.beginPath();
        c.arc(x, y, 4 / _scale, 0, Math.PI * 2);
        c.stroke();

        c.strokeStyle = new Color(230, 0, 0, 0).toStyleString();
        this.drawDashedLine(c, x - 1 / _scale, y, x - 4 / _scale, y, 2);
        this.drawDashedLine(c, x + 1 / _scale, y, x + 4 / _scale, y, 2);
        this.drawDashedLine(c, x, y - 1 / _scale, x, y - 4 / _scale, 2);
        this.drawDashedLine(c, x, y + 1 / _scale, x, y + 4 / _scale, 2);
    }

    /**
     * Formats an overlay indicator numeric value.
     * @param value - Value to format
     * @returns Formatted string
     */
    public formatIndicatorValue(value: number): string {
        const rounded = Math.round(value * 10) / 10;
        if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
            return Math.round(rounded).toString();
        }
        return rounded.toString();
    }

    /**
     * Computes tentative interaction bounds for the current move/resize gesture.
     * @returns Tentative bounds or undefined when unavailable
     */
    public getInteractionIndicatorBounds(): Region | undefined {
        if (!this.isMoving && !this.isResizing) {
            return undefined;
        }

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const el of this.selectedElements) {
            const bounds = el.getBounds();
            if (!bounds) {
                continue;
            }

            let location = bounds.location;
            let size = bounds.size;

            if (this.isMoving && el.canMove()) {
                location = this.getElementMoveLocation(el);
            } else if (this.isResizing && el.canResize()) {
                location = this.getElementMoveLocation(el);
                size = this.getElementResizeSize(el);
            }

            let indicatorBounds = new Region(location.x, location.y, size.width, size.height);
            if (el.transform) {
                indicatorBounds = DesignController.getTransformedAABB(location, size, el.transform);
            }

            minX = Math.min(minX, indicatorBounds.x);
            minY = Math.min(minY, indicatorBounds.y);
            maxX = Math.max(maxX, indicatorBounds.x + indicatorBounds.width);
            maxY = Math.max(maxY, indicatorBounds.y + indicatorBounds.height);
        }

        if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
            return undefined;
        }

        return new Region(minX, minY, maxX - minX, maxY - minY);
    }

    /**
     * Retrieves the active interaction indicator lines and anchor.
     * @returns Indicator content and anchor point
     */
    public getInteractionIndicator(): { lines: string[]; anchor: Point } | undefined {
        if (this.isMovingPoint && this.movingPointLocation) {
            let anchor = this.movingPointLocation;
            const element = this.selectedElements[0];
            if (element?.transform) {
                const bounds = element.getBounds();
                if (bounds) {
                    const matrix = Matrix2D.fromTransformString(element.transform, bounds.location);
                    anchor = matrix.transformPoint(anchor);
                }
            }
            return {
                lines: [
                    `pt ${this.movingPointIndex ?? 0}`,
                    `x ${this.formatIndicatorValue(this.movingPointLocation.x)} y ${this.formatIndicatorValue(this.movingPointLocation.y)}`,
                ],
                anchor,
            };
        }

        if (this.isMovingCornerRadius && this.sizeHandles && this.sizeHandles.length > 0) {
            const handle = this.sizeHandles[0];
            const rectangle = handle.element;
            if (rectangle instanceof RectangleElement) {
                const cornerNames = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
                const cornerIndex = handle.handleIndex ?? 0;
                const radii = rectangle.getCornerRadii();
                let anchor = new Point(handle.x, handle.y);
                if (rectangle.transform) {
                    const bounds = rectangle.getBounds();
                    if (bounds) {
                        const matrix = Matrix2D.fromTransformString(rectangle.transform, bounds.location);
                        anchor = matrix.transformPoint(anchor);
                    }
                }
                return {
                    lines: [
                        `corner ${cornerNames[cornerIndex] ?? cornerIndex}`,
                        `radius ${this.formatIndicatorValue(radii[cornerIndex] ?? 0)}`,
                    ],
                    anchor,
                };
            }
        }

        const bounds = this.getInteractionIndicatorBounds();
        if (!bounds) {
            return undefined;
        }

        return {
            lines: [
                `x ${this.formatIndicatorValue(bounds.x)} y ${this.formatIndicatorValue(bounds.y)}`,
                `w ${this.formatIndicatorValue(bounds.width)} h ${this.formatIndicatorValue(bounds.height)}`,
            ],
            anchor: new Point(bounds.x + bounds.width, bounds.y),
        };
    }

    /**
     * Draws the active interaction indicator.
     * @param c - Rendering context
     */
    public drawInteractionIndicator(c: CanvasRenderingContext2D): void {
        const indicator = this.getInteractionIndicator();
        if (!indicator || indicator.lines.length === 0) {
            return;
        }

        const scale = this.scale || 1;
        const offsetX = 8 / scale;
        const offsetY = 8 / scale;
        const lineHeight = 13 / scale;
        const startX = indicator.anchor.x + offsetX;
        const startY = Math.max(lineHeight, indicator.anchor.y - offsetY);

        c.save();
        c.font = `${11 / scale}px sans-serif`;
        c.textAlign = 'left';
        c.textBaseline = 'top';
        c.lineWidth = 3 / scale;
        c.strokeStyle = 'white';
        c.fillStyle = new Color(230, 0, 128, 255).toStyleString();

        indicator.lines.forEach((line, index) => {
            const y = startY + index * lineHeight;
            c.strokeText(line, startX, y);
            c.fillText(line, startX, y);
        });

        c.restore();
    }

    /**
     * Renders model and design components
     */
    public draw(): void {
        if (!this.canvas) {
            return;
        }
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const size = this.model.getSize();
        if (!size) {
            return;
        }

        const context = this.canvas.getContext('2d');
        if (!context) {
            return;
        }
        if (!this.renderer) {
            return;
        }
        this.model.context = context;
        let w = size.width;
        let h = size.height;

        // Clear context
        if (this.scale !== 1.0) {
            context.clearRect(0, 0, w * this.scale, h * this.scale);
        } else {
            context.clearRect(0, 0, w, h);
        }

        if (this.scale !== 1.0) {
            w *= this.scale;
            h *= this.scale;
            context.save();
            context.scale(this.scale, this.scale);
        }

        // Render grid
        this.renderGrid();

        // Render model (already scaled above)
        this.renderer.renderToContext(context, 1.0);

        // Draw handles for selected elements
        for (const el of this.selectedElements) {
            const b = el.getBounds();
            if (!b) {
                continue;
            }
            let reference = new Point(b.x, b.y);
            if (this.isMoving && el.canMove()) {
                reference = this.getElementMoveLocation(el);
            } else if (this.isResizing && el.canResize()) {
                reference = this.getElementMoveLocation(el);
            }

            // Apply element transform
            context.save();
            if (el.transform) {
                this.model.setRenderTransform(context, el.transform, reference);
            }

            // Get element handles
            const handles = this.getElementHandles(el);

            // Draw connector lines
            for (const handle of handles) {
                if (handle.connectedHandles) {
                    for (const connected of handle.connectedHandles) {
                        context.beginPath();
                        context.moveTo(handle.x, handle.y);
                        context.lineTo(connected.x, connected.y);
                        context.strokeStyle = 'white';
                        context.lineWidth = 1.0 / this.scale;
                        context.stroke();
                        context.strokeStyle = 'black';
                        this.drawDashedLine(context, handle.x, handle.y, connected.x, connected.y, 2);
                    }
                }
            }

            // Draw handles
            for (const handle of handles) {
                handle.draw(context);
            }

            context.restore();

            // Draw rotation angle feedback when rotating
            if (this.isRotating && this.rotationCenter) {
                const angle = el.getRotation();
                // Transform local center to canvas space for feedback drawing
                let cx = this.rotationCenter.x;
                let cy = this.rotationCenter.y;
                if (this.originalTransform) {
                    const feedbackMat = Matrix2D.fromTransformString(this.originalTransform, new Point(b.x, b.y));
                    const feedbackCenter = feedbackMat.transformPoint(new Point(cx, cy));
                    cx = feedbackCenter.x;
                    cy = feedbackCenter.y;
                }
                const _scale = this.scale;

                // Draw dashed line from pivot to element center
                context.save();
                context.strokeStyle = new Color(153, 0, 128, 255).toStyleString();
                context.lineWidth = 1.0 / _scale;
                context.setLineDash([4 / _scale, 4 / _scale]);
                context.beginPath();
                context.moveTo(cx, cy);
                const armLen = 40 / _scale;
                const angleRad = (angle * Math.PI) / 180;
                context.lineTo(
                    cx + armLen * Math.cos(angleRad - Math.PI / 2),
                    cy + armLen * Math.sin(angleRad - Math.PI / 2),
                );
                context.stroke();
                context.setLineDash([]);

                // Draw arc showing rotation
                if (Math.abs(angle) > 0.5) {
                    const arcRadius = 30 / _scale;
                    const startRad = -Math.PI / 2;
                    const endRad = startRad + angleRad;
                    context.beginPath();
                    context.arc(cx, cy, arcRadius, startRad, endRad, angle < 0);
                    context.strokeStyle = new Color(128, 0, 128, 255).toStyleString();
                    context.lineWidth = 1.5 / _scale;
                    context.stroke();
                }

                // Draw angle text
                const displayAngle = Math.round(angle * 10) / 10;
                const fontSize = 11 / _scale;
                context.font = `${fontSize}px sans-serif`;
                context.fillStyle = new Color(230, 0, 128, 255).toStyleString();
                context.fillText(`${displayAngle}°`, cx + 8 / _scale, cy - 8 / _scale);
                context.restore();
            }
        }

        this.drawInteractionIndicator(context);

        // Draw rubber band and guidewires
        if (this.enabled) {
            if (this.rubberBandActive) {
                this.drawRubberBand(context);
                // this.drawGuidewires(context, this.currentX + this.currentWidth, this.currentY + this.currentHeight);
            } else if (
                this.isMouseDown &&
                this.currentX !== undefined &&
                this.currentY !== undefined &&
                this.currentWidth !== undefined &&
                this.currentHeight !== undefined &&
                this.selectedElementCount() === 0
            ) {
                this.drawGuidewires(context, this.currentX + this.currentWidth, this.currentY + this.currentHeight);
            } else if ((this.isResizing || this.isMoving) && this.selectedElementCount() === 1) {
                // If single item being resized, show sizing guides
                const el = this.selectedElements[0];
                const s = this.getElementResizeSize(el);
                const p = this.getElementMoveLocation(el);
                let transformed = false;

                // If element is transformed, apply transform to guide wires
                if (el.transform) {
                    context.save();
                    transformed = true;
                    const b = el.getBounds();
                    if (b) {
                        let reference = new Point(b.x, b.y);
                        if (this.isMoving && el.canMove()) {
                            reference = this.getElementMoveLocation(el);
                        } else if (this.isResizing && el.canResize()) {
                            reference = this.getElementMoveLocation(el);
                        }
                        this.model.setRenderTransform(context, el.transform, reference);
                    }
                }

                context.strokeStyle = new Color(166, 0, 0, 0).toStyleString();
                context.lineWidth = 1.0 / this.scale;
                this.drawHorizontalLine(context, p.y);
                this.drawHorizontalLine(context, p.y + s.height);
                this.drawVerticalLine(context, p.x);
                this.drawVerticalLine(context, p.x + s.width);

                context.strokeStyle = new Color(204, 255, 255, 255).toStyleString();
                this.drawDashedHorizontalLine(context, p.y);
                this.drawDashedHorizontalLine(context, p.y + s.height);
                this.drawDashedVerticalLine(context, p.x);
                this.drawDashedVerticalLine(context, p.x + s.width);

                if (transformed) {
                    context.restore();
                }
            }
        }

        if (this.model.displayFPS) {
            context.fillStyle = Color.CornflowerBlue.toStyleString();
            context.font = '16px monospace';
            context.fillText(this.calculateFPS().toFixed() + ' fps', 20, 20);
        }

        // If disabled draw disabled fill
        if (!this.enabled && this.disabledFill) {
            context.fillStyle = Color.parse(this.disabledFill).toStyleString();
            context.fillRect(0, 0, size.width, size.height);
        }

        if (this.scale !== 1.0) {
            context.restore();
        }

        // Clear redraw flag
        this.needsRedraw = false;
    }

    /**
     * Calculates frame rate based on elapsed time since last frame
     */
    public calculateFPS(): number {
        const now = +new Date();
        let fps: number;
        if (this.lastFrameTime) {
            fps = 1000 / (now - this.lastFrameTime);
        } else {
            fps = 0;
        }
        this.lastFrameTime = now;
        return fps;
    }

    /**
     * Sets redraw flag to induce draw on next draw cycle
     */
    public invalidate(): void {
        this.needsRedraw = true;
    }

    /**
     * Retrieves selected element count
     * @returns Number of selected elements
     */
    public selectedElementCount(): number {
        return this.selectedElements.length;
    }

    /**
     * Retrieves selected element
     * @returns Selected element
     */
    public selectedElement(): ElementBase | undefined {
        if (this.selectedElements.length > 0) {
            return this.selectedElements[0];
        }
        return undefined;
    }

    /**
     * Clears selected elements
     */
    public clearSelections(): void {
        if (this.selectedElements.length > 0) {
            this.selectedElements.forEach((el) => {
                if (el.canEditPoints()) {
                    el.editPoints = false;
                }
            });
            this.selectedElements = [];
            this.rotationCenter = undefined;
            this.originalPivotCenter = undefined;
            this.onSelectionChanged();
        }
    }

    /**
     * Returns true if an element is selected
     * @param el - Element
     * @returns True if element is selected
     */
    public isSelected(el: ElementBase): boolean {
        const index = this.selectedElements.indexOf(el);
        if (index === -1) {
            return false;
        }
        return true;
    }

    /**
     * Selects an element
     * @param el - Element
     */
    public selectElement(el: ElementBase): void {
        if (!this.isSelected(el)) {
            this.selectedElements.push(el);
            this.onSelectionChanged();
            return;
        }
    }

    /**
     * Deselects an element
     * @param el - Element
     */
    public deselectElement(el: ElementBase): void {
        const index = this.selectedElements.indexOf(el);
        if (index !== -1) {
            this.selectedElements.splice(index, 1);
            if (el.canEditPoints()) {
                el.editPoints = false;
            }
            this.onSelectionChanged();
        }
    }

    /**
     * Toggles selected state of an element
     * @param el - Element
     */
    public toggleSelected(el: ElementBase): void {
        const index = this.selectedElements.indexOf(el);
        if (index !== -1) {
            if (el.canEditPoints()) {
                if (!el.editPoints) {
                    el.editPoints = true;
                } else {
                    el.editPoints = false;
                    this.selectedElements.splice(index, 1);
                }
            } else {
                this.selectedElements.splice(index, 1);
            }
        } else {
            this.selectedElements.push(el);
        }
        this.onSelectionChanged();
    }

    /**
     * Selects all elements
     */
    public selectAll(): void {
        const c = this;
        c.selectedElements = [];
        if (c.model) {
            c.model.elements.forEach((el) => {
                if (el.interactive) {
                    c.selectedElements.push(el);
                }
            });
        }
        this.onSelectionChanged();
    }

    /**
     * Selects an array of elements
     * @param elements - Elements to select
     */
    public selectElements(elements: ElementBase[]): void {
        if (elements) {
            for (const element of elements) {
                this.selectElement(element);
            }
        }
    }

    /**
     * Duplicates selected elements
     */
    public duplicateSelected(): void {
        const self = this;
        const newSelected: ElementBase[] = [];
        if (this.selectedElements.length > 0) {
            this.selectedElements.forEach((el) => {
                const elc = el.clone();
                elc.setInteractive(true);
                if (self.model) {
                    self.model.add(elc);
                }
                self.onElementAdded(elc);
                newSelected.push(elc);
            });
            this.selectedElements = newSelected;
            this.onSelectionChanged();
            this.setIsDirty(true);
            this.commitUndoSnapshot();
        }
    }

    /**
     * Duplicates the current selection.
     */
    public duplicateSelectedElements(): void {
        this.duplicateSelected();
    }

    public onElementsReordered() {
        this.elementsReordered.trigger(this, this.selectedElements);
        this.onModelUpdated();
        this.commitUndoSnapshot();
        this.drawIfNeeded();
    }

    public moveElementToBottom(el: ElementBase) {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const index = this.model.elements.indexOf(el);
        if (index > 0) {
            this.model.elements.splice(index, 1);
            this.model.elements.splice(0, 0, el);
            this.onElementsReordered();
        }
    }

    public moveElementToTop(el: ElementBase) {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const index = this.model.elements.indexOf(el);
        if (index < this.model.elements.length - 1) {
            this.model.elements.splice(index, 1);
            this.model.elements.splice(this.model.elements.length, 0, el);
            this.onElementsReordered();
        }
    }

    public moveElementBackward(el: ElementBase) {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const index = this.model.elements.indexOf(el);
        if (index > 0) {
            this.model.elements.splice(index, 1);
            this.model.elements.splice(index - 1, 0, el);
            this.onElementsReordered();
        }
    }

    public moveElementForward(el: ElementBase) {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const index = this.model.elements.indexOf(el);
        if (index < this.model.elements.length - 1) {
            this.model.elements.splice(index, 1);
            this.model.elements.splice(index + 1, 0, el);
            this.onElementsReordered();
        }
    }

    /**
     * Moves the provided element, or the current selection, to the back of the z-order.
     * @param el - Optional element target
     */
    public sendToBack(el?: ElementBase): void {
        this.reorderElements(this.getReorderTargets(el), 'back');
    }

    /**
     * Moves the provided element, or the current selection, to the front of the z-order.
     * @param el - Optional element target
     */
    public bringToFront(el?: ElementBase): void {
        this.reorderElements(this.getReorderTargets(el), 'front');
    }

    /**
     * Moves the provided element, or the current selection, one step toward the back.
     * @param el - Optional element target
     */
    public sendBackward(el?: ElementBase): void {
        this.reorderElements(this.getReorderTargets(el), 'backward');
    }

    /**
     * Moves the provided element, or the current selection, one step toward the front.
     * @param el - Optional element target
     */
    public bringForward(el?: ElementBase): void {
        this.reorderElements(this.getReorderTargets(el), 'forward');
    }

    /**
     * Aligns selected movable elements horizontally.
     * @param alignment - left, center, or right
     */
    public alignSelectedHorizontally(alignment: 'left' | 'center' | 'right'): void {
        const bounds = this.getSelectedMovableBounds();
        if (!bounds) {
            return;
        }

        let changed = false;
        for (const selectedElement of this.selectedElements) {
            if (!selectedElement.canMove()) {
                continue;
            }
            const elementBounds = selectedElement.getBounds();
            if (!elementBounds) {
                continue;
            }

            let targetX = elementBounds.x;
            if (alignment === 'left') {
                targetX = bounds.x;
            }
            else if (alignment === 'center') {
                targetX = bounds.x + bounds.width / 2 - elementBounds.width / 2;
            }
            else {
                targetX = bounds.x + bounds.width - elementBounds.width;
            }

            if (Math.abs(targetX - elementBounds.x) > EPSILON) {
                selectedElement.setLocation(new Point(targetX, elementBounds.y));
                const newLocation = selectedElement.getLocation();
                if (newLocation) {
                    this.onElementMoved(selectedElement, newLocation);
                }
                changed = true;
            }
        }

        if (changed) {
            this.onModelUpdated();
            this.commitUndoSnapshot();
            this.drawIfNeeded();
        }
    }

    /**
     * Aligns selected movable elements vertically.
     * @param alignment - top, middle, or bottom
     */
    public alignSelectedVertically(alignment: 'top' | 'middle' | 'bottom'): void {
        const bounds = this.getSelectedMovableBounds();
        if (!bounds) {
            return;
        }

        let changed = false;
        for (const selectedElement of this.selectedElements) {
            if (!selectedElement.canMove()) {
                continue;
            }
            const elementBounds = selectedElement.getBounds();
            if (!elementBounds) {
                continue;
            }

            let targetY = elementBounds.y;
            if (alignment === 'top') {
                targetY = bounds.y;
            }
            else if (alignment === 'middle') {
                targetY = bounds.y + bounds.height / 2 - elementBounds.height / 2;
            }
            else {
                targetY = bounds.y + bounds.height - elementBounds.height;
            }

            if (Math.abs(targetY - elementBounds.y) > EPSILON) {
                selectedElement.setLocation(new Point(elementBounds.x, targetY));
                const newLocation = selectedElement.getLocation();
                if (newLocation) {
                    this.onElementMoved(selectedElement, newLocation);
                }
                changed = true;
            }
        }

        if (changed) {
            this.onModelUpdated();
            this.commitUndoSnapshot();
            this.drawIfNeeded();
        }
    }

    /**
     * Resizes selected elements to the width of the first resizable selected element.
     */
    public resizeSelectedToSameWidth(): void {
        const referenceSize = this.getReferenceResizeSize();
        if (!referenceSize) {
            return;
        }

        this.resizeSelectedElements(referenceSize.width, undefined);
    }

    /**
     * Resizes selected elements to the height of the first resizable selected element.
     */
    public resizeSelectedToSameHeight(): void {
        const referenceSize = this.getReferenceResizeSize();
        if (!referenceSize) {
            return;
        }

        this.resizeSelectedElements(undefined, referenceSize.height);
    }

    /**
     * Resizes selected elements to the size of the first resizable selected element.
     */
    public resizeSelectedToSameSize(): void {
        const referenceSize = this.getReferenceResizeSize();
        if (!referenceSize) {
            return;
        }

        this.resizeSelectedElements(referenceSize.width, referenceSize.height);
    }

    /**
     * Removes resources that are no longer referenced by the current model.
     * @returns Number of removed resources
     */
    public removeUnusedResourcesFromResourceManager(): number {
        if (!this.model) {
            return 0;
        }

        const removed = this.model.resourceManager.pruneUnusedResources();
        if (removed.length === 0) {
            return 0;
        }

        this.onModelUpdated();
        this.commitUndoSnapshot();
        this.drawIfNeeded();
        return removed.length;
    }

    public setIsDirty(isDirty: boolean) {
        if (isDirty !== this.isDirty) {
            this.isDirty = isDirty;
            this.isDirtyChanged.trigger(this, isDirty);
            if (!this.restoringUndoState && !isDirty) {
                this.undoManager.replaceCurrent(this.createUndoSnapshot());
                this.updateUndoAvailability();
            }
        }
    }

    /**
     * Returns number of selected movable elements
     * @returns Number of selected movable elements
     */
    public movableSelectedElementCount(): number {
        let count = 0;
        for (const el of this.selectedElements) {
            if (el.canMove()) {
                count++;
            }
        }
        return count;
    }

    /**
     * Returns number of selected resizable elements
     * @returns Number of selected resizable elements
     */
    public resizeableSelectedElementCount(): number {
        let count = 0;
        for (const el of this.selectedElements) {
            if (el.canResize()) {
                count++;
            }
        }
        return count;
    }

    /**
     * Returns number of selected nudgeable elements
     * @returns Number of selected nudgeable elements
     */
    public nudgeableSelectedElementCount(): number {
        let count = 0;
        for (const el of this.selectedElements) {
            if (el.canNudge()) {
                count++;
            }
        }
        return count;
    }

    /**
     * Clears all element resize sizes
     */
    public clearElementResizeSizes(): void {
        this.elementResizeSizes = [];
    }

    /**
     * Sets an element resize size
     * @param el - Element
     * @param size - Size
     * @param location - Optional location
     */
    public setElementResizeSize(el: ElementBase, size: Size, location?: Point) {
        if (location === undefined) {
            const b = el.getBounds();
            if (b) {
                location = b.location;
            }
        }
        if (!location) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let newWidth = size.width;
        let newHeight = size.height;
        if (!el.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const modelSize = el.model.getSize();
        if (!modelSize) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if (this.constrainToBounds) {
            if (location.x + size.width > modelSize.width) {
                newWidth = modelSize.width - location.x;
            }
            if (location.y + size.height > modelSize.height) {
                newHeight = modelSize.height - location.y;
            }
        }
        const newSize = new Size(newWidth, newHeight);
        if (!this.constrainToBounds || DesignController.isInBounds(location, newSize, el.model, el.transform)) {
            for (const resizeSize of this.elementResizeSizes) {
                if (resizeSize.element === el) {
                    resizeSize.size = newSize;
                    this.onElementSizing(el, newSize);
                    return;
                }
            }
            this.elementResizeSizes.push(new ResizeSize(el, newSize));
            this.onElementSizing(el, newSize);
        }
    }

    /**
     * Gets an element resize size
     * @param el - Element
     * @returns Size
     */
    public getElementResizeSize(el: ElementBase): Size {
        for (const resizeSize of this.elementResizeSizes) {
            if (resizeSize.element === el) {
                return resizeSize.size;
            }
        }
        const b = el.getBounds();
        if (b) {
            return new Size(b.width, b.height);
        }
        throw new Error(ErrorMessages.SizeUndefined);
    }

    /**
     * Clears all element move locations
     */
    public clearElementMoveLocations(): void {
        this.elementMoveLocations = [];
    }

    /**
     * Sets an element move location
     * @param el - Element
     * @param location - Location
     * @param size - Size
     */
    public setElementMoveLocation(el: ElementBase, location: Point, size: Size): void {
        if (!el.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        let newSize: Size | undefined = size;
        if (newSize === undefined) {
            newSize = el.getSize();
        }
        if (!newSize) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        const modelSize = el.model.getSize();
        if (!modelSize) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        let newX = location.x;
        let newY = location.y;
        if (this.constrainToBounds) {
            if (newX < 0) {
                newX = 0;
            } else if (newX + newSize.width > modelSize.width) {
                newX = modelSize.width - newSize.width;
            }
            if (newY < 0) {
                newY = 0;
            } else if (newY + newSize.height > modelSize.height) {
                newY = modelSize.height - newSize.height;
            }
        }
        const newLocation = new Point(newX, newY);
        if (!this.constrainToBounds || DesignController.isInBounds(newLocation, newSize, el.model, el.transform)) {
            for (const moveLocation of this.elementMoveLocations) {
                if (moveLocation.element === el) {
                    moveLocation.location = newLocation;
                    this.onElementMoving(el, newLocation);
                    return;
                }
            }
            this.elementMoveLocations.push(new MoveLocation(el, newLocation));
            this.onElementMoving(el, newLocation);
        }
    }

    /**
     * Gets an element move location
     * @param el - Element
     * @returns Location
     */
    public getElementMoveLocation(el: ElementBase): Point {
        for (const moveLocation of this.elementMoveLocations) {
            if (moveLocation.element === el) {
                return moveLocation.location;
            }
        }
        const b = el.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        return new Point(b.x, b.y);
    }

    /**
     * Nudges size of selected elements
     * @param offsetX - Nudge offset X
     * @param offsetY - Nudge offset Y
     */
    public nudgeSize(offsetX: number, offsetY: number): void {
        // Validate that all can be nudged to new size
        for (const e of this.selectedElements) {
            if (e.canNudge()) {
                const b = e.getBounds();
                if (!b) {
                    return;
                }
                const size = new Size(b.width + offsetX, b.height + offsetY);
                if (size.width <= 0 || size.height <= 0) {
                    return;
                }
                if (
                    this.constrainToBounds &&
                    e.model &&
                    !DesignController.isInBounds(b.location, size, e.model, e.transform)
                ) {
                    return;
                }
            }
        }
        for (const e of this.selectedElements) {
            if (e.canNudge()) {
                e.nudgeSize(offsetX, offsetY);
                const size = e.getSize();
                if (size) {
                    this.onElementSized(e, size);
                    this.setElementResizeSize(e, size, e.getLocation());
                }
            }
        }
        this.onModelUpdated();
        this.commitUndoSnapshot();
        this.drawIfNeeded();
    }

    /**
     * Nudges location of selected elements
     * @param offsetX - Nudge offset X
     * @param offsetY - Nudge offset Y
     */
    public nudgeLocation(offsetX: number, offsetY: number): void {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const modelSize = this.model.getSize();
        if (!modelSize) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        // Validate that all can be nudged to new location
        let allGood = true;
        for (const e of this.selectedElements) {
            if (e.canNudge()) {
                const b = e.getBounds();
                if (!b) {
                    throw new Error(ErrorMessages.BoundsAreUndefined);
                }
                const location = new Point(b.x + offsetX, b.y + offsetY);
                if (
                    this.constrainToBounds &&
                    e.model &&
                    !DesignController.isInBounds(location, b.size, e.model, e.transform)
                ) {
                    allGood = false;
                    break;
                }
            }
        }
        if (!allGood) {
            // Determine maximum we can move and set new offsetX/Y
            let x1 = Number.POSITIVE_INFINITY;
            let x2 = Number.NEGATIVE_INFINITY;
            let y1 = Number.POSITIVE_INFINITY;
            let y2 = Number.NEGATIVE_INFINITY;
            for (const selectedElement of this.selectedElements) {
                if (selectedElement.canNudge()) {
                    const b = selectedElement.getBounds();
                    if (!b) {
                        continue;
                    }
                    if (b.x < x1) {
                        x1 = b.x;
                    }
                    if (b.x + b.width > x2) {
                        x2 = b.x + b.width;
                    }
                    if (b.y < y1) {
                        y1 = b.y;
                    }
                    if (b.y + b.height > y2) {
                        y2 = b.y + b.height;
                    }
                }
            }
            if (offsetX < 0 && x1 + offsetX < 0) {
                offsetX = -x1;
            } else if (offsetX > 0 && x2 + offsetX > modelSize.width) {
                offsetX = modelSize.width - x2;
            }
            if (offsetY < 0 && y1 + offsetY < 0) {
                offsetY = -y1;
            } else if (offsetY > 0 && y2 + offsetY > modelSize.height) {
                offsetY = modelSize.height - y2;
            }
            for (const selectedElement of this.selectedElements) {
                if (selectedElement.canNudge()) {
                    selectedElement.translate(offsetX, offsetY);
                    const b = selectedElement.getBounds();
                    if (b) {
                        this.onElementMoved(selectedElement, b.location);
                    }
                }
            }
        } else {
            // All good move requested amount
            for (const e of this.selectedElements) {
                if (e.canNudge()) {
                    e.translate(offsetX, offsetY);
                    const b = e.getBounds();
                    if (b) {
                        this.onElementMoved(e, b.location);
                    }
                }
            }
        }
        this.onModelUpdated();
        this.commitUndoSnapshot();
        this.drawIfNeeded();
    }

    /**
     * Sets a uniform corner radius on all selected rectangle elements.
     * @param radius - Corner radius value
     */
    public setSelectedRectangleCornerRadius(radius: number): void {
        this.setSelectedRectangleCornerRadii(radius, radius, radius, radius);
    }

    /**
     * Sets individual corner radii on all selected rectangle elements.
     * @param topLeft - Top-left corner radius
     * @param topRight - Top-right corner radius
     * @param bottomRight - Bottom-right corner radius
     * @param bottomLeft - Bottom-left corner radius
     */
    public setSelectedRectangleCornerRadii(
        topLeft: number,
        topRight: number = topLeft,
        bottomRight: number = topLeft,
        bottomLeft: number = topLeft,
    ): void {
        let changed = false;

        for (const selectedElement of this.selectedElements) {
            if (!(selectedElement instanceof RectangleElement)) {
                continue;
            }

            const previousRadii = selectedElement.cornerRadii
                ? [
                    selectedElement.cornerRadii[0],
                    selectedElement.cornerRadii[1],
                    selectedElement.cornerRadii[2],
                    selectedElement.cornerRadii[3],
                ]
                : undefined;

            selectedElement.setCornerRadii(topLeft, topRight, bottomRight, bottomLeft);

            const nextRadii = selectedElement.cornerRadii
                ? [
                    selectedElement.cornerRadii[0],
                    selectedElement.cornerRadii[1],
                    selectedElement.cornerRadii[2],
                    selectedElement.cornerRadii[3],
                ]
                : undefined;

            if (!DesignController.areCornerRadiiEqual(previousRadii, nextRadii)) {
                changed = true;
            }
        }

        if (!changed) {
            return;
        }

        this.onModelUpdated();
        this.commitUndoSnapshot();
        this.drawIfNeeded();
    }

    /**
     * Sets rubber band active state
     * @param value - Rubber band state
     */
    public setRubberBandActive(value: boolean): void {
        if (value !== this.rubberBandActive) {
            this.rubberBandActive = value;
            this.invalidate();
        }
    }

    /**
     * Sets rubber band region
     * @param value - Rubber band region
     */
    public setRubberBandRegion(value: Region): void {
        this.rubberBandRegion = value;
        this.invalidate();
    }

    /**
     * Sets design surface grid type
     * @param value - Rubber band state
     */
    public setGridType(value: GridType): void {
        if (this.gridType !== value) {
            this.gridType = value;
            this.invalidate();
        }
    }

    /**
     * Sets design surface grid spacing
     * @param value - Grid spacing
     */
    public setGridSpacing(value: number): void {
        if (this.gridSpacing !== value && value >= 1) {
            this.gridSpacing = value;
            this.invalidate();
        }
    }

    /**
     * Sets design surface grid color
     * @param value - Grid color
     */
    public setGridColor(value: string): void {
        if (this.gridColor !== value) {
            this.gridColor = value;
            this.invalidate();
        }
    }

    private resetUndoHistory(): void {
        if (!this.model) {
            this.undoManager.clear();
            this.updateUndoAvailability();
            return;
        }
        this.undoManager.reset(this.createUndoSnapshot());
        this.updateUndoAvailability();
    }

    private commitUndoSnapshot(): void {
        if (this.restoringUndoState || !this.model) {
            return;
        }
        this.undoManager.push(this.createUndoSnapshot());
        this.updateUndoAvailability();
    }

    private beginToolHistorySession(): void {
        if (!this.model || this.pendingToolHistoryBaseline !== undefined) {
            return;
        }
        this.pendingToolHistoryBaseline = this.buildModelStateSignature(this.model);
    }

    private finalizeToolHistorySession(): void {
        if (!this.model || this.pendingToolHistoryBaseline === undefined) {
            return;
        }
        const baseline = this.pendingToolHistoryBaseline;
        this.pendingToolHistoryBaseline = undefined;
        if (this.buildModelStateSignature(this.model) !== baseline) {
            this.onModelUpdated();
            this.commitUndoSnapshot();
            this.drawIfNeeded();
        }
    }

    private canApplyUndoRedo(): boolean {
        if (!this.model) {
            return false;
        }
        if (
            this.isMouseDown ||
            this.isMoving ||
            this.isResizing ||
            this.isMovingPoint ||
            this.isRotating ||
            this.isMovingPivot
        ) {
            return false;
        }
        if (this.activeTool && this.activeTool.isCreating) {
            return false;
        }
        return true;
    }

    private updateUndoAvailability(): void {
        const canUndo = this.undoManager.canUndo;
        const canRedo = this.undoManager.canRedo;
        const changed = canUndo !== this.canUndo || canRedo !== this.canRedo;
        this.canUndo = canUndo;
        this.canRedo = canRedo;
        if (changed) {
            this.undoChanged.trigger(this, new UndoState(canUndo, canRedo));
        }
    }

    private createUndoSnapshot(): DesignUndoSnapshot {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const model = this.cloneModelForUndo(this.model);
        const selectedElements = this.selectedElements
            .map((element) => this.createSelectionState(element))
            .filter((value): value is UndoSelectionState => value !== undefined);
        return {
            model,
            selectedElements,
            isDirty: this.isDirty,
            signature: this.buildUndoSignature(model, selectedElements, this.isDirty),
        };
    }

    private createSelectionState(element: ElementBase): UndoSelectionState | undefined {
        if (!this.model) {
            return undefined;
        }
        const index = this.model.elements.indexOf(element);
        if (index === -1) {
            return undefined;
        }
        return {
            id: element.id,
            index,
            editPoints: !!element.editPoints,
        };
    }

    private buildUndoSignature(model: Model, selectedElements: UndoSelectionState[], isDirty: boolean): string {
        const selectionSignature = selectedElements
            .map((selection) => `${selection.id ?? ''}@${selection.index}:${selection.editPoints ? 1 : 0}`)
            .join('|');
        return `${this.buildModelStateSignature(model)}::${isDirty ? 1 : 0}::${selectionSignature}`;
    }

    private getReorderTargets(el?: ElementBase): ElementBase[] {
        if (el) {
            return [el];
        }
        return this.selectedElements.slice();
    }

    private reorderElements(targets: ElementBase[], direction: 'back' | 'front' | 'backward' | 'forward'): void {
        if (!this.model || targets.length === 0) {
            return;
        }

        const targetSet = new Set(targets);
        const original = this.model.elements.slice();
        let reordered = original.slice();

        if (direction === 'back') {
            reordered = original.filter((element) => targetSet.has(element)).concat(original.filter((element) => !targetSet.has(element)));
        }
        else if (direction === 'front') {
            reordered = original.filter((element) => !targetSet.has(element)).concat(original.filter((element) => targetSet.has(element)));
        }
        else if (direction === 'backward') {
            for (let index = 1; index < reordered.length; index++) {
                if (targetSet.has(reordered[index]) && !targetSet.has(reordered[index - 1])) {
                    const temp = reordered[index - 1];
                    reordered[index - 1] = reordered[index];
                    reordered[index] = temp;
                }
            }
        }
        else {
            for (let index = reordered.length - 2; index >= 0; index--) {
                if (targetSet.has(reordered[index]) && !targetSet.has(reordered[index + 1])) {
                    const temp = reordered[index + 1];
                    reordered[index + 1] = reordered[index];
                    reordered[index] = temp;
                }
            }
        }

        if (DesignController.elementsMatchOrder(original, reordered)) {
            return;
        }

        this.model.elements = reordered;
        this.onElementsReordered();
    }

    private getSelectedMovableBounds(): Region | undefined {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let found = false;

        for (const selectedElement of this.selectedElements) {
            if (!selectedElement.canMove()) {
                continue;
            }
            const bounds = selectedElement.getBounds();
            if (!bounds) {
                continue;
            }
            found = true;
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        }

        if (!found) {
            return undefined;
        }

        return new Region(minX, minY, maxX - minX, maxY - minY);
    }

    private getReferenceResizeSize(): Size | undefined {
        for (const selectedElement of this.selectedElements) {
            if (!selectedElement.canResize()) {
                continue;
            }

            const size = selectedElement.getSize();
            if (size) {
                return new Size(size.width, size.height);
            }

            const bounds = selectedElement.getBounds();
            if (bounds) {
                return new Size(bounds.width, bounds.height);
            }
        }

        return undefined;
    }

    private resizeSelectedElements(targetWidth?: number, targetHeight?: number): void {
        let changed = false;

        for (const selectedElement of this.selectedElements) {
            if (!selectedElement.canResize()) {
                continue;
            }

            const bounds = selectedElement.getBounds();
            if (!bounds) {
                continue;
            }

            const nextWidth = targetWidth ?? bounds.width;
            const nextHeight = targetHeight ?? bounds.height;
            if (nextWidth <= 0 || nextHeight <= 0) {
                continue;
            }

            const nextSize = this.getConstrainedResizeTarget(selectedElement, bounds.location, new Size(nextWidth, nextHeight));
            if (Math.abs(nextSize.width - bounds.width) <= EPSILON && Math.abs(nextSize.height - bounds.height) <= EPSILON) {
                continue;
            }

            selectedElement.setSize(nextSize);
            this.onElementSized(selectedElement, nextSize);
            this.setElementResizeSize(selectedElement, nextSize, bounds.location);
            changed = true;
        }

        if (changed) {
            this.onModelUpdated();
            this.commitUndoSnapshot();
            this.drawIfNeeded();
        }
    }

    private getConstrainedResizeTarget(el: ElementBase, location: Point, size: Size): Size {
        let newWidth = size.width;
        let newHeight = size.height;

        if (this.constrainToBounds && el.model) {
            const modelSize = el.model.getSize();
            if (modelSize) {
                if (location.x + newWidth > modelSize.width) {
                    newWidth = modelSize.width - location.x;
                }
                if (location.y + newHeight > modelSize.height) {
                    newHeight = modelSize.height - location.y;
                }
            }
        }

        return new Size(Math.max(newWidth, this.minElementSize.width), Math.max(newHeight, this.minElementSize.height));
    }

    private static elementsMatchOrder(left: ElementBase[], right: ElementBase[]): boolean {
        if (left.length !== right.length) {
            return false;
        }
        for (let index = 0; index < left.length; index++) {
            if (left[index] !== right[index]) {
                return false;
            }
        }
        return true;
    }

    private buildModelStateSignature(model: Model): string {
        const interactiveSignature = model.elements
            .map((element, index) => `${index}:${element.interactive ? 1 : 0}:${element.editPoints ? 1 : 0}`)
            .join('|');
        return `${model.rawJSON()}::${interactiveSignature}`;
    }

    private static areCornerRadiiEqual(
        left?: [number, number, number, number] | number[],
        right?: [number, number, number, number] | number[],
    ): boolean {
        if (!left && !right) {
            return true;
        }
        if (!left || !right || left.length !== right.length) {
            return false;
        }
        for (let index = 0; index < left.length; index++) {
            if (left[index] !== right[index]) {
                return false;
            }
        }
        return true;
    }

    private static getHandleCornerRadii(handle?: Handle): [number, number, number, number] | undefined {
        if (!handle || !Array.isArray(handle.dragValue) || handle.dragValue.length < 4) {
            return undefined;
        }

        const values = handle.dragValue as number[];
        return [0, 1, 2, 3].map((index) => Math.max(0, Number(values[index]) || 0)) as [number, number, number, number];
    }

    private cloneModelForUndo(model: Model): Model {
        const clone = model.clone();
        clone.basePath = model.basePath;
        clone.modelPath = model.modelPath;
        clone.displayFPS = model.displayFPS;
        clone.resourceManager.localResourcePath = model.resourceManager.localResourcePath;
        clone.resourceManager.currentLocaleId = model.resourceManager.currentLocaleId;
        clone.resourceManager.urlProxy = model.resourceManager.urlProxy;
        clone.resources.forEach((resource) => {
            resource.resourceManager = clone.resourceManager;
        });
        clone.elements.forEach((element, index) => {
            const source = model.elements[index];
            if (source) {
                element.interactive = source.interactive;
                element.editPoints = source.editPoints;
            }
            element.model = clone;
        });
        return clone;
    }

    private applyUndoSnapshot(snapshot: DesignUndoSnapshot): void {
        if (!this.model) {
            return;
        }
        this.restoringUndoState = true;
        try {
            const restoredModel = this.cloneModelForUndo(snapshot.model);
            this.restoreModelState(this.model, restoredModel);
            this.restoreSelectionState(snapshot.selectedElements);
            this.resetTransientInteractionState();
            this.setIsDirty(snapshot.isDirty);
            this.modelUpdated.trigger(this, this.model);
            this.invalidate();
            this.drawIfNeeded();
        } finally {
            this.restoringUndoState = false;
            this.updateUndoAvailability();
        }
    }

    private restoreModelState(target: Model, source: Model): void {
        target.type = source.type;
        target.id = source.id;
        target.sizeValue = source.sizeValue ? Size.parse(source.sizeValue) : undefined;
        target.locationValue = source.locationValue ? Point.parse(source.locationValue) : undefined;
        target.locked = source.locked;
        target.aspectLocked = source.aspectLocked;
        target.fill = this.cloneFillValue(source.fill);
        target.fillScale = source.fillScale;
        target.fillOffsetX = source.fillOffsetX;
        target.fillOffsetY = source.fillOffsetY;
        target.stroke = source.stroke;
        target.opacity = source.opacity;
        target.transform = source.transform;
        target.clipPath = source.clipPath
            ? {
                  commands: source.clipPath.commands.slice(),
                  winding: source.clipPath.winding,
                  transform: source.clipPath.transform,
                  units: source.clipPath.units,
              }
            : undefined;
        target.mouseDown = source.mouseDown;
        target.mouseUp = source.mouseUp;
        target.mouseEnter = source.mouseEnter;
        target.mouseLeave = source.mouseLeave;
        target.click = source.click;
        target.basePath = source.basePath;
        target.modelPath = source.modelPath;
        target.displayFPS = source.displayFPS;
        target.resources = source.resources;
        target.elements = source.elements;
        target.resourceManager.model = target;
        target.resourceManager.localResourcePath = source.resourceManager.localResourcePath;
        target.resourceManager.currentLocaleId = source.resourceManager.currentLocaleId;
        target.resourceManager.urlProxy = source.resourceManager.urlProxy;
        target.resourceManager.pendingResources = [];
        target.resourceManager.pendingResourceCount = 0;
        target.resourceManager.totalResourceCount = target.resources.length;
        target.resourceManager.numberLoaded = 0;
        target.resourceManager.resourceFailed = false;
        target.resourceManager.completionCallback = undefined;
        target.resources.forEach((resource) => {
            resource.resourceManager = target.resourceManager;
        });
        target.elements.forEach((element) => {
            element.model = target;
        });
    }

    private cloneFillValue(fill: ElementBase['fill']): ElementBase['fill'] {
        if (!fill || typeof fill === 'string') {
            return fill;
        }
        if ('clone' in fill && typeof fill.clone === 'function') {
            return fill.clone();
        }
        return fill;
    }

    private restoreSelectionState(selectionStates: UndoSelectionState[]): void {
        if (!this.model) {
            return;
        }
        this.selectedElements = [];
        this.model.elements.forEach((element) => {
            element.editPoints = false;
        });
        selectionStates.forEach((selection) => {
            let element: ElementBase | undefined;
            if (selection.id) {
                element = this.model?.elements.find((candidate) => candidate.id === selection.id);
            }
            if (!element) {
                element = this.model?.elements[selection.index];
            }
            if (element && !this.isSelected(element)) {
                element.editPoints = selection.editPoints;
                this.selectedElements.push(element);
            }
        });
        this.onSelectionChanged();
    }

    private resetTransientInteractionState(): void {
        this.isMouseDown = false;
        this.isMoving = false;
        this.isResizing = false;
        this.isRotating = false;
        this.isMovingPivot = false;
        this.isMovingPoint = false;
        this.isMovingCornerRadius = false;
        this.mouseDownPosition = undefined;
        this.currentWidth = 0;
        this.currentHeight = 0;
        this.rotationCenter = undefined;
        this.originalPivotCenter = undefined;
        this.originalTransform = undefined;
        this.movingPointIndex = undefined;
        this.movingPointLocation = undefined;
        this.sizeHandles = undefined;
        this.clearElementMoveLocations();
        this.clearElementResizeSizes();
        this.pendingToolHistoryBaseline = undefined;
    }

    /**
     * Binds existing controller to host DIV element
     * @param hostDiv - Hosting div element
     * @returns This design controller
     */
    public bindTarget(hostDiv: HTMLDivElement) {
        if (!hostDiv) {
            throw new Error(ErrorMessages.HostElementUndefined);
        }
        hostDiv.innerHTML = '';
        if (!hostDiv.id) {
            hostDiv.id = Utility.guid();
        }

        // Disable arrow/navigation keys to prevent scrolling
        // and allow handling in contained canvas
        const ar = [37, 38, 39, 40];

        // Change to use DOM 0 Style binding to prevent multiples
        hostDiv.onkeydown = (e) => {
            const key = e.which;
            ar.forEach((k) => {
                if (k === key) {
                    e.preventDefault();
                    return false;
                }
            });
            return true;
        };

        const canvas = this.getCanvas();
        if (canvas && this.model) {
            hostDiv.appendChild(canvas);
            canvas.setAttribute('id', hostDiv.id + '_canvas');
            const size = this.model.getSize();
            if (!size) {
                throw new Error(ErrorMessages.SizeUndefined);
            }
            hostDiv.style.width = size.width * this.scale + 'px';
            hostDiv.style.height = size.height * this.scale + 'px';
            this.draw();
            this.model.controllerAttached.trigger(this.model, this);
        }
        return this;
    }

    /**
     * Starts a two-finger gesture for zoom and pan.
     * @param e - Touch event
     */
    private beginTouchGesture(e: TouchEvent): void {
        const info = this.getTouchGestureInfo(e.touches);
        if (!info) {
            return;
        }
        this.touchGestureActive = true;
        this.gestureStartDistance = info.distance;
        this.gestureStartScale = this.scale;
        this.gestureLastCenter = new Point(info.centerX, info.centerY);
    }

    /**
     * Applies pinch zoom and host scrolling pan for a two-finger gesture.
     * @param e - Touch event
     */
    private updateTouchGesture(e: TouchEvent): void {
        const info = this.getTouchGestureInfo(e.touches);
        if (!info || !this.gestureStartDistance || !this.gestureStartScale) {
            return;
        }
        const scale = Math.max(0.25, Math.min(8, this.gestureStartScale * (info.distance / this.gestureStartDistance)));
        this.setScale(scale);
        if (this.gestureLastCenter) {
            const panContainer = this.getGesturePanContainer();
            if (panContainer) {
                panContainer.scrollLeft -= info.centerX - this.gestureLastCenter.x;
                panContainer.scrollTop -= info.centerY - this.gestureLastCenter.y;
            }
        }
        this.gestureLastCenter = new Point(info.centerX, info.centerY);
    }

    /**
     * Clears the active two-finger gesture state.
     */
    private endTouchGesture(): void {
        this.touchGestureActive = false;
        this.gestureStartDistance = undefined;
        this.gestureStartScale = undefined;
        this.gestureLastCenter = undefined;
        this.activeTouchId = undefined;
        window.removeEventListener('touchend', this.windowTouchEnd, true);
        window.removeEventListener('touchmove', this.windowTouchMove, true);
        window.removeEventListener('touchcancel', this.windowTouchCancel, true);
    }

    /**
     * Computes pinch distance and center for the first two touches.
     * @param touches - Active touches
     * @returns Gesture information or undefined when fewer than two touches exist
     */
    private getTouchGestureInfo(touches: TouchList): { distance: number; centerX: number; centerY: number } | undefined {
        if (touches.length < 2) {
            return undefined;
        }
        const t1 = touches[0];
        const t2 = touches[1];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        return {
            distance: Math.sqrt(dx * dx + dy * dy),
            centerX: (t1.clientX + t2.clientX) / 2,
            centerY: (t1.clientY + t2.clientY) / 2,
        };
    }

    /**
     * Gets the nearest scroll container that can be used for two-finger panning.
     * @returns Pan container or undefined
     */
    private getGesturePanContainer(): HTMLElement | undefined {
        if (!this.canvas) {
            return undefined;
        }
        const host = this.canvas.parentElement;
        if (!host) {
            return undefined;
        }
        const parent = host.parentElement;
        if (parent) {
            return parent;
        }
        return host;
    }

    /**
     * Finds a touch by identifier.
     * @param touches - Touch list
     * @param identifier - Touch identifier
     * @returns Matching touch or undefined
     */
    private findTouchById(touches: TouchList, identifier: number): Touch | undefined {
        for (let i = 0; i < touches.length; i++) {
            const touch = touches.item(i);
            if (touch && touch.identifier === identifier) {
                return touch;
            }
        }
        return undefined;
    }

    /**
     * Creates a synthetic mouse-like event from a touch.
     * @param touch - Touch instance
     * @param source - Source touch event
     * @returns Synthetic pointer event
     */
    private createTouchMouseEvent(touch: Touch, source: TouchEvent): IMouseEvent {
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            button: 0,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
            altKey: false,
            preventDefault: () => source.preventDefault(),
            stopPropagation: () => source.stopPropagation(),
        };
    }
}
