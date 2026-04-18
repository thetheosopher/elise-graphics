import { ElementCommandHandler } from '../command/element-command-handler';
import { UndoManager, UndoState } from '../command/undo-manager';
import { IController } from '../controller/controller';
import { ControllerEvent, IControllerEvent } from '../controller/controller-event';
import { ControllerEventArgs } from '../controller/controller-event-args';
import { ErrorMessages } from '../core/error-messages';
import { Logging } from '../core/logging';
import { Matrix2D } from '../core/matrix-2d';
import { Model } from '../core/model';
import { IMouseEvent } from '../core/mouse-event';
import { MouseEventArgs } from '../core/mouse-event-args';
import { Point } from '../core/point';
import { PointEventParameters } from '../core/point-event-parameters';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { TimerParameters } from '../core/timer-parameters';
import { Utility } from '../core/utility';
import { ViewDragArgs } from '../core/view-drag-args';
import { translateClientPointToCanvasPixels } from '../core/canvas-display';
import { ElementBase } from '../elements/element-base';
import type { ElementModel } from '../elements/element-base';
import { ElementCreationProps } from '../elements/element-creation-props';
import { ElementDragArgs } from '../elements/element-drag-args';
import { ElementLocationArgs } from '../elements/element-location-args';
import { ElementRotationArgs } from '../elements/element-rotation-args';
import { ElementSizeArgs } from '../elements/element-size-args';
import { MoveLocation } from '../elements/move-location';
import { RectangleElement } from '../elements/rectangle-element';
import { ResizeSize } from '../elements/resize-size';
import { TextElement, type TextRunStyle } from '../elements/text-element';
import { Component } from './component/component';
import { ComponentElement } from './component/component-element';
import { ComponentRegistry } from './component/component-registry';
import { DesignArrangementService, type DesignArrangementHost } from './design-arrangement-service';
import { DesignCanvasInteractionService, type DesignCanvasInteractionHost } from './design-canvas-interaction-service';
import { DesignCanvasLifecycleService, type DesignCanvasLifecycleHost } from './design-canvas-lifecycle-service';
import { DesignClipboardService, type DesignClipboardData } from './design-clipboard-service';
import { DesignContextMenuEventArgs, type DesignContextMenuPointActions } from './design-context-menu-event-args';
import { DesignDrawService, type DesignDrawHost } from './design-draw-service';
import { DesignKeyboardInteractionService, type DesignKeyboardInteractionHost } from './design-keyboard-interaction-service';
import { DesignMouseInteractionService, type DesignMouseInteractionHost } from './design-mouse-interaction-service';
import { DesignMovementService, type DesignMovableSelectionEntry, type DesignSmartAlignmentGuides, type DesignMovementHost } from './design-movement-service';
import { DesignOverlayRenderService, type DesignOverlayRenderHost } from './design-overlay-render-service';
import {
    insertPointAtLocation as insertDesignPointAtLocation,
    isPointEditableDesignElement,
    removePointAtIndex,
    resolveInsertPointAtLocation,
    resolveRemovablePointIndexAtLocation,
    type PathPointInsertionMode,
    type PointEditableDesignElement,
} from './design-point-edit-utils';
import { DesignRenderer } from './design-renderer';
import { DesignSelectionService, type DesignSelectionHost } from './design-selection-service';
import { DesignTextEditingService, type DesignTextEditingHost } from './design-text-editing-service';
import { DesignTouchInteractionService, type DesignTouchInteractionHost } from './design-touch-interaction-service';
import { DesignTransformService, type DesignTransformHost } from './design-transform-service';
import { DesignUndoStateService, type DesignUndoStateHost } from './design-undo-state-service';
import { DesignUndoService, type DesignUndoHost, type DesignUndoSnapshot } from './design-undo-service';
import { GridType } from './grid-type';
import { Handle } from './handle';
import { HandleFactory } from './handle-factory';
import { DesignTool } from './tools/design-tool';

export type { DesignClipboardData } from './design-clipboard-service';

const log = Logging.log;

const EPSILON = 2e-23;

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

        const ar = [37, 38, 39, 40];

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
     * Fired when a context menu is requested over the design surface.
     */
    public contextMenuRequested: IControllerEvent<DesignContextMenuEventArgs> = new ControllerEvent<DesignContextMenuEventArgs>();

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
     * Index of the currently active point handle when point editing is enabled.
     */
    public activePointIndex?: number;

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
     * Active text element being edited on the design surface.
     */
    public editingTextElement?: TextElement;

    /**
     * Current text selection anchor.
     */
    public textSelectionAnchor: number = 0;

    /**
     * Current text selection start.
     */
    public textSelectionStart: number = 0;

    /**
     * Current text selection end.
     */
    public textSelectionEnd: number = 0;

    /**
     * True while the user is dragging a text selection.
     */
    public isSelectingText: boolean = false;

    /**
     * Pending insertion style applied to newly typed text.
     */
    public pendingTextStyle: TextRunStyle = {};

    /**
     * Preferred x-coordinate preserved during vertical caret navigation.
     */
    public textCaretPreferredX?: number;

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
     * Enables smart alignment snapping and guide overlays while moving selections.
     */
    public smartAlignmentEnabled: boolean;

    /**
     * Smart alignment snapping threshold in screen pixels.
     */
    public smartAlignmentThreshold: number;

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
     * True when canvas backing store should follow device pixel ratio automatically.
     */
    public autoPixelRatio: boolean;

    /**
     * Current backing-store pixel ratio.
     */
    public pixelRatio: number;

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
    private smartAlignmentGuides: DesignSmartAlignmentGuides = { vertical: [], horizontal: [] };
    private arrangementService: DesignArrangementService = new DesignArrangementService();
    private canvasInteractionService: DesignCanvasInteractionService = new DesignCanvasInteractionService();
    private canvasLifecycleService: DesignCanvasLifecycleService = new DesignCanvasLifecycleService();
    private clipboardService: DesignClipboardService = new DesignClipboardService();
    private drawService: DesignDrawService = new DesignDrawService();
    private keyboardInteractionService: DesignKeyboardInteractionService = new DesignKeyboardInteractionService();
    private mouseInteractionService: DesignMouseInteractionService = new DesignMouseInteractionService();
    private movementService: DesignMovementService = new DesignMovementService();
    private overlayRenderService: DesignOverlayRenderService = new DesignOverlayRenderService();
    private textEditingService: DesignTextEditingService = new DesignTextEditingService();
    private selectionService: DesignSelectionService = new DesignSelectionService();
    private touchInteractionService: DesignTouchInteractionService = new DesignTouchInteractionService();
    private transformService: DesignTransformService = new DesignTransformService();
    private undoStateService: DesignUndoStateService = new DesignUndoStateService();
    private undoService: DesignUndoService = new DesignUndoService();

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
        this.onCanvasContextMenu = this.onCanvasContextMenu.bind(this);
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
        this.distributeSelectedHorizontally = this.distributeSelectedHorizontally.bind(this);
        this.distributeSelectedVertically = this.distributeSelectedVertically.bind(this);
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
        this.setAutoPixelRatio = this.setAutoPixelRatio.bind(this);
        this.setPixelRatio = this.setPixelRatio.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.refreshPixelRatio = this.refreshPixelRatio.bind(this);
        this.resizeCanvas = this.resizeCanvas.bind(this);
        this.drawSmartAlignmentGuides = this.drawSmartAlignmentGuides.bind(this);
        this.copySelectedToClipboard = this.copySelectedToClipboard.bind(this);
        this.cutSelectedToClipboard = this.cutSelectedToClipboard.bind(this);
        this.pasteFromClipboard = this.pasteFromClipboard.bind(this);

        this.enabled = true;
        this.scale = 1.0;
        this.autoPixelRatio = true;
        this.pixelRatio = 1;
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
        this.activePointIndex = undefined;
        this.lastClientX = -1;
        this.lastClientY = -1;
        this.activeTouchId = undefined;
        this.touchGestureActive = false;
        this.selecting = false;
        this.rubberBandActive = false;
        this.snapToGrid = false;
        this.gridSpacing = 8;
        this.smartAlignmentEnabled = true;
        this.smartAlignmentThreshold = 6;
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
        this.activePointIndex = undefined;
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
            this.refreshPixelRatio(true);
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
            self.activePointIndex = undefined;
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
        this.refreshPixelRatio(true);
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
        this.canvasLifecycleService.createCanvas(this.createCanvasLifecycleHost());
    }

    /**
     * Detaches and destroys current canvas
     */
    public detach(): void {
        log('Detaching event handlers and destroying canvas');
        this.canvasLifecycleService.detach(this.createCanvasLifecycleHost());
    }

    public undo(): boolean {
        return this.undoService.undo(this.createUndoHost());
    }

    public redo(): boolean {
        return this.undoService.redo(this.createUndoHost());
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
                this.refreshPixelRatio(true);
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
        const translated = translateClientPointToCanvasPixels(this.canvas, x, y);
        const effectiveScale = this.scale * this.pixelRatio;
        return new Point(
            Math.round(translated.x / effectiveScale),
            Math.round(translated.y / effectiveScale),
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
        log(`Canvas mouse down ${e.clientX}:${e.clientY}`);
        this.mouseInteractionService.onCanvasMouseDown(this.createMouseInteractionHost(), e);
    }

    /**
     * Handles canvas mouse move event
     * @param e - Mouse event
     */
    public onCanvasMouseMove(e: MouseEvent | IMouseEvent): void {
        this.mouseInteractionService.onCanvasMouseMove(this.createMouseInteractionHost(), e);
    }

    /**
     * Handles canvas mouse up
     * @param e - Mouse event info
     */
    public onCanvasMouseUp(e: MouseEvent | IMouseEvent): void {
        log(`Canvas mouse up ${e.clientX}:${e.clientY}`);
        this.mouseInteractionService.onCanvasMouseUp(this.createMouseInteractionHost(), e);
    }

    /**
     * Handles canvas touch start.
     * Single-touch gestures route through the existing mouse editing path.
     * Two-touch gestures start pinch zoom and pan mode.
     * @param e - Touch event
     */
    public onCanvasTouchStart(e: TouchEvent): void {
        this.touchInteractionService.onCanvasTouchStart(this.createTouchInteractionHost(), e);
    }

    /**
     * Handles canvas touch move.
     * @param e - Touch event
     */
    public onCanvasTouchMove(e: TouchEvent): void {
        this.touchInteractionService.onCanvasTouchMove(this.createTouchInteractionHost(), e);
    }

    /**
     * Handles canvas touch end.
     * @param e - Touch event
     */
    public onCanvasTouchEnd(e: TouchEvent): void {
        this.touchInteractionService.onCanvasTouchEnd(this.createTouchInteractionHost(), e);
    }

    /**
     * Handles canvas touch cancel.
     * @param e - Touch event
     */
    public onCanvasTouchCancel(e: TouchEvent): void {
        this.touchInteractionService.onCanvasTouchCancel(this.createTouchInteractionHost(), e);
    }

    /**
     * Handles canvas key down
     * @param e - DOM Keyboard event
     */
    public onCanvasKeyDown(e: KeyboardEvent): boolean {
        return this.keyboardInteractionService.handleKeyDown(this.createKeyboardInteractionHost(), e);
    }

    /**
     * Fired when drag begins over canvas
     * @param e - Mouse drag event
     */
    public onCanvasDragEnter(e: DragEvent): void {
        log('Canvas drag enter');
        this.canvasInteractionService.onCanvasDragEnter(this.createCanvasInteractionHost(), e);
    }

    /**
     * Fired while drag is occurring over canvas
     * @param e - Mouse drag event
     */
    public onCanvasDragOver(e: DragEvent): void {
        log(`Canvas drag over ${e.clientX}:${e.clientY}`);
        this.canvasInteractionService.onCanvasDragOver(this.createCanvasInteractionHost(), e);
    }

    /**
     * Fired when drag had ended over canvas
     * @param e - Mouse drag event
     */
    public onCanvasDragLeave(e: DragEvent | undefined): void {
        log('Canvas drag leave');
        this.canvasInteractionService.onCanvasDragLeave(this.createCanvasInteractionHost(), e);
    }

    /**
     * Fired while drop occurs on canvas
     * @param e - Mouse drag event
     */
    public onCanvasDrop(e: DragEvent): void {
        log(`Canvas drag over ${e.clientX}:${e.clientY}`);
        this.canvasInteractionService.onCanvasDrop(this.createCanvasInteractionHost(), e);
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
        this.canvasInteractionService.setMouseDownElement(this.createCanvasInteractionHost(), el);
    }

    /**
     * Handles design-surface context menu requests.
     * @param e - Mouse event
     */
    public onCanvasContextMenu(e: MouseEvent | IMouseEvent): void {
        this.canvasInteractionService.onCanvasContextMenu(this.createCanvasInteractionHost(), e);
    }

    /**
     * Sets current mouse over element
     * @param el - Mouse over element
     */
    public setMouseOverElement(el?: ElementBase): void {
        this.canvasInteractionService.setMouseOverElement(this.createCanvasInteractionHost(), el);
    }

    /**
     * Sets current drag over element
     * @param el - Drag over element
     */
    public setDragOverElement(el?: ElementBase, evt?: DragEvent): void {
        this.canvasInteractionService.setDragOverElement(this.createCanvasInteractionHost(), el, evt);
    }

    /**
     * Called when selected elements are changed
     */
    public onSelectionChanged(): void {
        this.activePointIndex = undefined;
        this.canvasInteractionService.onSelectionChanged(this.createCanvasInteractionHost());
    }

    private getSelectedPointEditableElement(element?: ElementBase): PointEditableDesignElement | undefined {
        const candidate = element ?? (this.selectedElements.length === 1 ? this.selectedElements[0] : undefined);
        if (!candidate || this.selectedElements.length !== 1 || this.selectedElements[0] !== candidate) {
            return undefined;
        }
        if (!candidate.editPoints || !isPointEditableDesignElement(candidate)) {
            return undefined;
        }
        return candidate;
    }

    private finalizePointMutation(activePointIndex?: number): void {
        this.activePointIndex = activePointIndex;
        this.setIsDirty(true);
        this.commitUndoSnapshot();
        this.invalidate();
        this.drawIfNeeded();
    }

    public insertPointAtLocation(
        point: Point,
        element?: ElementBase,
        mode: PathPointInsertionMode = 'anchor',
    ): number | undefined {
        const editableElement = this.getSelectedPointEditableElement(element);
        if (!editableElement) {
            return undefined;
        }

        const insertedPointIndex = insertDesignPointAtLocation(editableElement, point, undefined, mode);
        if (insertedPointIndex === undefined) {
            return undefined;
        }

        this.finalizePointMutation(insertedPointIndex);
        return insertedPointIndex;
    }

    public deleteActivePoint(): boolean {
        const editableElement = this.getSelectedPointEditableElement();
        if (!editableElement || this.activePointIndex === undefined) {
            return false;
        }

        if (!removePointAtIndex(editableElement, this.activePointIndex)) {
            return false;
        }

        this.finalizePointMutation(undefined);
        return true;
    }

    private removePointAtLocation(point: Point, element?: ElementBase): boolean {
        const editableElement = this.getSelectedPointEditableElement(element);
        if (!editableElement) {
            return false;
        }

        const removablePointIndex = resolveRemovablePointIndexAtLocation(editableElement, point);
        if (removablePointIndex === undefined || !removePointAtIndex(editableElement, removablePointIndex)) {
            return false;
        }

        this.finalizePointMutation(undefined);
        return true;
    }

    public resolvePointContextMenuActions(point: Point, element?: ElementBase): DesignContextMenuPointActions {
        const editableElement = this.getSelectedPointEditableElement(element);
        if (!editableElement) {
            return {};
        }

        const removablePointIndex = resolveRemovablePointIndexAtLocation(editableElement, point);
        if (removablePointIndex !== undefined) {
            return {
                canRemovePoint: true,
                removePoint: () => this.removePointAtLocation(point, editableElement),
            };
        }

        const insertPointIndex = resolveInsertPointAtLocation(editableElement, point);
        if (insertPointIndex === undefined) {
            return {};
        }

        return {
            canAddPoint: true,
            addPoint: () => this.insertPointAtLocation(point, editableElement) !== undefined,
        };
    }

    /**
     * Begins editing the selected text element.
     * @param element - Optional text element target
     * @param index - Optional caret index
     * @returns True when text editing is active
     */
    public beginTextEdit(element?: TextElement, index?: number): boolean {
        return this.textEditingService.beginTextEdit(this.createTextEditingHost(), element, index);
    }

    /**
     * Ends active text editing.
     */
    public endTextEdit(): void {
        this.textEditingService.endTextEdit(this.createTextEditingHost());
    }

    /**
     * Applies text styling to the active selection or pending insertion style.
     * @param style - Style updates
     * @returns True when style was applied
     */
    public applySelectedTextStyle(style: TextRunStyle): boolean {
        return this.textEditingService.applySelectedTextStyle(this.createTextEditingHost(), style);
    }

    private getSelectedTextElement(): TextElement | undefined {
        if (this.selectedElements.length !== 1) {
            return undefined;
        }
        const selected = this.selectedElements[0];
        return selected instanceof TextElement ? selected : undefined;
    }

    private handleTextEditingKeyDown(e: KeyboardEvent): boolean {
        return this.textEditingService.handleKeyDown(this.createTextEditingHost(), e);
    }

    private createTextEditingHost(): DesignTextEditingHost {
        const self = this;

        return {
            get canvas() {
                return self.canvas;
            },
            get selectedElements() {
                return self.selectedElements;
            },
            get editingTextElement() {
                return self.editingTextElement;
            },
            set editingTextElement(value: TextElement | undefined) {
                self.editingTextElement = value;
            },
            get textSelectionAnchor() {
                return self.textSelectionAnchor;
            },
            set textSelectionAnchor(value: number) {
                self.textSelectionAnchor = value;
            },
            get textSelectionStart() {
                return self.textSelectionStart;
            },
            set textSelectionStart(value: number) {
                self.textSelectionStart = value;
            },
            get textSelectionEnd() {
                return self.textSelectionEnd;
            },
            set textSelectionEnd(value: number) {
                self.textSelectionEnd = value;
            },
            get isSelectingText() {
                return self.isSelectingText;
            },
            set isSelectingText(value: boolean) {
                self.isSelectingText = value;
            },
            get textCaretPreferredX() {
                return self.textCaretPreferredX;
            },
            set textCaretPreferredX(value: number | undefined) {
                self.textCaretPreferredX = value;
            },
            get pendingTextStyle() {
                return self.pendingTextStyle;
            },
            set pendingTextStyle(value: TextRunStyle) {
                self.pendingTextStyle = value;
            },
            invalidate: () => self.invalidate(),
            commitChange: () => {
                self.onModelUpdated();
                self.commitUndoSnapshot();
                self.invalidate();
            },
            readClipboardText: () => self.clipboardService.readText(),
            writeClipboardText: (text: string) => self.clipboardService.writeText(text),
            isDesignClipboardPayload: (text: string) => self.clipboardService.isDesignClipboardPayload(text),
        };
    }

    private resolveTextEditInteractionPoint(textElement: TextElement, bounds: Region, point: Point): Point {
        if (!textElement.transform) {
            return point;
        }

        const inverse = Matrix2D.fromTransformString(textElement.transform, bounds.location).inverse();
        return inverse.transformPoint(point);
    }

    private drawTextEditingOverlay(c: CanvasRenderingContext2D): void {
        this.overlayRenderService.drawTextEditingOverlay(this.createOverlayRenderHost(), c);
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
        if (this.selectedElements.indexOf(el) !== -1) {
            this.activePointIndex = undefined;
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
        this.overlayRenderService.renderGrid(this.createOverlayRenderHost());
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
        this.overlayRenderService.drawDashedLine(c, x1, y1, x2, y2, dashLength);
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
        this.overlayRenderService.drawRubberBand(this.createOverlayRenderHost(), c);
    }

    /**
     * Renders hotspot for rubber band region
     * @param c - Rendering context
     */
    public drawHotspot(c: CanvasRenderingContext2D): void {
        this.overlayRenderService.drawHotspot(this.createOverlayRenderHost(), c);
    }

    /**
     * Renders dashed horizontal line
     * @param c - Rendering context
     * @param y - Y coordinate
     */
    public drawDashedHorizontalLine(c: CanvasRenderingContext2D, y: number) {
        this.overlayRenderService.drawDashedHorizontalLine(this.createOverlayRenderHost(), c, y);
    }

    /**
     * Renders dashed vertical line
     * @param c - Rendering context
     * @param x - X coordinate
     */
    public drawDashedVerticalLine(c: CanvasRenderingContext2D, x: number) {
        this.overlayRenderService.drawDashedVerticalLine(this.createOverlayRenderHost(), c, x);
    }

    /**
     * Renders horizontal line
     * @param c - Rendering context
     * @param y - Y coordinate
     */
    public drawHorizontalLine(c: CanvasRenderingContext2D, y: number) {
        this.overlayRenderService.drawHorizontalLine(this.createOverlayRenderHost(), c, y);
    }

    /**
     * Renders vertical line
     * @param c - Rendering context
     * @param x - X coordinate
     */
    public drawVerticalLine(c: CanvasRenderingContext2D, x: number) {
        this.overlayRenderService.drawVerticalLine(this.createOverlayRenderHost(), c, x);
    }

    /**
     * Renders design guide wires
     * @param c - Rendering context
     * @param x - X coordinate
     * @param y - Y coordinate
     */
    public drawGuidewires(c: CanvasRenderingContext2D, x: number, y: number) {
        this.overlayRenderService.drawGuidewires(this.createOverlayRenderHost(), c, x, y);
    }

    private drawSmartAlignmentGuides(c: CanvasRenderingContext2D): void {
        this.overlayRenderService.drawSmartAlignmentGuides(this.createOverlayRenderHost(), c);
    }

    /**
     * Formats an overlay indicator numeric value.
     * @param value - Value to format
     * @returns Formatted string
     */
    public formatIndicatorValue(value: number): string {
        return this.overlayRenderService.formatIndicatorValue(value);
    }

    /**
     * Computes tentative interaction bounds for the current move/resize gesture.
     * @returns Tentative bounds or undefined when unavailable
     */
    public getInteractionIndicatorBounds(): Region | undefined {
        return this.overlayRenderService.getInteractionIndicatorBounds(this.createOverlayRenderHost());
    }

    private getVisualInteractionBoundsForElement(el: ElementBase): Region | undefined {
        return this.overlayRenderService.getVisualInteractionBoundsForElement(this.createOverlayRenderHost(), el);
    }

    /**
     * Retrieves the active interaction indicator lines and anchor.
     * @returns Indicator content and anchor point
     */
    public getInteractionIndicator(): { lines: string[]; anchor: Point } | undefined {
        return this.overlayRenderService.getInteractionIndicator(this.createOverlayRenderHost());
    }

    /**
     * Draws the active interaction indicator.
     * @param c - Rendering context
     */
    public drawInteractionIndicator(c: CanvasRenderingContext2D): void {
        this.overlayRenderService.drawInteractionIndicator(this.createOverlayRenderHost(), c);
    }

    /**
     * Renders model and design components
     */
    public draw(): void {
        this.drawService.draw(this.createDrawHost());
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
        this.selectionService.clearSelections(this.createSelectionHost());
    }

    /**
     * Returns true if an element is selected
     * @param el - Element
     * @returns True if element is selected
     */
    public isSelected(el: ElementBase): boolean {
        return this.selectionService.isSelected(this.createSelectionHost(), el);
    }

    /**
     * Selects an element
     * @param el - Element
     */
    public selectElement(el: ElementBase): void {
        this.selectionService.selectElement(this.createSelectionHost(), el);
    }

    /**
     * Deselects an element
     * @param el - Element
     */
    public deselectElement(el: ElementBase): void {
        this.selectionService.deselectElement(this.createSelectionHost(), el);
    }

    /**
     * Toggles selected state of an element
     * @param el - Element
     */
    public toggleSelected(el: ElementBase): void {
        this.selectionService.toggleSelected(this.createSelectionHost(), el);
    }

    /**
     * Selects all elements
     */
    public selectAll(): void {
        this.selectionService.selectAll(this.createSelectionHost());
    }

    /**
     * Selects an array of elements
     * @param elements - Elements to select
     */
    public selectElements(elements: ElementBase[]): void {
        this.selectionService.selectElements(this.createSelectionHost(), elements);
    }

    /**
     * Duplicates selected elements
     */
    public duplicateSelected(): void {
        this.arrangementService.duplicateSelected(this.createArrangementHost());
    }

    /**
     * Duplicates the current selection.
     */
    public duplicateSelectedElements(): void {
        this.duplicateSelected();
    }

    /**
     * Copies the current selection to the internal clipboard and, when available, the system clipboard.
     * @returns True when a clipboard payload was created
     */
    public copySelectedToClipboard(): boolean {
        return this.clipboardService.copySelectionToClipboard(this.model, this.selectedElements);
    }

    /**
     * Copies the current selection to the clipboard and removes it from the model.
     * @returns True when the selection was cut
     */
    public cutSelectedToClipboard(): boolean {
        if (!this.copySelectedToClipboard()) {
            return false;
        }

        this.removeSelected();
        return true;
    }

    /**
     * Pastes the most recent Elise clipboard payload.
     * @returns Promise resolving true when elements were pasted
     */
    public async pasteFromClipboard(): Promise<boolean> {
        const pastedElements = await this.clipboardService.pasteFromClipboard({
            model: this.model,
            onElementAdded: (element) => this.onElementAdded(element),
            onResourcesPrepared: () => {
                this.invalidate();
                this.drawIfNeeded();
            },
        });
        if (pastedElements.length === 0) {
            return false;
        }

        this.selectedElements = pastedElements;
        this.onSelectionChanged();
        this.onModelUpdated();
        this.commitUndoSnapshot();
        this.drawIfNeeded();
        return true;
    }

    /**
     * Exports the current selection as a structured clipboard payload.
     * @returns Clipboard payload or undefined when nothing is selected
     */
    public exportSelectionClipboardData(): DesignClipboardData | undefined {
        return this.clipboardService.exportSelectionClipboardData(this.model, this.selectedElements);
    }

    /**
     * Exports the current selection as clipboard JSON text.
     * @returns Clipboard JSON text or undefined when nothing is selected
     */
    public exportSelectionClipboardText(): string | undefined {
        return this.clipboardService.exportSelectionClipboardText(this.model, this.selectedElements);
    }

    /**
     * Pastes Elise clipboard data directly without going through browser clipboard APIs.
     * @param data - Clipboard data object or serialized clipboard JSON
     * @param offsetX - Optional x offset applied to pasted elements. Default is 0.
     * @param offsetY - Optional y offset applied to pasted elements. Default is 0.
     * @returns True when elements were pasted
     */
    public pasteClipboardData(data: string | DesignClipboardData, offsetX?: number, offsetY?: number): boolean {
        const pastedElements = this.clipboardService.pasteClipboardData(data, {
            model: this.model,
            onElementAdded: (element) => this.onElementAdded(element),
            onResourcesPrepared: () => {
                this.invalidate();
                this.drawIfNeeded();
            },
        }, offsetX || 0, offsetY || 0);
        if (pastedElements.length === 0) {
            return false;
        }

        this.selectedElements = pastedElements;
        this.onSelectionChanged();
        this.onModelUpdated();
        this.commitUndoSnapshot();
        this.drawIfNeeded();
        return true;
    }

    public onElementsReordered() {
        this.elementsReordered.trigger(this, this.selectedElements);
        this.onModelUpdated();
        this.commitUndoSnapshot();
        this.drawIfNeeded();
    }

    public moveElementToBottom(el: ElementBase) {
        this.arrangementService.moveElementToBottom(this.createArrangementHost(), el);
    }

    public moveElementToTop(el: ElementBase) {
        this.arrangementService.moveElementToTop(this.createArrangementHost(), el);
    }

    public moveElementBackward(el: ElementBase) {
        this.arrangementService.moveElementBackward(this.createArrangementHost(), el);
    }

    public moveElementForward(el: ElementBase) {
        this.arrangementService.moveElementForward(this.createArrangementHost(), el);
    }

    /**
     * Moves the provided element, or the current selection, to the back of the z-order.
     * @param el - Optional element target
     */
    public sendToBack(el?: ElementBase): void {
        this.arrangementService.sendToBack(this.createArrangementHost(), el);
    }

    /**
     * Moves the provided element, or the current selection, to the front of the z-order.
     * @param el - Optional element target
     */
    public bringToFront(el?: ElementBase): void {
        this.arrangementService.bringToFront(this.createArrangementHost(), el);
    }

    /**
     * Moves the provided element, or the current selection, one step toward the back.
     * @param el - Optional element target
     */
    public sendBackward(el?: ElementBase): void {
        this.arrangementService.sendBackward(this.createArrangementHost(), el);
    }

    /**
     * Moves the provided element, or the current selection, one step toward the front.
     * @param el - Optional element target
     */
    public bringForward(el?: ElementBase): void {
        this.arrangementService.bringForward(this.createArrangementHost(), el);
    }

    /**
     * Aligns selected movable elements horizontally.
     * @param alignment - left, center, or right
     */
    public alignSelectedHorizontally(alignment: 'left' | 'center' | 'right'): void {
        this.arrangementService.alignSelectedHorizontally(this.createArrangementHost(), alignment);
    }

    /**
     * Aligns selected movable elements vertically.
     * @param alignment - top, middle, or bottom
     */
    public alignSelectedVertically(alignment: 'top' | 'middle' | 'bottom'): void {
        this.arrangementService.alignSelectedVertically(this.createArrangementHost(), alignment);
    }

    /**
     * Distributes selected movable elements horizontally with equal spacing.
     */
    public distributeSelectedHorizontally(): void {
        this.arrangementService.distributeSelectedHorizontally(this.createArrangementHost());
    }

    /**
     * Distributes selected movable elements vertically with equal spacing.
     */
    public distributeSelectedVertically(): void {
        this.arrangementService.distributeSelectedVertically(this.createArrangementHost());
    }

    /**
     * Resizes selected elements to the width of the first resizable selected element.
     */
    public resizeSelectedToSameWidth(): void {
        this.arrangementService.resizeSelectedToSameWidth(this.createArrangementHost());
    }

    /**
     * Resizes selected elements to the height of the first resizable selected element.
     */
    public resizeSelectedToSameHeight(): void {
        this.arrangementService.resizeSelectedToSameHeight(this.createArrangementHost());
    }

    /**
     * Resizes selected elements to the size of the first resizable selected element.
     */
    public resizeSelectedToSameSize(): void {
        this.arrangementService.resizeSelectedToSameSize(this.createArrangementHost());
    }

    /**
     * Removes resources that are no longer referenced by the current model.
     * @returns Number of removed resources
     */
    public removeUnusedResourcesFromResourceManager(): number {
        return this.arrangementService.removeUnusedResourcesFromResourceManager(this.createArrangementHost());
    }

    private createArrangementHost(): DesignArrangementHost {
        const self = this;

        return {
            get model() {
                return self.model;
            },
            get selectedElements() {
                return self.selectedElements;
            },
            set selectedElements(value: ElementBase[]) {
                self.selectedElements = value;
            },
            get constrainToBounds() {
                return self.constrainToBounds;
            },
            get minElementSize() {
                return self.minElementSize;
            },
            onElementAdded: (element) => self.onElementAdded(element),
            onElementMoved: (element, location) => self.onElementMoved(element, location),
            onElementSized: (element, size) => self.onElementSized(element, size),
            onSelectionChanged: () => self.onSelectionChanged(),
            onElementsReordered: () => self.onElementsReordered(),
            onModelUpdated: () => self.onModelUpdated(),
            commitUndoSnapshot: () => self.commitUndoSnapshot(),
            drawIfNeeded: () => self.drawIfNeeded(),
            setIsDirty: (isDirty) => self.setIsDirty(isDirty),
            setElementResizeSize: (element, size, location) => self.setElementResizeSize(element, size, location),
        };
    }

    public setIsDirty(isDirty: boolean) {
        if (isDirty !== this.isDirty) {
            this.isDirty = isDirty;
            this.isDirtyChanged.trigger(this, isDirty);
            if (!this.restoringUndoState && !isDirty) {
                this.replaceCurrentUndoSnapshot();
            }
        }
    }

    private replaceCurrentUndoSnapshot(): void {
        this.undoService.replaceCurrentUndoSnapshot(this.createUndoHost());
    }

    private clearControllerEvents(): void {
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
        this.contextMenuRequested.clear();
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
        this.transformService.clearElementResizeSizes(this.createTransformHost());
    }

    /**
     * Sets an element resize size
     * @param el - Element
     * @param size - Size
     * @param location - Optional location
     */
    public setElementResizeSize(el: ElementBase, size: Size, location?: Point) {
        this.transformService.setElementResizeSize(this.createTransformHost(), el, size, location);
    }

    /**
     * Gets an element resize size
     * @param el - Element
     * @returns Size
     */
    public getElementResizeSize(el: ElementBase): Size {
        return this.transformService.getElementResizeSize(this.createTransformHost(), el);
    }

    /**
     * Clears all element move locations
     */
    public clearElementMoveLocations(): void {
        this.transformService.clearElementMoveLocations(this.createTransformHost());
    }

    /**
     * Sets an element move location
     * @param el - Element
     * @param location - Location
     * @param size - Size
     */
    public setElementMoveLocation(el: ElementBase, location: Point, size: Size): void {
        this.transformService.setElementMoveLocation(this.createTransformHost(), el, location, size);
    }

    /**
     * Gets an element move location
     * @param el - Element
     * @returns Location
     */
    public getElementMoveLocation(el: ElementBase): Point {
        return this.transformService.getElementMoveLocation(this.createTransformHost(), el);
    }

    /**
     * Nudges size of selected elements
     * @param offsetX - Nudge offset X
     * @param offsetY - Nudge offset Y
     */
    public nudgeSize(offsetX: number, offsetY: number): void {
        this.transformService.nudgeSize(this.createTransformHost(), offsetX, offsetY);
    }

    /**
     * Nudges location of selected elements
     * @param offsetX - Nudge offset X
     * @param offsetY - Nudge offset Y
     */
    public nudgeLocation(offsetX: number, offsetY: number): void {
        this.transformService.nudgeLocation(this.createTransformHost(), offsetX, offsetY);
    }

    private createTransformHost(): DesignTransformHost {
        const self = this;

        return {
            get model() {
                return self.model;
            },
            get selectedElements() {
                return self.selectedElements;
            },
            set selectedElements(value: ElementBase[]) {
                self.selectedElements = value;
            },
            get elementResizeSizes() {
                return self.elementResizeSizes;
            },
            set elementResizeSizes(value: ResizeSize[]) {
                self.elementResizeSizes = value;
            },
            get elementMoveLocations() {
                return self.elementMoveLocations;
            },
            set elementMoveLocations(value: MoveLocation[]) {
                self.elementMoveLocations = value;
            },
            get constrainToBounds() {
                return self.constrainToBounds;
            },
            onElementSizing: (element, size) => self.onElementSizing(element, size),
            onElementMoving: (element, location) => self.onElementMoving(element, location),
            onElementSized: (element, size) => self.onElementSized(element, size),
            onElementMoved: (element, location) => self.onElementMoved(element, location),
            onModelUpdated: () => self.onModelUpdated(),
            commitUndoSnapshot: () => self.commitUndoSnapshot(),
            drawIfNeeded: () => self.drawIfNeeded(),
            clearSmartAlignmentGuides: () => {
                self.smartAlignmentGuides = { vertical: [], horizontal: [] };
            },
            isInBounds: (location, size, model, transform) => DesignController.isInBounds(location, size, model!, transform),
        };
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
        this.undoService.resetUndoHistory(this.createUndoHost());
    }

    private commitUndoSnapshot(): void {
        this.undoService.commitUndoSnapshot(this.createUndoHost());
    }

    private beginToolHistorySession(): void {
        this.undoService.beginToolHistorySession(this.createUndoHost());
    }

    private finalizeToolHistorySession(): void {
        this.undoService.finalizeToolHistorySession(this.createUndoHost());
    }

    private createUndoSnapshot(): DesignUndoSnapshot {
        return this.undoStateService.createUndoSnapshot(this.createUndoStateHost());
    }

    private getSelectedMovableEntries(): DesignMovableSelectionEntry[] {
        return this.movementService.getSelectedMovableEntries(this.selectedElements);
    }

    private getBoundsForMovableEntries(entries: DesignMovableSelectionEntry[]): Region | undefined {
        return this.movementService.getBoundsForMovableEntries(entries);
    }

    private constrainMoveDeltaToBounds(entries: DesignMovableSelectionEntry[], deltaX: number, deltaY: number): Point {
        return this.movementService.constrainMoveDeltaToBounds(this.createMovementHost(), entries, deltaX, deltaY);
    }

    private snapMoveDeltaToGrid(entries: DesignMovableSelectionEntry[], deltaX: number, deltaY: number): Point {
        return this.movementService.snapMoveDeltaToGrid(this.createMovementHost(), entries, deltaX, deltaY);
    }

    private getSmartAlignmentDelta(
        entries: DesignMovableSelectionEntry[],
        deltaX: number,
        deltaY: number,
    ): { deltaX: number; deltaY: number; guides: DesignSmartAlignmentGuides } {
        return this.movementService.getSmartAlignmentDelta(this.createMovementHost(), entries, deltaX, deltaY);
    }

    private createMovementHost(): DesignMovementHost {
        const self = this;

        return {
            get model() {
                return self.model;
            },
            get selectedElements() {
                return self.selectedElements;
            },
            get constrainToBounds() {
                return self.constrainToBounds;
            },
            get snapToGrid() {
                return self.snapToGrid;
            },
            get smartAlignmentEnabled() {
                return self.smartAlignmentEnabled;
            },
            get smartAlignmentThreshold() {
                return self.smartAlignmentThreshold;
            },
            getNearestSnapX: (newX: number) => self.getNearestSnapX(newX),
            getNearestSnapY: (newY: number) => self.getNearestSnapY(newY),
        };
    }

    private createSelectionHost(): DesignSelectionHost {
        const self = this;

        return {
            get model() {
                return self.model;
            },
            get selectedElements() {
                return self.selectedElements;
            },
            set selectedElements(value: ElementBase[]) {
                self.selectedElements = value;
            },
            onSelectionChanged: () => self.onSelectionChanged(),
        };
    }

    private createUndoHost(): DesignUndoHost {
        const self = this;

        return {
            controller: self,
            get model() {
                return self.model;
            },
            get undoManager() {
                return self.undoManager;
            },
            get canUndo() {
                return self.canUndo;
            },
            set canUndo(value: boolean) {
                self.canUndo = value;
            },
            get canRedo() {
                return self.canRedo;
            },
            set canRedo(value: boolean) {
                self.canRedo = value;
            },
            get restoringUndoState() {
                return self.restoringUndoState;
            },
            get pendingToolHistoryBaseline() {
                return self.pendingToolHistoryBaseline;
            },
            set pendingToolHistoryBaseline(value: string | undefined) {
                self.pendingToolHistoryBaseline = value;
            },
            get isMouseDown() {
                return self.isMouseDown;
            },
            get isMoving() {
                return self.isMoving;
            },
            get isResizing() {
                return self.isResizing;
            },
            get isMovingPoint() {
                return self.isMovingPoint;
            },
            get isRotating() {
                return self.isRotating;
            },
            get isMovingPivot() {
                return self.isMovingPivot;
            },
            get activeToolIsCreating() {
                return !!(self.activeTool && self.activeTool.isCreating);
            },
            undoChanged: self.undoChanged,
            createUndoSnapshot: () => self.createUndoSnapshot(),
            applyUndoSnapshot: (snapshot: DesignUndoSnapshot) => self.applyUndoSnapshot(snapshot),
            buildModelStateSignature: (model: Model) => self.buildModelStateSignature(model),
            onModelUpdated: () => self.onModelUpdated(),
            drawIfNeeded: () => self.drawIfNeeded(),
        };
    }

    private createUndoStateHost(): DesignUndoStateHost {
        const self = this;

        return {
            get model() {
                return self.model;
            },
            get selectedElements() {
                return self.selectedElements;
            },
            get isDirty() {
                return self.isDirty;
            },
            get restoringUndoState() {
                return self.restoringUndoState;
            },
            set restoringUndoState(value: boolean) {
                self.restoringUndoState = value;
            },
            get pendingToolHistoryBaseline() {
                return self.pendingToolHistoryBaseline;
            },
            set pendingToolHistoryBaseline(value: string | undefined) {
                self.pendingToolHistoryBaseline = value;
            },
            get isMouseDown() {
                return self.isMouseDown;
            },
            set isMouseDown(value: boolean) {
                self.isMouseDown = value;
            },
            get isMoving() {
                return self.isMoving;
            },
            set isMoving(value: boolean) {
                self.isMoving = value;
            },
            get isResizing() {
                return self.isResizing;
            },
            set isResizing(value: boolean) {
                self.isResizing = value;
            },
            get isRotating() {
                return self.isRotating;
            },
            set isRotating(value: boolean) {
                self.isRotating = value;
            },
            get isMovingPivot() {
                return self.isMovingPivot;
            },
            set isMovingPivot(value: boolean) {
                self.isMovingPivot = value;
            },
            get isMovingPoint() {
                return self.isMovingPoint;
            },
            set isMovingPoint(value: boolean) {
                self.isMovingPoint = value;
            },
            get isMovingCornerRadius() {
                return self.isMovingCornerRadius;
            },
            set isMovingCornerRadius(value: boolean) {
                self.isMovingCornerRadius = value;
            },
            get mouseDownPosition() {
                return self.mouseDownPosition;
            },
            set mouseDownPosition(value: Point | undefined) {
                self.mouseDownPosition = value;
            },
            get currentWidth() {
                return self.currentWidth || 0;
            },
            set currentWidth(value: number) {
                self.currentWidth = value;
            },
            get currentHeight() {
                return self.currentHeight || 0;
            },
            set currentHeight(value: number) {
                self.currentHeight = value;
            },
            get rotationCenter() {
                return self.rotationCenter;
            },
            set rotationCenter(value: Point | undefined) {
                self.rotationCenter = value;
            },
            get originalPivotCenter() {
                return self.originalPivotCenter;
            },
            set originalPivotCenter(value: Point | undefined) {
                self.originalPivotCenter = value;
            },
            get originalTransform() {
                return self.originalTransform;
            },
            set originalTransform(value: string | undefined) {
                self.originalTransform = value;
            },
            get activePointIndex() {
                return self.activePointIndex;
            },
            set activePointIndex(value: number | undefined) {
                self.activePointIndex = value;
            },
            get movingPointIndex() {
                return self.movingPointIndex;
            },
            set movingPointIndex(value: number | undefined) {
                self.movingPointIndex = value;
            },
            get movingPointLocation() {
                return self.movingPointLocation;
            },
            set movingPointLocation(value: Point | undefined) {
                self.movingPointLocation = value;
            },
            get sizeHandles() {
                return self.sizeHandles;
            },
            set sizeHandles(value: Handle[] | undefined) {
                self.sizeHandles = value;
            },
            setSelectedElements: (value: ElementBase[]) => {
                self.selectedElements = value;
            },
            setIsDirty: (value: boolean) => self.setIsDirty(value),
            triggerModelUpdated: () => {
                if (self.model) {
                    self.modelUpdated.trigger(self, self.model);
                }
            },
            invalidate: () => self.invalidate(),
            drawIfNeeded: () => self.drawIfNeeded(),
            onSelectionChanged: () => self.onSelectionChanged(),
            clearElementMoveLocations: () => self.clearElementMoveLocations(),
            clearElementResizeSizes: () => self.clearElementResizeSizes(),
        };
    }

    private createOverlayRenderHost(): DesignOverlayRenderHost {
        const self = this;

        return {
            get model() {
                return self.model;
            },
            get scale() {
                return self.scale;
            },
            get gridType() {
                return self.gridType;
            },
            get gridSpacing() {
                return self.gridSpacing;
            },
            get gridColor() {
                return self.gridColor;
            },
            get selecting() {
                return self.selecting;
            },
            get rubberBandRegion() {
                return self.rubberBandRegion;
            },
            get activeComponent() {
                return self.activeComponent;
            },
            get fillImage() {
                return self.fillImage;
            },
            get smartAlignmentGuides() {
                return self.smartAlignmentGuides;
            },
            get selectedElements() {
                return self.selectedElements;
            },
            get editingTextElement() {
                return self.editingTextElement;
            },
            get textSelectionStart() {
                return self.textSelectionStart;
            },
            get textSelectionEnd() {
                return self.textSelectionEnd;
            },
            get isMoving() {
                return self.isMoving;
            },
            get isResizing() {
                return self.isResizing;
            },
            get isMovingPoint() {
                return self.isMovingPoint;
            },
            get isMovingCornerRadius() {
                return self.isMovingCornerRadius;
            },
            get movingPointIndex() {
                return self.movingPointIndex;
            },
            get movingPointLocation() {
                return self.movingPointLocation;
            },
            get sizeHandles() {
                return self.sizeHandles;
            },
            getElementMoveLocation: (element: ElementBase) => self.getElementMoveLocation(element),
            getElementResizeSize: (element: ElementBase) => self.getElementResizeSize(element),
        };
    }

    private createDrawHost(): DesignDrawHost {
        const self = this;

        return {
            get canvas() {
                return self.canvas;
            },
            get model() {
                return self.model;
            },
            get renderer() {
                return self.renderer;
            },
            get pixelRatio() {
                return self.pixelRatio;
            },
            get scale() {
                return self.scale;
            },
            get enabled() {
                return self.enabled;
            },
            get rubberBandActive() {
                return self.rubberBandActive;
            },
            get isMouseDown() {
                return self.isMouseDown;
            },
            get isMoving() {
                return self.isMoving;
            },
            get isResizing() {
                return self.isResizing;
            },
            get isRotating() {
                return self.isRotating;
            },
            get currentX() {
                return self.currentX;
            },
            get currentY() {
                return self.currentY;
            },
            get currentWidth() {
                return self.currentWidth;
            },
            get currentHeight() {
                return self.currentHeight;
            },
            get rotationCenter() {
                return self.rotationCenter;
            },
            get originalTransform() {
                return self.originalTransform;
            },
            get disabledFill() {
                return self.disabledFill;
            },
            get selectedElements() {
                return self.selectedElements;
            },
            refreshPixelRatio: () => self.refreshPixelRatio(),
            renderGrid: () => self.renderGrid(),
            drawTextEditingOverlay: (context: CanvasRenderingContext2D) => self.drawTextEditingOverlay(context),
            getElementHandles: (element: ElementBase) => self.getElementHandles(element),
            drawDashedLine: (
                context: CanvasRenderingContext2D,
                x1: number,
                y1: number,
                x2: number,
                y2: number,
                dashLength: number,
            ) => self.drawDashedLine(context, x1, y1, x2, y2, dashLength),
            drawInteractionIndicator: (context: CanvasRenderingContext2D) => self.drawInteractionIndicator(context),
            drawRubberBand: (context: CanvasRenderingContext2D) => self.drawRubberBand(context),
            drawGuidewires: (context: CanvasRenderingContext2D, x: number, y: number) => self.drawGuidewires(context, x, y),
            drawHorizontalLine: (context: CanvasRenderingContext2D, y: number) => self.drawHorizontalLine(context, y),
            drawVerticalLine: (context: CanvasRenderingContext2D, x: number) => self.drawVerticalLine(context, x),
            drawDashedHorizontalLine: (context: CanvasRenderingContext2D, y: number) => self.drawDashedHorizontalLine(context, y),
            drawDashedVerticalLine: (context: CanvasRenderingContext2D, x: number) => self.drawDashedVerticalLine(context, x),
            drawSmartAlignmentGuides: (context: CanvasRenderingContext2D) => self.drawSmartAlignmentGuides(context),
            getVisualInteractionBoundsForElement: (element: ElementBase) => self.getVisualInteractionBoundsForElement(element),
            getElementMoveLocation: (element: ElementBase) => self.getElementMoveLocation(element),
            calculateFPS: () => self.calculateFPS(),
            setNeedsRedraw: (value: boolean) => {
                self.needsRedraw = value;
            },
        };
    }

    private buildModelStateSignature(model: Model): string {
        return this.undoStateService.buildModelStateSignature(model);
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

    private applyUndoSnapshot(snapshot: DesignUndoSnapshot): void {
        this.undoStateService.applyUndoSnapshot(this.createUndoStateHost(), snapshot);
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
     * Enables or disables automatic device-pixel-ratio sizing.
     * @param enabled - True to auto-detect device pixel ratio
     * @param pixelRatio - Optional manual ratio when disabling auto mode
     */
    public setAutoPixelRatio(enabled: boolean, pixelRatio?: number): void {
        this.canvasLifecycleService.setAutoPixelRatio(this.createCanvasLifecycleHost(), enabled, pixelRatio);
    }

    /**
     * Sets a manual backing-store pixel ratio and disables auto-detection.
     * @param pixelRatio - Manual backing-store ratio
     */
    public setPixelRatio(pixelRatio: number): void {
        this.canvasLifecycleService.setPixelRatio(this.createCanvasLifecycleHost(), pixelRatio);
    }

    private onWindowResize(): void {
        this.canvasLifecycleService.onWindowResize(this.createCanvasLifecycleHost());
    }

    private refreshPixelRatio(force?: boolean): boolean {
        return this.canvasLifecycleService.refreshPixelRatio(this.createCanvasLifecycleHost(), force);
    }

    private resizeCanvas(): boolean {
        return this.canvasLifecycleService.resizeCanvas(this.createCanvasLifecycleHost());
    }

    private createTouchInteractionHost(): DesignTouchInteractionHost {
        const self = this;

        return {
            get enabled() {
                return self.enabled;
            },
            get canvas() {
                return self.canvas;
            },
            get scale() {
                return self.scale;
            },
            get activeTouchId() {
                return self.activeTouchId;
            },
            set activeTouchId(value: number | undefined) {
                self.activeTouchId = value;
            },
            get touchGestureActive() {
                return self.touchGestureActive;
            },
            set touchGestureActive(value: boolean) {
                self.touchGestureActive = value;
            },
            get gestureStartDistance() {
                return self.gestureStartDistance;
            },
            set gestureStartDistance(value: number | undefined) {
                self.gestureStartDistance = value;
            },
            get gestureStartScale() {
                return self.gestureStartScale;
            },
            set gestureStartScale(value: number | undefined) {
                self.gestureStartScale = value;
            },
            get gestureLastCenter() {
                return self.gestureLastCenter;
            },
            set gestureLastCenter(value: Point | undefined) {
                self.gestureLastCenter = value;
            },
            get cancelAction() {
                return self.cancelAction;
            },
            set cancelAction(value: boolean) {
                self.cancelAction = value;
            },
            get isMouseDown() {
                return self.isMouseDown;
            },
            setScale: (scale: number) => self.setScale(scale),
            windowTouchEnd: (e: TouchEvent) => self.windowTouchEnd(e),
            windowTouchMove: (e: TouchEvent) => self.windowTouchMove(e),
            windowTouchCancel: (e: TouchEvent) => self.windowTouchCancel(e),
            onCanvasMouseDown: (e: MouseEvent | IMouseEvent) => self.onCanvasMouseDown(e),
            onCanvasMouseMove: (e: MouseEvent | IMouseEvent) => self.onCanvasMouseMove(e),
            onCanvasMouseUp: (e: MouseEvent | IMouseEvent) => self.onCanvasMouseUp(e),
        };
    }

    private createCanvasLifecycleHost(): DesignCanvasLifecycleHost {
        const self = this;

        return {
            controller: self,
            get model() {
                return self.model;
            },
            get canvas() {
                return self.canvas;
            },
            set canvas(value: HTMLCanvasElement | undefined) {
                self.canvas = value;
            },
            get renderer() {
                return self.renderer;
            },
            set renderer(value: DesignRenderer | undefined) {
                self.renderer = value;
            },
            get scale() {
                return self.scale;
            },
            get pixelRatio() {
                return self.pixelRatio;
            },
            set pixelRatio(value: number) {
                self.pixelRatio = value;
            },
            get autoPixelRatio() {
                return self.autoPixelRatio;
            },
            set autoPixelRatio(value: boolean) {
                self.autoPixelRatio = value;
            },
            onCanvasMouseEnter: (e: MouseEvent) => self.onCanvasMouseEnter(e),
            onCanvasMouseLeave: (e: MouseEvent) => self.onCanvasMouseLeave(e),
            onCanvasMouseDown: (e: MouseEvent) => self.onCanvasMouseDown(e),
            onCanvasContextMenu: (e: MouseEvent) => self.onCanvasContextMenu(e),
            onCanvasMouseMove: (e: MouseEvent) => self.onCanvasMouseMove(e),
            onCanvasTouchStart: (e: TouchEvent) => self.onCanvasTouchStart(e),
            onCanvasTouchMove: (e: TouchEvent) => self.onCanvasTouchMove(e),
            onCanvasTouchEnd: (e: TouchEvent) => self.onCanvasTouchEnd(e),
            onCanvasTouchCancel: (e: TouchEvent) => self.onCanvasTouchCancel(e),
            onCanvasKeyDown: (e: KeyboardEvent) => self.onCanvasKeyDown(e),
            onCanvasDragEnter: (e: DragEvent) => self.onCanvasDragEnter(e),
            onCanvasDragOver: (e: DragEvent) => self.onCanvasDragOver(e),
            onCanvasDragLeave: (e: DragEvent) => self.onCanvasDragLeave(e),
            onCanvasDrop: (e: DragEvent) => self.onCanvasDrop(e),
            onWindowResize: () => self.onWindowResize(),
            windowTouchEnd: (e: TouchEvent) => self.windowTouchEnd(e),
            windowTouchMove: (e: TouchEvent) => self.windowTouchMove(e),
            windowTouchCancel: (e: TouchEvent) => self.windowTouchCancel(e),
            detachModelController: () => {
                if (!self.model) {
                    return;
                }
                if (self.model.controller === self) {
                    self.model.controller = undefined;
                }
                self.model.controllerDetached.trigger(self.model, self);
                self.model.controllerDetached.clear();
                self.model.controllerAttached.clear();
            },
            draw: () => self.draw(),
            clearControllerEvents: () => self.clearControllerEvents(),
        };
    }

    private createKeyboardInteractionHost(): DesignKeyboardInteractionHost {
        const self = this;

        return {
            get enabled() {
                return self.enabled;
            },
            get largeJump() {
                return self.largeJump;
            },
            get lastClientX() {
                return self.lastClientX;
            },
            get lastClientY() {
                return self.lastClientY;
            },
            get isMouseDown() {
                return self.isMouseDown;
            },
            get hasActiveTool() {
                return !!self.activeTool;
            },
            handleTextEditingKeyDown: (e: KeyboardEvent) => self.handleTextEditingKeyDown(e),
            drawIfNeeded: () => self.drawIfNeeded(),
            undo: () => self.undo(),
            redo: () => self.redo(),
            copySelectedToClipboard: () => self.copySelectedToClipboard(),
            cutSelectedToClipboard: () => self.cutSelectedToClipboard(),
            pasteFromClipboard: () => self.pasteFromClipboard(),
            nudgeSize: (offsetX: number, offsetY: number) => self.nudgeSize(offsetX, offsetY),
            nudgeLocation: (offsetX: number, offsetY: number) => self.nudgeLocation(offsetX, offsetY),
            selectAll: () => self.selectAll(),
            deleteActivePoint: () => self.deleteActivePoint(),
            deleteSelection: (e: KeyboardEvent) => {
                if (self.onDelete.hasListeners()) {
                    self.onDelete.trigger(self, new ControllerEventArgs(e));
                }
                else {
                    self.removeSelected();
                }
            },
            cancelActiveTool: () => self.activeTool?.cancel(),
            finalizeToolHistorySession: () => self.finalizeToolHistorySession(),
            setCancelAction: (value: boolean) => {
                self.cancelAction = value;
            },
            setSelecting: (value: boolean) => {
                self.selecting = value;
            },
            onCanvasMouseUp: (e: MouseEvent | IMouseEvent) => self.onCanvasMouseUp(e),
            selectedElementCount: () => self.selectedElementCount(),
            clearSelections: () => self.clearSelections(),
        };
    }

    private createMouseInteractionHost(): DesignMouseInteractionHost {
        const self = this;

        return {
            controller: self,
            get enabled() {
                return self.enabled;
            },
            get model() {
                return self.model;
            },
            get canvas() {
                return self.canvas;
            },
            get activeTool() {
                return self.activeTool;
            },
            get mouseDownPosition() {
                return self.mouseDownPosition;
            },
            set mouseDownPosition(value: Point | undefined) {
                self.mouseDownPosition = value;
            },
            get textCaretPreferredX() {
                return self.textCaretPreferredX;
            },
            set textCaretPreferredX(value: number | undefined) {
                self.textCaretPreferredX = value;
            },
            get currentX() {
                return self.currentX;
            },
            set currentX(value: number | undefined) {
                self.currentX = value;
            },
            get currentY() {
                return self.currentY;
            },
            set currentY(value: number | undefined) {
                self.currentY = value;
            },
            get currentWidth() {
                return self.currentWidth;
            },
            set currentWidth(value: number | undefined) {
                self.currentWidth = value;
            },
            get currentHeight() {
                return self.currentHeight;
            },
            set currentHeight(value: number | undefined) {
                self.currentHeight = value;
            },
            get lastClientX() {
                return self.lastClientX;
            },
            set lastClientX(value: number) {
                self.lastClientX = value;
            },
            get lastClientY() {
                return self.lastClientY;
            },
            set lastClientY(value: number) {
                self.lastClientY = value;
            },
            get lastDeltaX() {
                return self.lastDeltaX;
            },
            set lastDeltaX(value: number) {
                self.lastDeltaX = value;
            },
            get lastDeltaY() {
                return self.lastDeltaY;
            },
            set lastDeltaY(value: number) {
                self.lastDeltaY = value;
            },
            get isMouseDown() {
                return self.isMouseDown;
            },
            set isMouseDown(value: boolean) {
                self.isMouseDown = value;
            },
            get isMoving() {
                return self.isMoving;
            },
            set isMoving(value: boolean) {
                self.isMoving = value;
            },
            get isResizing() {
                return self.isResizing;
            },
            set isResizing(value: boolean) {
                self.isResizing = value;
            },
            get isRotating() {
                return self.isRotating;
            },
            set isRotating(value: boolean) {
                self.isRotating = value;
            },
            get isMovingPivot() {
                return self.isMovingPivot;
            },
            set isMovingPivot(value: boolean) {
                self.isMovingPivot = value;
            },
            get isMovingPoint() {
                return self.isMovingPoint;
            },
            set isMovingPoint(value: boolean) {
                self.isMovingPoint = value;
            },
            get isMovingCornerRadius() {
                return self.isMovingCornerRadius;
            },
            set isMovingCornerRadius(value: boolean) {
                self.isMovingCornerRadius = value;
            },
            get isSelectingText() {
                return self.isSelectingText;
            },
            set isSelectingText(value: boolean) {
                self.isSelectingText = value;
            },
            get selecting() {
                return self.selecting;
            },
            set selecting(value: boolean) {
                self.selecting = value;
            },
            get selectionEnabled() {
                return self.selectionEnabled;
            },
            get snapToGrid() {
                return self.snapToGrid;
            },
            get cancelAction() {
                return self.cancelAction;
            },
            set cancelAction(value: boolean) {
                self.cancelAction = value;
            },
            get activePointIndex() {
                return self.activePointIndex;
            },
            set activePointIndex(value: number | undefined) {
                self.activePointIndex = value;
            },
            get movingPointIndex() {
                return self.movingPointIndex;
            },
            set movingPointIndex(value: number | undefined) {
                self.movingPointIndex = value;
            },
            get movingPointLocation() {
                return self.movingPointLocation;
            },
            set movingPointLocation(value: Point | undefined) {
                self.movingPointLocation = value;
            },
            get rubberBandActive() {
                return self.rubberBandActive;
            },
            set rubberBandActive(value: boolean) {
                self.rubberBandActive = value;
            },
            get rubberBandRegion() {
                return self.rubberBandRegion;
            },
            set rubberBandRegion(value: Region | undefined) {
                self.rubberBandRegion = value;
            },
            get sizeHandles() {
                return self.sizeHandles;
            },
            set sizeHandles(value: Handle[] | undefined) {
                self.sizeHandles = value;
            },
            get selectedElements() {
                return self.selectedElements;
            },
            get editingTextElement() {
                return self.editingTextElement;
            },
            get textSelectionAnchor() {
                return self.textSelectionAnchor;
            },
            set textSelectionAnchor(value: number) {
                self.textSelectionAnchor = value;
            },
            get textSelectionStart() {
                return self.textSelectionStart;
            },
            set textSelectionStart(value: number) {
                self.textSelectionStart = value;
            },
            get textSelectionEnd() {
                return self.textSelectionEnd;
            },
            set textSelectionEnd(value: number) {
                self.textSelectionEnd = value;
            },
            get pressedElement() {
                return self.pressedElement;
            },
            set pressedElement(value: ElementBase | undefined) {
                self.pressedElement = value;
            },
            get mouseOverElement() {
                return self.mouseOverElement;
            },
            get rotationCenter() {
                return self.rotationCenter;
            },
            set rotationCenter(value: Point | undefined) {
                self.rotationCenter = value;
            },
            get originalPivotCenter() {
                return self.originalPivotCenter;
            },
            set originalPivotCenter(value: Point | undefined) {
                self.originalPivotCenter = value;
            },
            get originalTransform() {
                return self.originalTransform;
            },
            set originalTransform(value: string | undefined) {
                self.originalTransform = value;
            },
            get rotationStartAngle() {
                return self.rotationStartAngle;
            },
            set rotationStartAngle(value: number) {
                self.rotationStartAngle = value;
            },
            get originalRotation() {
                return self.originalRotation;
            },
            set originalRotation(value: number) {
                self.originalRotation = value;
            },
            get minElementSize() {
                return self.minElementSize;
            },
            mouseDownView: self.mouseDownView,
            get smartAlignmentGuides() {
                return self.smartAlignmentGuides;
            },
            set smartAlignmentGuides(value: DesignSmartAlignmentGuides) {
                self.smartAlignmentGuides = value;
            },
            mouseMovedView: self.mouseMovedView,
            mouseUpView: self.mouseUpView,
            mouseUpElement: self.mouseUpElement,
            elementClicked: self.elementClicked,
            elementCreated: self.elementCreated,
            captureMouse: () => {
                DesignController.captured = self;
                window.addEventListener('mouseup', self.windowMouseUp, true);
                window.addEventListener('mousemove', self.windowMouseMove, true);
            },
            windowToCanvas: (x: number, y: number) => self.windowToCanvas(x, y),
            resolveTextEditInteractionPoint: (element: TextElement, bounds: Region, point: Point) =>
                self.resolveTextEditInteractionPoint(element, bounds, point),
            beginTextEdit: (element?: TextElement, index?: number) => self.beginTextEdit(element, index),
            getSelectedTextElement: () => self.getSelectedTextElement(),
            selectedElementCount: () => self.selectedElementCount(),
            movableSelectedElementCount: () => self.movableSelectedElementCount(),
            resizeableSelectedElementCount: () => self.resizeableSelectedElementCount(),
            getElementHandles: (element: ElementBase) => self.getElementHandles(element),
            getSelectedMovableEntries: () => self.getSelectedMovableEntries(),
            constrainMoveDeltaToBounds: (entries: DesignMovableSelectionEntry[], deltaX: number, deltaY: number) =>
                self.constrainMoveDeltaToBounds(entries, deltaX, deltaY),
            snapMoveDeltaToGrid: (entries: DesignMovableSelectionEntry[], deltaX: number, deltaY: number) =>
                self.snapMoveDeltaToGrid(entries, deltaX, deltaY),
            getSmartAlignmentDelta: (entries: DesignMovableSelectionEntry[], deltaX: number, deltaY: number) =>
                self.getSmartAlignmentDelta(entries, deltaX, deltaY),
            getElementMoveLocation: (element: ElementBase) => self.getElementMoveLocation(element),
            setElementMoveLocation: (element: ElementBase, location: Point, size: Size) =>
                self.setElementMoveLocation(element, location, size),
            getElementResizeSize: (element: ElementBase) => self.getElementResizeSize(element),
            setElementResizeSize: (element: ElementBase, size: Size, location?: Point) =>
                self.setElementResizeSize(element, size, location),
            clearElementMoveLocations: () => self.clearElementMoveLocations(),
            clearElementResizeSizes: () => self.clearElementResizeSizes(),
            onElementMoved: (element: ElementBase, location: Point) => self.onElementMoved(element, location),
            onElementSized: (element: ElementBase, size: Size) => self.onElementSized(element, size),
            onElementRotating: (element: ElementBase, angle: number) => self.onElementRotating(element, angle),
            onElementRotated: (element: ElementBase, angle: number) => self.onElementRotated(element, angle),
            setIsDirty: (value: boolean) => self.setIsDirty(value),
            beginToolHistorySession: () => self.beginToolHistorySession(),
            commitUndoSnapshot: () => self.commitUndoSnapshot(),
            finalizeToolHistorySession: () => self.finalizeToolHistorySession(),
            draw: () => self.draw(),
            drawIfNeeded: () => self.drawIfNeeded(),
            invalidate: () => self.invalidate(),
            setMouseDownElement: (element?: ElementBase) => self.setMouseDownElement(element),
            setMouseOverElement: (element?: ElementBase) => self.setMouseOverElement(element),
            isSelected: (element: ElementBase) => self.isSelected(element),
            onSelectionChanged: () => self.onSelectionChanged(),
            clearSelections: () => self.clearSelections(),
            selectElement: (element: ElementBase) => self.selectElement(element),
            toggleSelected: (element: ElementBase) => self.toggleSelected(element),
            getNearestSnapX: (x: number) => self.getNearestSnapX(x),
            getNearestSnapY: (y: number) => self.getNearestSnapY(y),
            getHandleCornerRadii: (handle?: Handle) => DesignController.getHandleCornerRadii(handle),
            areCornerRadiiEqual: (
                left?: [number, number, number, number] | number[],
                right?: [number, number, number, number] | number[],
            ) => DesignController.areCornerRadiiEqual(left, right),
            insertPointAtLocation: (point: Point, mode?: PathPointInsertionMode) => self.insertPointAtLocation(point, undefined, mode),
        };
    }

    private createCanvasInteractionHost(): DesignCanvasInteractionHost {
        const self = this;

        return {
            controller: self,
            get enabled() {
                return self.enabled;
            },
            get canvas() {
                return self.canvas;
            },
            get model() {
                return self.model;
            },
            get activeToolIsCreating() {
                return !!(self.activeTool && self.activeTool.isCreating);
            },
            get isDragging() {
                return self.isDragging;
            },
            set isDragging(value: boolean) {
                self.isDragging = value;
            },
            get mouseOverElement() {
                return self.mouseOverElement;
            },
            set mouseOverElement(value: ElementBase | undefined) {
                self.mouseOverElement = value;
            },
            get pressedElement() {
                return self.pressedElement;
            },
            set pressedElement(value: ElementBase | undefined) {
                self.pressedElement = value;
            },
            get dragOverElement() {
                return self.dragOverElement;
            },
            set dragOverElement(value: ElementBase | undefined) {
                self.dragOverElement = value;
            },
            get selectedElements() {
                return self.selectedElements;
            },
            get editingTextElement() {
                return self.editingTextElement;
            },
            get rotationCenter() {
                return self.rotationCenter;
            },
            set rotationCenter(value: Point | undefined) {
                self.rotationCenter = value;
            },
            get originalPivotCenter() {
                return self.originalPivotCenter;
            },
            set originalPivotCenter(value: Point | undefined) {
                self.originalPivotCenter = value;
            },
            get restoringUndoState() {
                return self.restoringUndoState;
            },
            mouseEnteredElement: self.mouseEnteredElement,
            mouseLeftElement: self.mouseLeftElement,
            mouseDownElement: self.mouseDownElement,
            mouseUpElement: self.mouseUpElement,
            contextMenuRequested: self.contextMenuRequested,
            selectionChanged: self.selectionChanged,
            elementDragEnter: self.elementDragEnter,
            elementDragLeave: self.elementDragLeave,
            elementDrop: self.elementDrop,
            viewDragEnter: self.viewDragEnter,
            viewDragOver: self.viewDragOver,
            viewDragLeave: self.viewDragLeave,
            viewDrop: self.viewDrop,
            windowToCanvas: (x: number, y: number) => self.windowToCanvas(x, y),
            isSelected: (element: ElementBase) => self.isSelected(element),
            endTextEdit: () => self.endTextEdit(),
            replaceCurrentUndoSnapshot: () => self.replaceCurrentUndoSnapshot(),
            invalidate: () => self.invalidate(),
            drawIfNeeded: () => self.drawIfNeeded(),
            resolvePointContextMenuActions: (point: Point, element?: ElementBase) => self.resolvePointContextMenuActions(point, element),
        };
    }
}

