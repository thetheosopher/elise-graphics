import { ElementCommandHandler } from '../command/element-command-handler';
import { IController } from '../controller/controller';
import { ControllerEvent } from '../controller/controller-event';
import { ErrorMessages } from '../core/error-messages';
import { KeyboardEventArgs } from '../core/keyboard-event-args';
import { Logging } from '../core/logging';
import { Model } from '../core/model';
import { MouseEventArgs } from '../core/mouse-event-args';
import { PointEventParameters } from '../core/point-event-parameters';
import { TimerParameters } from '../core/timer-parameters';
import { ElementBase } from '../elements/element-base';
import { ElementKeyboardEventArgs } from '../elements/element-keyboard-event-args';

const log = Logging.log;

/**
 * Manages rendering model content into a live SVG DOM tree.
 */
export class SVGViewController implements IController {
    /**
     * Create a new SVG view controller and bind it to a host div element.
     * @param hostDiv - Host div element
     * @param model - Drawing model
     * @param scale - Rendering scale
     * @returns New SVG view controller
     */
    public static initializeTarget(hostDiv: HTMLDivElement, model: Model, scale?: number) {
        log('Initializing SVG view controller target');
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
        const controller = new SVGViewController();
        controller.setScale(viewScale);
        controller.setModel(model);
        const svg = controller.getSVG();
        hostDiv.appendChild(svg);
        hostDiv.style.width = size.width * viewScale + 'px';
        hostDiv.style.height = size.height * viewScale + 'px';
        controller.hostDiv = hostDiv;
        controller.draw();
        model.controllerAttached.trigger(model, controller);
        return controller;
    }

    public modelUpdated: ControllerEvent<Model> = new ControllerEvent<Model>();
    public enabledChanged: ControllerEvent<boolean> = new ControllerEvent<boolean>();
    public mouseEnteredView: ControllerEvent<MouseEventArgs> = new ControllerEvent<MouseEventArgs>();
    public mouseLeftView: ControllerEvent<MouseEventArgs> = new ControllerEvent<MouseEventArgs>();
    public mouseDownView: ControllerEvent<PointEventParameters> = new ControllerEvent<PointEventParameters>();
    public mouseUpView: ControllerEvent<PointEventParameters> = new ControllerEvent<PointEventParameters>();
    public mouseMovedView: ControllerEvent<PointEventParameters> = new ControllerEvent<PointEventParameters>();
    public keyDown: ControllerEvent<KeyboardEventArgs> = new ControllerEvent<KeyboardEventArgs>();
    public keyUp: ControllerEvent<KeyboardEventArgs> = new ControllerEvent<KeyboardEventArgs>();
    public keyPress: ControllerEvent<KeyboardEventArgs> = new ControllerEvent<KeyboardEventArgs>();
    public elementFocused: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();
    public elementBlurred: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();
    public mouseEnteredElement: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();
    public mouseLeftElement: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();
    public mouseDownElement: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();
    public mouseUpElement: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();
    public elementClicked: ControllerEvent<ElementBase> = new ControllerEvent<ElementBase>();
    public keyDownElement: ControllerEvent<ElementKeyboardEventArgs> = new ControllerEvent<ElementKeyboardEventArgs>();
    public keyUpElement: ControllerEvent<ElementKeyboardEventArgs> = new ControllerEvent<ElementKeyboardEventArgs>();
    public keyPressElement: ControllerEvent<ElementKeyboardEventArgs> = new ControllerEvent<ElementKeyboardEventArgs>();
    public timer: ControllerEvent<TimerParameters> = new ControllerEvent<TimerParameters>();

    public model?: Model;
    public canvas?: HTMLCanvasElement;
    public svg?: SVGSVGElement;
    public hostDiv?: HTMLDivElement;
    public scale: number = 1;
    public needsRedraw: boolean = false;
    public enabled: boolean = true;
    public commandHandler?: ElementCommandHandler;
    public focusedElement?: ElementBase;
    public focusedPath: ElementBase[] = [];
    public startTime?: number;
    public lastTick?: number;
    public lastFrameTime?: number;
    public timerHandle?: number;
    public timerEnabled: boolean = false;
    public timerParameters: TimerParameters;
    public pauseTime?: number;

    constructor() {
        this.setModel = this.setModel.bind(this);
        this.setEnabled = this.setEnabled.bind(this);
        this.getSVG = this.getSVG.bind(this);
        this.createSVG = this.createSVG.bind(this);
        this.detach = this.detach.bind(this);
        this.setScale = this.setScale.bind(this);
        this.onModelUpdated = this.onModelUpdated.bind(this);
        this.onSVGKeyDown = this.onSVGKeyDown.bind(this);
        this.onSVGKeyUp = this.onSVGKeyUp.bind(this);
        this.onSVGKeyPress = this.onSVGKeyPress.bind(this);
        this.setFocusedElement = this.setFocusedElement.bind(this);
        this.setFocusedPath = this.setFocusedPath.bind(this);
        this.dispatchPathKeyboardEvent = this.dispatchPathKeyboardEvent.bind(this);
        this.draw = this.draw.bind(this);
        this.drawIfNeeded = this.drawIfNeeded.bind(this);
        this.calculateFPS = this.calculateFPS.bind(this);
        this.invalidate = this.invalidate.bind(this);
        this.startTimer = this.startTimer.bind(this);
        this.pauseTimer = this.pauseTimer.bind(this);
        this.resumeTimer = this.resumeTimer.bind(this);
        this.stopTimer = this.stopTimer.bind(this);
        this.tick = this.tick.bind(this);
        this.elapsedTime = this.elapsedTime.bind(this);
        this.bindTarget = this.bindTarget.bind(this);
        this.timerPhase = this.timerPhase.bind(this);
        this.renderModelSVG = this.renderModelSVG.bind(this);
        this.renderModelSVGElement = this.renderModelSVGElement.bind(this);
        this.applyRootSizing = this.applyRootSizing.bind(this);

        this.timerParameters = new TimerParameters(0, 0);
    }

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
        log('Setting SVG view controller model');
        this.model = model;
        this.model.controller = this;
        this.focusedElement = undefined;
        this.focusedPath = [];
        if (!this.svg) {
            this.createSVG();
        }
        this.draw();
        model.controllerAttached.trigger(model, this);
    }

    public setEnabled(enabled: boolean): void {
        if (enabled === this.enabled) {
            return;
        }
        this.enabled = enabled;
        this.enabledChanged.trigger(this, enabled);
    }

    public getSVG(): SVGSVGElement {
        if (!this.svg) {
            this.createSVG();
        }
        if (!this.svg) {
            throw new Error(ErrorMessages.TargetIsUndefined);
        }
        return this.svg;
    }

    public createSVG(): void {
        if (typeof document === 'undefined' || !document.createElementNS) {
            throw new Error(ErrorMessages.DocumentIsUndefined);
        }
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        this.svg.setAttribute('tabindex', '0');
        this.svg.style.display = 'block';
        this.svg.addEventListener('keydown', this.onSVGKeyDown);
        this.svg.addEventListener('keyup', this.onSVGKeyUp);
        this.svg.addEventListener('keypress', this.onSVGKeyPress);
    }

    public detach(): void {
        this.stopTimer();
        if (this.model) {
            if (this.model.controller === this) {
                this.model.controller = undefined;
            }
            this.model.controllerDetached.trigger(this.model, this);
            this.model.controllerDetached.clear();
            this.model.controllerAttached.clear();
        }
        if (this.svg && this.svg.parentElement) {
            this.svg.removeEventListener('keydown', this.onSVGKeyDown);
            this.svg.removeEventListener('keyup', this.onSVGKeyUp);
            this.svg.removeEventListener('keypress', this.onSVGKeyPress);
            this.svg.parentElement.removeChild(this.svg);
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
        this.timer.clear();
        this.svg = undefined;
        this.hostDiv = undefined;
    }

    public setScale(scale: number): void {
        if (scale === this.scale) {
            return;
        }
        this.scale = scale;
        this.applyRootSizing();
        if (this.model && this.svg) {
            this.draw();
        }
    }

    public onModelUpdated(): void {
        if (!this.model) {
            return;
        }
        this.modelUpdated.trigger(this, this.model);
        this.invalidate();
    }

    public drawIfNeeded(): void {
        if (this.needsRedraw) {
            this.draw();
        }
    }

    public draw(): void {
        if (!this.model) {
            return;
        }
        const nextRoot = this.renderModelSVGElement();
        nextRoot.style.display = 'block';
        this.svg = nextRoot;
        this.applyRootSizing();

        if (this.hostDiv) {
            if (this.hostDiv.firstChild) {
                if (this.hostDiv.firstChild !== nextRoot) {
                    this.hostDiv.replaceChild(nextRoot, this.hostDiv.firstChild);
                }
            }
            else {
                this.hostDiv.appendChild(nextRoot);
            }
        }

        if (this.model.displayFPS) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '20');
            text.setAttribute('y', '20');
            text.setAttribute('fill', 'cornflowerblue');
            text.setAttribute('font-family', 'monospace');
            text.setAttribute('font-size', '16');
            text.textContent = this.calculateFPS().toFixed() + ' fps';
            nextRoot.appendChild(text);
        }

        this.needsRedraw = false;
    }

    public calculateFPS(): number {
        const now = +new Date();
        let fps = 0;
        if (this.lastFrameTime !== undefined) {
            fps = 1000 / (now - this.lastFrameTime);
        }
        this.lastFrameTime = now;
        return fps;
    }

    public invalidate(): void {
        this.needsRedraw = true;
    }

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
        this.timerHandle = window.requestAnimationFrame(this.tick);
    }

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

    public resumeTimer(): void {
        if (this.timerEnabled) {
            return;
        }
        const now = +new Date();
        if (this.pauseTime !== undefined && this.startTime !== undefined) {
            this.startTime += now - this.pauseTime;
        }
        else {
            this.startTime = now;
        }
        this.pauseTime = undefined;
        this.timerEnabled = true;
        this.timerHandle = window.requestAnimationFrame(this.tick);
    }

    public stopTimer(): void {
        if (!this.timerEnabled) {
            return;
        }
        this.timerEnabled = false;
        if (this.timerHandle !== undefined) {
            window.cancelAnimationFrame(this.timerHandle);
            this.timerHandle = undefined;
        }
    }

    public tick(): void {
        if (this.timerEnabled) {
            try {
                this.timerParameters.elapsedTime = this.elapsedTime();
                if (this.lastTick !== undefined) {
                    this.timerParameters.tickDelta = this.timerParameters.elapsedTime - this.lastTick;
                }
                else {
                    this.timerParameters.tickDelta = 0;
                }
                this.lastTick = this.timerParameters.elapsedTime;
                this.timer.trigger(this, this.timerParameters);
                this.drawIfNeeded();
            }
            catch (error) {
                this.timerEnabled = false;
                this.timerHandle = undefined;
                const message = error instanceof Error ? error.message : String(error);
                log('Animation timer stopped due to error: ' + message);
                return;
            }
            this.timerHandle = window.requestAnimationFrame(this.tick);
        }
        else {
            this.timerHandle = undefined;
        }
    }

    public elapsedTime(): number {
        const now = +new Date();
        if (this.startTime !== undefined) {
            return (now - this.startTime) / 1000.0;
        }
        return 0;
    }

    public bindTarget(hostDiv: HTMLDivElement) {
        if (!hostDiv) {
            throw new Error(ErrorMessages.HostElementUndefined);
        }
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        hostDiv.innerHTML = '';
        this.hostDiv = hostDiv;
        hostDiv.appendChild(this.getSVG());
        this.applyRootSizing();
        this.draw();
        this.model.controllerAttached.trigger(this.model, this);
        return this;
    }

    public timerPhase(frequency: number): number {
        const elapsed = this.elapsedTime();
        const period = 1.0 / frequency;
        const partial = this.fmod(elapsed, period) / period;
        return partial * 2.0 * Math.PI;
    }

    /**
     * Sets the current focused element.
     * @param el - Focused element
     */
    public setFocusedElement(el: ElementBase | undefined) {
        this.setFocusedPath(el ? [el] : []);
    }

    /**
     * Sets the current focused element path.
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
     * Handles SVG key down while the runtime view has focus.
     * @param e - DOM keyboard event
     * @returns True if keyboard listeners were notified
     */
    public onSVGKeyDown(e: KeyboardEvent): boolean {
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
     * Handles SVG key up while the runtime view has focus.
     * @param e - DOM keyboard event
     * @returns True if keyboard listeners were notified
     */
    public onSVGKeyUp(e: KeyboardEvent): boolean {
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
     * Handles SVG key press while the runtime view has focus.
     * @param e - DOM keyboard event
     * @returns True if keyboard listeners were notified
     */
    public onSVGKeyPress(e: KeyboardEvent): boolean {
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

    private renderModelSVG(): string {
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        return this.model.toSVG();
    }

    private renderModelSVGElement(): SVGSVGElement {
        const markup = this.renderModelSVG();
        if (typeof DOMParser !== 'undefined') {
            const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
            const root = doc.documentElement;
            if (root && root.tagName.toLowerCase() === 'svg') {
                return document.importNode(root, true) as unknown as SVGSVGElement;
            }
        }

        const host = document.createElement('div');
        host.innerHTML = markup.trim();
        const root = host.firstElementChild;
        if (!root || root.tagName.toLowerCase() !== 'svg') {
            throw new Error(ErrorMessages.TargetIsUndefined);
        }
        return root as SVGSVGElement;
    }

    private applyRootSizing(): void {
        if (!this.model) {
            return;
        }
        const size = this.model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if (this.hostDiv) {
            this.hostDiv.style.width = size.width * this.scale + 'px';
            this.hostDiv.style.height = size.height * this.scale + 'px';
        }
        if (this.svg) {
            this.svg.style.width = size.width * this.scale + 'px';
            this.svg.style.height = size.height * this.scale + 'px';
        }
    }

    private fmod(a: number, b: number): number {
        return Number((a - Math.floor(a / b) * b).toPrecision(8));
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
}