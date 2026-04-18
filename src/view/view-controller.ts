import { ElementCommandHandler } from '../command/element-command-handler';
import { IController } from '../controller/controller';
import { ControllerEvent } from '../controller/controller-event';
import { ErrorMessages } from '../core/error-messages';
import { KeyboardEventArgs } from '../core/keyboard-event-args';
import { IMouseEvent } from '../core/mouse-event';
import { Logging } from '../core/logging';
import { Model } from '../core/model';
import { MouseEventArgs } from '../core/mouse-event-args';
import { MousePositionInfo } from '../core/mouse-position-info';
import { Point } from '../core/point';
import { PointEventParameters } from '../core/point-event-parameters';
import { TimerParameters } from '../core/timer-parameters';
import { applyCanvasDisplaySize, getDevicePixelRatio, translateClientPointToCanvasPixels } from '../core/canvas-display';
import { ElementBase } from '../elements/element-base';
import { ElementKeyboardEventArgs } from '../elements/element-keyboard-event-args';
import { ViewRenderer } from './view-renderer';

const log = Logging.log;

/**
 * Manages rendering and interaction with rendered model content
 */
export class ViewController implements IController {
    /**
     * Create a new view controller and canvas and bind to host DIV element
     * @param hostDiv - Host div element
     * @param model - Drawing model
     * @param scale - Rendering scale
     * @returns New view controller
     */
    public static initializeTarget(hostDiv: HTMLDivElement, model: Model, scale?: number) {
        log('Initializing view controller target');
        if (!hostDiv) {
            throw new Error(ErrorMessages.HostElementUndefined);
        }
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const size = model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        const viewScale = scale === undefined ? 1 : scale;
        hostDiv.innerHTML = '';
        const controller = new ViewController();
        controller.setScale(viewScale);
        controller.setModel(model);
        const canvas = controller.getCanvas();
        hostDiv.appendChild(canvas);
        controller.canvasHost = hostDiv;
        hostDiv.style.width = size.width * viewScale + 'px';
        hostDiv.style.height = size.height * viewScale + 'px';
        controller.draw();
        model.controllerAttached.trigger(model, controller);
        return controller;
    }

    /**
     * Fired when model is updated
     */
    public modelUpdated: ControllerEvent<Model> = new ControllerEvent<Model>();

    /**
     * Fired when enabled state is changed
     */
    public enabledChanged: ControllerEvent<boolean> = new ControllerEvent<boolean>();

    /**
     * Fired when mouse enters view
     */
    public mouseEnteredView: ControllerEvent<MouseEventArgs> = new ControllerEvent<MouseEventArgs>();

    /**
     * Fired when mouse leaves view
     */
    public mouseLeftView: ControllerEvent<MouseEventArgs> = new ControllerEvent<MouseEventArgs>();

    /**
     * Fired when mouse is pressed over view. Captures mouse activity.
     */
    public mouseDownView: ControllerEvent<PointEventParameters> = new ControllerEvent<PointEventParameters>();

    /**
     * Fired when mouse is released and mouse is captured.
     */
    public mouseUpView: ControllerEvent<PointEventParameters> = new ControllerEvent<PointEventParameters>();

    /**
     * Fired when mouse is moved over view
     */
    public mouseMovedView: ControllerEvent<PointEventParameters> = new ControllerEvent<PointEventParameters>();

    /**
     * Fired when a key is pressed while the view target has focus.
     */
    public keyDown: ControllerEvent<KeyboardEventArgs> = new ControllerEvent<KeyboardEventArgs>();

    /**
     * Fired when a pressed key is released while the view target has focus.
     */
    public keyUp: ControllerEvent<KeyboardEventArgs> = new ControllerEvent<KeyboardEventArgs>();

    /**
     * Fired when a keypress event occurs while the view target has focus.
     */
    public keyPress: ControllerEvent<KeyboardEventArgs> = new ControllerEvent<KeyboardEventArgs>();

    /**
     * Fired when focus enters an element path for runtime keyboard routing.
     */
    public elementFocused: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when focus leaves an element path for runtime keyboard routing.
     */
    public elementBlurred: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when mouse enters element bounds
     */
    public mouseEnteredElement: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when mouse leaves element bounds
     */
    public mouseLeftElement: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when mouse is pressed over element
     */
    public mouseDownElement: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when mouse is released over element
     */
    public mouseUpElement: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when mouse is pressed and released over an element
     */
    public elementClicked: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();

    /**
     * Fired when a key is pressed while an element path is focused.
     */
    public keyDownElement: ControllerEvent<ElementKeyboardEventArgs> = new ControllerEvent<ElementKeyboardEventArgs>();

    /**
     * Fired when a key is released while an element path is focused.
     */
    public keyUpElement: ControllerEvent<ElementKeyboardEventArgs> = new ControllerEvent<ElementKeyboardEventArgs>();

    /**
     * Fired when a keypress occurs while an element path is focused.
     */
    public keyPressElement: ControllerEvent<ElementKeyboardEventArgs> = new ControllerEvent<ElementKeyboardEventArgs>();

    /**
     * Period animation event timer fired when timer is enabled
     */
    public timer: ControllerEvent<TimerParameters> = new ControllerEvent<TimerParameters>();

    /**
     * Controlled model
     */
    public model?: Model;

    /**
     * Canvas rendering target
     */
    public canvas?: HTMLCanvasElement;

    /**
     * Explicit host element that owns canvas layout sizing.
     */
    private canvasHost?: HTMLDivElement;

    /**
     * Current mouse x position
     */
    public currentX?: number;

    /**
     * Current mouse y position
     */
    public currentY?: number;

    /**
     * Mouse down location
     */
    public mouseDownPosition?: Point;

    /**
     * True when mouse is over view
     */
    public isMouseOver: boolean = false;

    /**
     * True when mouse is down and captured over view
     */
    public isMouseDown: boolean = false;

    /**
     * Rendering origin X offset
     */
    public offsetX: number = 0;

    /**
     * Rendering origin y offset
     */
    public offsetY: number = 0;

    /**
     * Rendering scale
     */
    public scale: number = 1;

    /**
     * True when canvas backing store should follow device pixel ratio automatically.
     */
    public autoPixelRatio: boolean;

    /**
     * Current backing-store pixel ratio.
     */
    public pixelRatio: number;

    /**
     * Last mouse movement X delta
     */
    public lastDeltaX?: number;

    /**
     * Last mouse movement Y delta
     */
    public lastDeltaY?: number;

    /**
     * Last mouse client X position
     */
    public lastClientX?: number;

    /**
     * Last mouse client Y position
     */
    public lastClientY?: number;

    /**
     * Topmost element at mouse location
     */
    public mouseOverElement?: ElementBase;

    /**
     * Current hovered element path ordered from deepest to outermost.
     */
    public mouseOverPath: ElementBase[] = [];

    /**
     * Pressed element
     */
    public pressedElement?: ElementBase;

    /**
     * Top-most focused element for runtime keyboard routing.
     */
    public focusedElement?: ElementBase;

    /**
     * Current focused element path ordered from deepest to outermost.
     */
    public focusedPath: ElementBase[] = [];

    /**
     * Current pressed element path ordered from deepest to outermost.
     */
    public pressedPath: ElementBase[] = [];

    /**
     * Touch delayed pending mouse down element
     */
    public pendingMouseDownElement?: ElementBase;

    /**
     * Delayed pending mouse down element path.
     */
    public pendingMouseDownPath: ElementBase[] = [];

    /**
     * Active touch identifier while touch interaction is in progress
     */
    public activeTouchId?: number;

    /**
     * Click cancelled flag
     */
    public clickCancelled: boolean = false;

    /**
     * Cancel action flag
     */
    public cancelAction: boolean = false;

    /**
     * Set internally when view should be redrawn
     */
    public needsRedraw: boolean = false;

    /**
     * Associated view renderer
     */
    public renderer?: ViewRenderer;

    /**
     * Event delay period when using event delay
     */
    public eventDelay: number;

    /**
     * Event delay timer handle
     */
    public eventTimer?: NodeJS.Timeout;

    /**
     * Animation timer start time
     */
    public startTime?: number;

    /**
     * Last animation timer tick time
     */
    public lastTick?: number;

    /**
     * Last frame render time
     */
    public lastFrameTime?: number;

    /**
     * Animation timer handle
     */
    public timerHandle?: number;

    /**
     * Animation timer enabled flag
     */
    public timerEnabled: boolean = false;

    /*
     * Reused object for timer event parameters
     */
    public timerParameters: TimerParameters;

    /**
     * Reused point buffer for mouse coordinate translation
     */
    public pointerBuffer: Point;

    /**
     * Animation timer pause time
     */
    public pauseTime?: number;

    /**
     * User interaction enabled flag
     */
    public enabled: boolean;

    /**
     * Fill to render over disabled view
     */
    public disabledFill?: string;

    /**
     * Command handler for handling routed events
     */
    public commandHandler?: ElementCommandHandler;

    constructor() {
        /** Initialize animation timer function */
        // Animation.initialize();

        this.setModel = this.setModel.bind(this);
        this.setEnabled = this.setEnabled.bind(this);
        this.getCanvas = this.getCanvas.bind(this);
        this.drawIfNeeded = this.drawIfNeeded.bind(this);
        this.createCanvas = this.createCanvas.bind(this);
        this.detach = this.detach.bind(this);
        this.windowToCanvas = this.windowToCanvas.bind(this);
        this.windowMouseUp = this.windowMouseUp.bind(this);
        this.windowMouseMove = this.windowMouseMove.bind(this);
        this.windowTouchEnd = this.windowTouchEnd.bind(this);
        this.windowTouchMove = this.windowTouchMove.bind(this);
        this.windowTouchCancel = this.windowTouchCancel.bind(this);
        this.onCanvasMouseEnter = this.onCanvasMouseEnter.bind(this);
        this.onCanvasMouseLeave = this.onCanvasMouseLeave.bind(this);
        this.onCanvasMouseDown = this.onCanvasMouseDown.bind(this);
        this.onCanvasMouseUp = this.onCanvasMouseUp.bind(this);
        this.onCanvasMouseMove = this.onCanvasMouseMove.bind(this);
        this.onCanvasKeyDown = this.onCanvasKeyDown.bind(this);
        this.onCanvasKeyUp = this.onCanvasKeyUp.bind(this);
        this.onCanvasKeyPress = this.onCanvasKeyPress.bind(this);
        this.onCanvasTouchStart = this.onCanvasTouchStart.bind(this);
        this.onCanvasTouchMove = this.onCanvasTouchMove.bind(this);
        this.onCanvasTouchEnd = this.onCanvasTouchEnd.bind(this);
        this.onCanvasTouchCancel = this.onCanvasTouchCancel.bind(this);
        this.setMouseDownElement = this.setMouseDownElement.bind(this);
        this.setMouseDownPath = this.setMouseDownPath.bind(this);
        this.setMouseOverElement = this.setMouseOverElement.bind(this);
        this.setMouseOverPath = this.setMouseOverPath.bind(this);
        this.setFocusedElement = this.setFocusedElement.bind(this);
        this.setFocusedPath = this.setFocusedPath.bind(this);
        this.getActiveElementPath = this.getActiveElementPath.bind(this);
        this.dispatchPathEvent = this.dispatchPathEvent.bind(this);
        this.dispatchPathKeyboardEvent = this.dispatchPathKeyboardEvent.bind(this);
        this.setScale = this.setScale.bind(this);
        this.onModelUpdated = this.onModelUpdated.bind(this);
        this.draw = this.draw.bind(this);
        this.calculateFPS = this.calculateFPS.bind(this);
        this.invalidate = this.invalidate.bind(this);
        this.startTimer = this.startTimer.bind(this);
        this.pauseTimer = this.pauseTimer.bind(this);
        this.resumeTimer = this.resumeTimer.bind(this);
        this.stopTimer = this.stopTimer.bind(this);
        this.tick = this.tick.bind(this);
        this.elapsedTime = this.elapsedTime.bind(this);
        this.timerPhase = this.timerPhase.bind(this);
        this.bindTarget = this.bindTarget.bind(this);
        this.windowToCanvasWithOutput = this.windowToCanvasWithOutput.bind(this);
        this.setAutoPixelRatio = this.setAutoPixelRatio.bind(this);
        this.setPixelRatio = this.setPixelRatio.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.refreshPixelRatio = this.refreshPixelRatio.bind(this);
        this.resizeCanvas = this.resizeCanvas.bind(this);

        this.enabled = true;
        this.scale = 1;
        this.autoPixelRatio = true;
        this.pixelRatio = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.lastDeltaX = -1;
        this.lastDeltaY = -1;
        this.eventDelay = 0;
        this.activeTouchId = undefined;

        this.timerParameters = new TimerParameters(0, 0);
        this.pointerBuffer = new Point(0, 0);
    }

    /**
     * Sets controller model
     * @param model - Drawing model
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
        log('Setting view controller model');
        this.model = model;
        this.model.controller = this;
        this.currentX = undefined;
        this.currentY = undefined;
        this.isMouseDown = false;
        this.mouseDownPosition = undefined;
        this.mouseOverElement = undefined;
        this.pressedElement = undefined;
        this.focusedElement = undefined;
        this.focusedPath = [];
        this.activeTouchId = undefined;
        this.lastDeltaX = -1;
        this.lastDeltaY = -1;
        this.offsetX = 0;
        this.offsetY = 0;
        if (!this.canvas) {
            this.createCanvas();
        }
        else if (this.model) {
            this.refreshPixelRatio(true);
        }
        if (this.model.elements !== undefined && this.model.elements.length > 0) {
            this.model.elements.forEach(element => {
                if (element.interactive === undefined) {
                    element.interactive = true;
                }
            });
        }
        this.draw();
        model.controllerAttached.trigger(model, this);
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
        if (arguments.length > 1) {
            this.disabledFill = disabledFill;
        }
        if (!enabled) {
            if (this.isMouseDown) {
                this.cancelAction = true;
                if (this.lastClientX && this.lastClientY) {
                    this.onCanvasMouseUp(new MousePositionInfo(this.lastClientX, this.lastClientY));
                }
            }
        }
        this.draw();
        this.enabledChanged.trigger(this, enabled);
    }

    /**
     * Creates if necessary and returns canvas element
     */
    public getCanvas(): HTMLCanvasElement {
        if (!this.canvas) {
            this.createCanvas();
        }
        if (!this.canvas) {
            throw new Error(ErrorMessages.CanvasIsUndefined);
        }
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const size = this.model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
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
    public createCanvas(): void {
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
        canvas.setAttribute('tabindex', '0');
        canvas.style.touchAction = 'none';
        canvas.addEventListener('mouseenter', self.onCanvasMouseEnter);
        canvas.addEventListener('mouseleave', self.onCanvasMouseLeave);
        canvas.addEventListener('mousedown', self.onCanvasMouseDown);
        canvas.addEventListener('mousemove', self.onCanvasMouseMove);
        canvas.addEventListener('keydown', self.onCanvasKeyDown);
        canvas.addEventListener('keyup', self.onCanvasKeyUp);
        canvas.addEventListener('keypress', self.onCanvasKeyPress);
        canvas.addEventListener('touchstart', self.onCanvasTouchStart, { passive: false });
        canvas.addEventListener('touchmove', self.onCanvasTouchMove, { passive: false });
        canvas.addEventListener('touchend', self.onCanvasTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', self.onCanvasTouchCancel, { passive: false });

        self.canvas = canvas;
        self.renderer = new ViewRenderer(self);
        self.refreshPixelRatio(true);
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('resize', self.onWindowResize, true);
        }
    }

    /**
     * Detaches and destroys current canvas
     */
    public detach(): void {
        if (this.eventTimer) {
            clearTimeout(this.eventTimer);
            this.eventTimer = undefined;
        }
        window.removeEventListener('mouseup', this.windowMouseUp, true);
        window.removeEventListener('mousemove', this.windowMouseMove, true);
        window.removeEventListener('touchend', this.windowTouchEnd, true);
        window.removeEventListener('touchmove', this.windowTouchMove, true);
        window.removeEventListener('touchcancel', this.windowTouchCancel, true);
        window.removeEventListener('resize', this.onWindowResize, true);
        this.stopTimer();
        if (this.model) {
            if (this.model.controller === this) {
                this.model.controller = undefined;
            }
            this.model.controllerDetached.trigger(this.model, this);
            this.model.controllerDetached.clear();
            this.model.controllerAttached.clear();
        }
        if (!this.canvas) {
            return;
        }
        log('Detaching event handlers and destroying canvas');
        this.canvas.removeEventListener('mouseenter', this.onCanvasMouseEnter);
        this.canvas.removeEventListener('mouseleave', this.onCanvasMouseLeave);
        this.canvas.removeEventListener('mousedown', this.onCanvasMouseDown);
        this.canvas.removeEventListener('mousemove', this.onCanvasMouseMove);
        this.canvas.removeEventListener('keydown', this.onCanvasKeyDown);
        this.canvas.removeEventListener('keyup', this.onCanvasKeyUp);
        this.canvas.removeEventListener('keypress', this.onCanvasKeyPress);
        this.canvas.removeEventListener('touchstart', this.onCanvasTouchStart);
        this.canvas.removeEventListener('touchmove', this.onCanvasTouchMove);
        this.canvas.removeEventListener('touchend', this.onCanvasTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.onCanvasTouchCancel);
        const element = this.canvas.parentElement;
        if (element) {
            element.removeChild(this.canvas);
        }
        this.mouseEnteredView.clear();
        this.mouseLeftView.clear();
        this.mouseDownView.clear();
        this.mouseUpView.clear();
        this.mouseMovedView.clear();
        this.keyDown.clear();
        this.keyUp.clear();
        this.keyPress.clear();
        this.elementFocused.clear();
        this.elementBlurred.clear();
        this.elementClicked.clear();
        this.mouseDownElement.clear();
        this.mouseEnteredElement.clear();
        this.mouseLeftElement.clear();
        this.mouseUpElement.clear();
        this.keyDownElement.clear();
        this.keyUpElement.clear();
        this.keyPressElement.clear();
        this.modelUpdated.clear();
        this.enabledChanged.clear();
        if (this.timer) {
            this.timer.clear();
        }
        this.canvas = undefined;
        this.canvasHost = undefined;
    }

    /**
     * Translates raw window coordinates to model coordinates
     * compensating for current scale and origin offset
     * @param x - Raw x coordinate
     * @param y - Raw y coordinate
     */
    public windowToCanvas(x: number, y: number): Point {
        return this.windowToCanvasWithOutput(x, y);
    }

    /**
     * Translates raw window coordinates to model coordinates and writes to
     * the provided output point when supplied.
     * @param x - Raw x coordinate
     * @param y - Raw y coordinate
     * @param out - Optional output point to avoid allocations
     */
    public windowToCanvasWithOutput(x: number, y: number, out?: Point): Point {
        if (!this.canvas || !this.model) {
            if (out) {
                out.x = x;
                out.y = y;
                return out;
            }
            return new Point(x, y);
        }
        const bounds = this.canvas.getBoundingClientRect();
        const size = this.model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        const translated = translateClientPointToCanvasPixels(this.canvas, x, y);
        let x1 = translated.x;
        let y1 = translated.y;
        const effectiveScale = this.scale * this.pixelRatio;
        if (effectiveScale !== 1) {
            x1 /= effectiveScale;
            y1 /= effectiveScale;
        }
        if (this.isMouseOver) {
            if (x1 < 0) {
                x1 = 0;
            }
            if (x1 > size.width - 1) {
                x1 = size.width - 1;
            }
            if (y1 < 0) {
                y1 = 0;
            }
            if (y1 > size.height - 1) {
                y1 = size.height - 1;
            }
        }
        x1 = x1 + this.offsetX;
        y1 = y1 + this.offsetY;
        if (out) {
            out.x = x1;
            out.y = y1;
            return out;
        }
        return new Point(x1, y1);
    }

    /**
     * Handles captured mouse up event
     * @param e - Window mouse up event
     */
    public windowMouseUp(e: MouseEvent) {
        if (this.isMouseDown) {
            log(`Window mouse up ${e.clientX}:${e.clientY}`);
            this.onCanvasMouseUp(e);
            this.drawIfNeeded();
        }
    }

    /**
     * Handles captured mouse move event
     * @param e - Window mouse up event
     */
    public windowMouseMove(e: MouseEvent) {
        if (this.isMouseDown) {
            log(`Window mouse move ${e.clientX}:${e.clientY}`);
            e.preventDefault();
            e.stopPropagation();
            this.onCanvasMouseMove(e);
            this.drawIfNeeded();
        }
    }

    /**
     * Handles captured touch end event
     * @param e - Window touch end event
     */
    public windowTouchEnd(e: TouchEvent) {
        if (this.activeTouchId !== undefined) {
            this.onCanvasTouchEnd(e);
            this.drawIfNeeded();
        }
    }

    /**
     * Handles captured touch move event
     * @param e - Window touch move event
     */
    public windowTouchMove(e: TouchEvent) {
        if (this.activeTouchId !== undefined) {
            e.preventDefault();
            e.stopPropagation();
            this.onCanvasTouchMove(e);
            this.drawIfNeeded();
        }
    }

    /**
     * Handles captured touch cancel event
     * @param e - Window touch cancel event
     */
    public windowTouchCancel(e: TouchEvent) {
        if (this.activeTouchId !== undefined) {
            this.onCanvasTouchCancel(e);
            this.drawIfNeeded();
        }
    }

    /**
     * Handles canvas mouse enter event
     * @param e - DOM event
     */
    public onCanvasMouseEnter(e: MouseEvent) {
        log(`Canvas mouse enter`);
        this.isMouseOver = true;
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
     * @param e - DOM event
     */
    public onCanvasMouseLeave(e: MouseEvent) {
        log('Canvas mouse leave');
        this.isMouseOver = false;
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
    public onCanvasMouseDown(e: MouseEvent | IMouseEvent) {
        const self = this;
        log(`Canvas mouse down ${e.clientX}:${e.clientY}`);
        window.addEventListener('mouseup', self.windowMouseUp, true);
        window.addEventListener('mousemove', self.windowMouseMove, true);

        if (!self.enabled) {
            return;
        }
        if (!self.canvas) {
            return;
        }
        if (!self.model) {
            return;
        }
        self.lastClientX = e.clientX;
        self.lastClientY = e.clientY;
        const p = self.windowToCanvasWithOutput(e.clientX, e.clientY, self.pointerBuffer);
        const context = self.canvas.getContext('2d');
        if (!context) {
            throw new Error(ErrorMessages.CanvasContextIsNull);
        }
        self.currentX = p.x;
        self.currentY = p.y;
        self.mouseDownPosition = Point.create(p.x, p.y);
        self.isMouseDown = true;
        self.mouseDownView.trigger(self, new PointEventParameters(e, self.mouseDownPosition));
        const activePath = self.getActiveElementPath(context, p.x, p.y);
        const activeElement = activePath.length > 0 ? activePath[0] : undefined;
        self.setFocusedPath(activePath);
        self.clickCancelled = false;
        if (self.eventDelay > 0) {
            self.pendingMouseDownElement = activeElement;
            self.pendingMouseDownPath = activePath;
            if (self.eventTimer) {
                clearTimeout(self.eventTimer);
                self.eventTimer = undefined;
            }
            self.eventTimer = setTimeout(() => {
                if (!self.clickCancelled) {
                    self.setMouseDownPath(self.pendingMouseDownPath);
                }
            }, self.eventDelay);
        }
        else {
            self.setMouseDownPath(activePath);
        }
        self.drawIfNeeded();
    }

    /**
     * Handles canvas mouse move event
     * @param e - Mouse event
     */
    public onCanvasMouseMove(e: MouseEvent | IMouseEvent): void {
        log(`Canvas mouse move ${e.clientX}:${e.clientY}`);

        if (!this.enabled) {
            return;
        }
        if (!this.model) {
            return;
        }
        if (this.lastClientX) {
            const deltaX = this.lastClientX - e.clientX;
            if (Math.abs(deltaX) > 8) {
                this.clickCancelled = true;
            }
        }
        const p = this.windowToCanvasWithOutput(e.clientX, e.clientY, this.pointerBuffer);
        if (p.x === this.currentX && this.currentY === p.y) {
            return;
        }
        this.currentX = p.x;
        this.currentY = p.y;
        this.mouseMovedView.trigger(this, new PointEventParameters(e, p));
        if (!this.canvas) {
            return;
        }
        const context = this.canvas.getContext('2d');
        if (!context) {
            throw new Error(ErrorMessages.CanvasContextIsNull);
        }
        const activePath = this.getActiveElementPath(context, p.x, p.y);
        this.setMouseOverPath(activePath);
    }

    /**
     * Handles canvas key down while the runtime view has focus.
     * @param e - DOM keyboard event
     * @returns True if keyboard listeners were notified
     */
    public onCanvasKeyDown(e: KeyboardEvent): boolean {
        if (!this.enabled) {
            return false;
        }
        let handled = false;
        if (this.keyDown.hasListeners()) {
            this.keyDown.trigger(this, new KeyboardEventArgs(e));
            handled = true;
        }
        handled = this.dispatchPathKeyboardEvent(this.keyDownElement, e) || handled;
        return handled;
    }

    /**
     * Handles canvas key up while the runtime view has focus.
     * @param e - DOM keyboard event
     * @returns True if keyboard listeners were notified
     */
    public onCanvasKeyUp(e: KeyboardEvent): boolean {
        if (!this.enabled) {
            return false;
        }
        let handled = false;
        if (this.keyUp.hasListeners()) {
            this.keyUp.trigger(this, new KeyboardEventArgs(e));
            handled = true;
        }
        handled = this.dispatchPathKeyboardEvent(this.keyUpElement, e) || handled;
        return handled;
    }

    /**
     * Handles canvas key press while the runtime view has focus.
     * @param e - DOM keyboard event
     * @returns True if keyboard listeners were notified
     */
    public onCanvasKeyPress(e: KeyboardEvent): boolean {
        if (!this.enabled) {
            return false;
        }
        let handled = false;
        if (this.keyPress.hasListeners()) {
            this.keyPress.trigger(this, new KeyboardEventArgs(e));
            handled = true;
        }
        handled = this.dispatchPathKeyboardEvent(this.keyPressElement, e) || handled;
        return handled;
    }

    /**
     * Handles canvas mouse up
     * @param e - Mouse event info
     */
    public onCanvasMouseUp(e: MouseEvent | MousePositionInfo) {
        log(`Canvas mouse up ${e.clientX}:${e.clientY}`);
        window.removeEventListener('mouseup', this.windowMouseUp, true);
        window.removeEventListener('mousemove', this.windowMouseMove, true);

        if (!this.enabled) {
            return;
        }
        if (!this.isMouseDown) {
            return;
        }
        this.lastClientX = e.clientX;
        this.lastClientY = e.clientY;
        const p = this.windowToCanvasWithOutput(e.clientX, e.clientY, this.pointerBuffer);
        this.currentX = p.x;
        this.currentY = p.y;
        this.isMouseDown = false;
        this.mouseUpView.trigger(this, new PointEventParameters(e, p));
        if (this.pressedPath.length > 0) {
            const target = this.pressedPath[0];
            this.dispatchPathEvent(this.mouseUpElement, this.pressedPath);
            if (!this.clickCancelled) {
                if (target === this.mouseOverElement) {
                    this.dispatchPathEvent(this.elementClicked, this.pressedPath);
                }
            }
            this.pressedPath = [];
            this.pressedElement = undefined;
        }
        else if (this.pendingMouseDownPath.length > 0 && !this.clickCancelled) {
            this.setMouseOverPath(this.pendingMouseDownPath);
            this.setMouseDownPath(this.pendingMouseDownPath);
            this.dispatchPathEvent(this.mouseUpElement, this.pendingMouseDownPath);
            this.dispatchPathEvent(this.elementClicked, this.pendingMouseDownPath);
            this.pendingMouseDownElement = undefined;
            this.pendingMouseDownPath = [];
        }
        this.drawIfNeeded();
    }

    /**
     * Handles canvas touch start by routing the primary touch through the existing mouse path.
     * @param e - Touch event
     */
    public onCanvasTouchStart(e: TouchEvent): void {
        if (e.touches.length !== 1) {
            return;
        }
        const touch = e.touches[0];
        this.activeTouchId = touch.identifier;
        this.isMouseOver = true;
        e.preventDefault();
        e.stopPropagation();
        window.addEventListener('touchend', this.windowTouchEnd, true);
        window.addEventListener('touchmove', this.windowTouchMove, true);
        window.addEventListener('touchcancel', this.windowTouchCancel, true);
        this.onCanvasMouseDown(this.createTouchMouseEvent(touch, e));
    }

    /**
     * Handles canvas touch move for the active touch.
     * @param e - Touch event
     */
    public onCanvasTouchMove(e: TouchEvent): void {
        if (this.activeTouchId === undefined) {
            return;
        }
        const touch = this.findTouchById(e.touches, this.activeTouchId);
        if (!touch) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        this.onCanvasMouseMove(this.createTouchMouseEvent(touch, e));
    }

    /**
     * Handles canvas touch end for the active touch.
     * @param e - Touch event
     */
    public onCanvasTouchEnd(e: TouchEvent): void {
        if (this.activeTouchId === undefined) {
            return;
        }
        const touch = this.findTouchById(e.changedTouches, this.activeTouchId);
        if (!touch) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        window.removeEventListener('touchend', this.windowTouchEnd, true);
        window.removeEventListener('touchmove', this.windowTouchMove, true);
        window.removeEventListener('touchcancel', this.windowTouchCancel, true);
        this.activeTouchId = undefined;
        this.isMouseOver = false;
        this.onCanvasMouseUp(this.createTouchMouseEvent(touch, e));
    }

    /**
     * Handles canvas touch cancel for the active touch.
     * @param e - Touch event
     */
    public onCanvasTouchCancel(e: TouchEvent): void {
        this.clickCancelled = true;
        this.onCanvasTouchEnd(e);
    }

    /**
     * Sets current mouse down element
     * @param el - Mouse down element
     */
    public setMouseDownElement(el: ElementBase | undefined) {
        this.setMouseDownPath(el ? [el] : []);
    }

    /**
     * Sets current mouse down element path.
     * @param path - Mouse down path ordered from deepest to outermost
     */
    public setMouseDownPath(path: ElementBase[]) {
        if (path.length > 0) {
            this.setMouseOverPath(path);
        }
        if (path.length === this.pressedPath.length && path.every((element, index) => element === this.pressedPath[index])) {
            return;
        }
        if (this.pressedPath.length > 0) {
            this.dispatchPathEvent(this.mouseUpElement, this.pressedPath);
        }
        this.pressedPath = path.slice();
        this.pressedElement = this.pressedPath.length > 0 ? this.pressedPath[0] : undefined;
        if (this.pressedPath.length > 0) {
            this.dispatchPathEvent(this.mouseDownElement, this.pressedPath);
        }
    }

    /**
     * Sets current mouse over element
     * @param el -Mouse over element
     */
    public setMouseOverElement(el: ElementBase | undefined) {
        this.setMouseOverPath(el ? [el] : []);
    }

    /**
     * Sets current focused element.
     * @param el - Focused element
     */
    public setFocusedElement(el: ElementBase | undefined) {
        this.setFocusedPath(el ? [el] : []);
    }

    /**
     * Sets current focused element path for runtime keyboard routing.
     * @param path - Focused path ordered from deepest to outermost
     */
    public setFocusedPath(path: ElementBase[]) {
        if (path.length === this.focusedPath.length && path.every((element, index) => element === this.focusedPath[index])) {
            return;
        }

        for (const existing of this.focusedPath) {
            if (path.indexOf(existing) === -1) {
                this.elementBlurred.trigger(this, existing);
            }
        }

        for (let index = path.length - 1; index >= 0; index--) {
            const next = path[index];
            if (this.focusedPath.indexOf(next) === -1) {
                this.elementFocused.trigger(this, next);
            }
        }

        this.focusedPath = path.slice();
        this.focusedElement = this.focusedPath.length > 0 ? this.focusedPath[0] : undefined;
    }

    /**
     * Sets current hovered element path.
     * @param path - Hovered path ordered from deepest to outermost
     */
    public setMouseOverPath(path: ElementBase[]) {
        if (path.length === this.mouseOverPath.length && path.every((element, index) => element === this.mouseOverPath[index])) {
            return;
        }

        for (const existing of this.mouseOverPath) {
            if (path.indexOf(existing) === -1) {
                this.mouseLeftElement.trigger(this, existing);
            }
        }

        for (let index = path.length - 1; index >= 0; index--) {
            const next = path[index];
            if (this.mouseOverPath.indexOf(next) === -1) {
                this.mouseEnteredElement.trigger(this, next);
            }
        }

        this.mouseOverPath = path.slice();
        this.mouseOverElement = this.mouseOverPath.length > 0 ? this.mouseOverPath[0] : undefined;
        if (this.canvas) {
            if (this.mouseOverElement) {
                this.canvas.style.cursor = 'pointer';
            }
            else {
                this.canvas.style.cursor = 'default';
            }
        }
    }

    private getActiveElementPath(context: CanvasRenderingContext2D, x: number, y: number): ElementBase[] {
        const modelWithPath = this.model as Model & {
            activeElementPathAt?: (c: CanvasRenderingContext2D, tx: number, ty: number) => ElementBase[];
        };
        if (modelWithPath.activeElementPathAt) {
            return modelWithPath.activeElementPathAt(context, x, y);
        }

        const activeElement = this.model?.firstActiveElementAt(context, x, y);
        return activeElement ? [activeElement] : [];
    }

    private dispatchPathEvent(event: ControllerEvent<ElementBase>, path: ElementBase[]): void {
        for (const element of path) {
            event.trigger(this, element);
        }
    }

    private dispatchPathKeyboardEvent(event: ControllerEvent<ElementKeyboardEventArgs>, keyboardEvent: KeyboardEvent): boolean {
        if (this.focusedPath.length === 0 || !event.hasListeners()) {
            return false;
        }
        for (const element of this.focusedPath) {
            event.trigger(this, new ElementKeyboardEventArgs(keyboardEvent, element));
        }
        return true;
    }

    /**
     * Sets rendering scale.  Recreates or sizes target canvas.
     * @param scale scale
     */
    public setScale(scale: number) {
        if (scale === this.scale) {
            return;
        }
        this.scale = scale;
        if (!this.model) {
            return;
        }
        if (!this.canvas) {
            return;
        }
        const size = this.model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        this.refreshPixelRatio(true);
        this.draw();
    }

    /**
     * Called when model is updated. Sets redraw flag and triggers
     * model updated event
     */
    public onModelUpdated(): void {
        if (!this.model) {
            return;
        }
        this.modelUpdated.trigger(this, this.model);
        this.invalidate();
    }

    /**
     * Renders model to canvas and clears redraw flag
     */
    public draw(): void {
        if (!this.canvas) {
            return;
        }
        if (!this.model) {
            return;
        }
        const context = this.beginRenderContext();

        if (!this.renderer) {
            throw new Error(ErrorMessages.RendererIsUndefined);
        }
        this.renderer.renderToContext(context, this.scale);
        context.restore();

        if (this.model.displayFPS) {
            context.save();
            context.scale(this.pixelRatio, this.pixelRatio);
            context.fillStyle = 'cornflowerblue';
            context.font = '16px monospace';
            context.fillText(this.calculateFPS().toFixed() + ' fps', 20, 20);
            context.restore();
        }

        // Clear redraw flag
        this.needsRedraw = false;
    }

    /**
     * Prepares a direct-rendering context with current backing-store sizing and viewport transform.
     */
    public applyRenderViewport(context: CanvasRenderingContext2D, clear: boolean = false): void {
        if (!this.canvas) {
            throw new Error(ErrorMessages.CanvasIsUndefined);
        }

        this.refreshPixelRatio();

        if (typeof context.setTransform === 'function') {
            context.setTransform(1, 0, 0, 1, 0, 0);
        }
        else if (typeof context.resetTransform === 'function') {
            context.resetTransform();
        }

        if (clear) {
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        context.scale(this.pixelRatio, this.pixelRatio);
        context.translate(-this.offsetX * this.scale, -this.offsetY * this.scale);
    }

    /**
     * Begins direct rendering
     */
    public beginDraw(): CanvasRenderingContext2D {
        const context = this.beginRenderContext();
        if (!this.renderer) {
            throw new Error(ErrorMessages.RendererIsUndefined);
        }
        this.renderer.renderToContext(context, this.scale);

        return context;
    }

    private beginRenderContext(): CanvasRenderingContext2D {
        if (!this.canvas) {
            throw new Error(ErrorMessages.CanvasIsUndefined);
        }
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const size = this.model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }

        const context = this.canvas.getContext('2d');
        if (!context) {
            throw new Error(ErrorMessages.CanvasContextIsNull);
        }
        this.model.context = context;
        context.save();
        this.applyRenderViewport(context, true);

        return context;
    }

    /**
     * Ends direct rendering
     */
    public endDraw(context: CanvasRenderingContext2D) {
        // Render model
        // this.renderer.renderToContext(context, this.scale);

        // Restore from offset
        context.restore();

        // Clear redraw flag
        this.needsRedraw = false;
    }

    /**
     * Calculates frame rate based on elapsed time since last frame
     */
    public calculateFPS(): number {
        const now = +new Date();
        let fps = 0;
        if (this.lastFrameTime !== undefined) {
            fps = 1000 / (now - this.lastFrameTime);
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
     * Starts animation timer to induce period tick events
     * @param offset - Timer start offset
     */
    public startTimer(offset: number = 0): void {
        this.startTime = +new Date();
        if (offset) {
            this.startTime += offset * 1000;
        }
        this.lastTick = 0.0;
        if (this.timerEnabled) {
            return;
        }
        this.timerEnabled = true;
        const controller = this;
        this.timerHandle = window.requestAnimationFrame(controller.tick);
    }

    /**
     * Pauses animation timer
     */
    public pauseTimer(): void {
        if (!this.timerEnabled) {
            return;
        }
        this.pauseTime = +new Date();
        this.timerEnabled = false;
        if (this.timerHandle !== undefined) {
            window.cancelAnimationFrame(this.timerHandle);
            this.timerHandle = undefined;
        }
    }

    /**
     * Resumes animation timer at time paused
     */
    public resumeTimer(): void {
        if (this.timerEnabled) {
            return;
        }
        const controller = this;
        const now = +new Date();
        if (this.pauseTime !== undefined && controller.startTime !== undefined) {
            const elapsed = now - this.pauseTime;
            controller.startTime += elapsed;
        }
        else {
            controller.startTime = now;
        }
        controller.pauseTime = undefined;
        controller.timerEnabled = true;
        this.timerHandle = window.requestAnimationFrame(controller.tick);
    }

    /**
     * Stops animation timer
     */
    public stopTimer() {
        if (!this.timerEnabled) {
            return;
        }
        this.timerEnabled = false;
        if (this.timerHandle !== undefined) {
            window.cancelAnimationFrame(this.timerHandle);
            this.timerHandle = undefined;
        }
    }

    /**
     * Animation timer callback. Called by system animation frame timer and induces tick event when timer is enabled.
     */
    public tick() {
        const controller = this;
        if (controller.timerEnabled) {
            try {
                this.timerParameters.elapsedTime = controller.elapsedTime();
                if (controller.lastTick !== undefined) {
                    this.timerParameters.tickDelta = this.timerParameters.elapsedTime - controller.lastTick;
                }
                else {
                    this.timerParameters.tickDelta = 0;
                }
                controller.lastTick = this.timerParameters.elapsedTime;
                controller.timer.trigger(controller, this.timerParameters);
                controller.drawIfNeeded();
            }
            catch (error) {
                controller.timerEnabled = false;
                this.timerHandle = undefined;
                const message = error instanceof Error ? error.message : String(error);
                log(`Animation timer stopped due to error: ${message}`);
                return;
            }
            this.timerHandle = window.requestAnimationFrame(controller.tick);
        }
        else {
            this.timerHandle = undefined;
        }
    }

    /**
     * Computes animation timer elapsed time
     */
    public elapsedTime(): number {
        const now = +new Date();
        if (this.startTime !== undefined) {
            return (now - this.startTime) / 1000.0;
        }
        else {
            return 0;
        }
    }

    /**
     * Binds existing controller to host DIV element
     * @param hostDiv - Hosting div element
     * @returns This view controller
     */
    public bindTarget(hostDiv: HTMLDivElement) {
        if (!hostDiv) {
            throw new Error(ErrorMessages.HostElementUndefined);
        }
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const size = this.model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        hostDiv.innerHTML = '';
        const canvas = this.getCanvas();
        hostDiv.appendChild(canvas);
        this.canvasHost = hostDiv;
        hostDiv.style.width = size.width * this.scale + 'px';
        hostDiv.style.height = size.height * this.scale + 'px';
        this.draw();
        this.model.controllerAttached.trigger(this.model, this);
        return this;
    }

    /**
     * Enables or disables automatic device-pixel-ratio sizing.
     * @param enabled - True to auto-detect device pixel ratio
     * @param pixelRatio - Optional manual ratio when disabling auto mode
     */
    public setAutoPixelRatio(enabled: boolean, pixelRatio?: number): void {
        this.autoPixelRatio = enabled;
        if (enabled) {
            this.pixelRatio = getDevicePixelRatio();
        }
        else {
            this.pixelRatio = pixelRatio !== undefined && pixelRatio > 0 ? pixelRatio : 1;
        }
        this.refreshPixelRatio(true);
        if (this.canvas && this.model) {
            this.draw();
        }
    }

    /**
     * Sets a manual backing-store pixel ratio and disables auto-detection.
     * @param pixelRatio - Manual backing-store ratio
     */
    public setPixelRatio(pixelRatio: number): void {
        this.autoPixelRatio = false;
        this.pixelRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
        this.refreshPixelRatio(true);
        if (this.canvas && this.model) {
            this.draw();
        }
    }

    private onWindowResize(): void {
        if (!this.autoPixelRatio || !this.canvas || !this.model) {
            return;
        }
        const changed = this.refreshPixelRatio();
        if (changed) {
            this.draw();
        }
    }

    private refreshPixelRatio(force?: boolean): boolean {
        const nextPixelRatio = this.autoPixelRatio ? getDevicePixelRatio() : this.pixelRatio;
        const changed = force || nextPixelRatio !== this.pixelRatio;
        this.pixelRatio = nextPixelRatio;
        return this.resizeCanvas() || changed;
    }

    private resizeCanvas(): boolean {
        if (!this.canvas || !this.model) {
            return false;
        }
        const size = this.model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        const cssWidth = size.width * this.scale;
        const cssHeight = size.height * this.scale;
        const changed = applyCanvasDisplaySize(this.canvas, cssWidth, cssHeight, this.pixelRatio);
        const element = this.canvasHost;
        if (element) {
            element.style.width = cssWidth + 'px';
            element.style.height = cssHeight + 'px';
        }
        return changed;
    }

    /**
     * Finds a touch by its identifier in the provided touch list.
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
     * Creates a synthetic mouse-like event from a touch event.
     * @param touch - Active touch
     * @param source - Source touch event
     * @returns Synthetic mouse-like event
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

    /**
     * Computes floating point modulus (remainder) of two number
     * @param a - Numerator
     * @param b - Denominator
     * @returns Floating point remainder
     */
    private fmod(a: number, b: number): number {
        return Number((a - Math.floor(a / b) * b).toPrecision(8));
    }

    /**
     * Computes periodic timer phase angle based on timer offset and frequency
     * @param frequency - Timer frequency in cycles per second
     * @returns Timer phase angle in radians
     */
    private timerPhase(frequency: number): number {
        const elapsed = this.elapsedTime();
        const period = 1.0 / frequency;
        const partial = this.fmod(elapsed, period) / period;
        const phase = partial * 2.0 * Math.PI;
        return phase;
    }
}
