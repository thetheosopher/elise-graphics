import { ElementCommandHandler } from '../command/element-command-handler';
import { IController } from '../controller/controller';
import { CommonEvent } from '../core/common-event';
import { ErrorMessages } from '../core/error-messages';
import { Model } from '../core/model';
import { ElementBase } from '../elements/element-base';
import { SpriteElement } from '../elements/sprite-element';
import { SpriteFrame } from '../elements/sprite-frame';
import { BitmapResource } from '../resource/bitmap-resource';
import { ResourceManager } from '../resource/resource-manager';
import { ResourceState } from '../resource/resource-state';
import { TransitionRenderer } from '../transitions/transitions';
import { Surface } from './surface';
import { SurfaceAnimationFrame } from './surface-animation-frame';
import { SurfaceAnimationViewController } from './surface-animation-view-controller';
import { SurfaceLayer } from './surface-layer';

export class SurfaceAnimationLayer extends SurfaceLayer {
    public static ANIMATION_CLICK = 'animationClick';
    public static ANIMATION_ADVANCE = 'animationAdvance';

    /**
     * Renders timed image frames with optional transitions
     * @param id - Animation id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param loop - Loop animation
     * @param clickListener - Click event listener
     * @param initialIndex - Initial frame index
     * @param frameAdvancedListener - Frame advance event listener
     */
    public static create(
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        loop: boolean,
        clickListener: (animation: SurfaceAnimationLayer | undefined) => void,
        initialIndex: number,
        frameAdvancedListener: (animation: SurfaceAnimationLayer | undefined) => void
    ) {
        const animation = new SurfaceAnimationLayer(
            id,
            left,
            top,
            width,
            height,
            loop,
            clickListener,
            initialIndex,
            frameAdvancedListener
        );
        return animation;
    }

    /**
     * Starting animation frame
     */
    public initialIndex: number;

    /**
     * If true, loop animation
     */
    public loop: boolean;

    /**
     * Clicked event
     */
    public clicked: CommonEvent<SurfaceAnimationLayer> = new CommonEvent<SurfaceAnimationLayer>();

    /**
     * Frame advance event
     */
    public frameAdvanced: CommonEvent<SurfaceAnimationLayer> = new CommonEvent<SurfaceAnimationLayer>();

    /**
     * Animation frame array
     */
    public frames: SurfaceAnimationFrame[] = [];

    /**
     * Current frame index
     */
    public frameIndex: number;

    /**
     * True when paused
     */
    public isPaused: boolean;

    /**
     * True when stopped
     */
    public isStopped: boolean;

    /**
     * If true, remember frame index
     */
    public rememberFrame: boolean;

    /**
     * Animation drawing model
     */
    public model?: Model;

    /**
     * Animation view controller
     */
    public controller?: SurfaceAnimationViewController;

    /**
     * Animation host canvas element
     */
    public element?: HTMLCanvasElement;

    /**
     * Animation sprite element
     */
    public sprite?: SpriteElement;

    /**
     * Renders timed image frames with optional transitions
     * @param id - Animation id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param loop - Loop animation
     * @param clickListener - Click event listener
     * @param initialIndex - Initial frame index
     * @param frameAdvancedListener - Frame advance event listener
     */
    constructor(
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        loop: boolean,
        clickListener: (animation: SurfaceAnimationLayer | undefined) => void,
        initialIndex: number,
        frameAdvancedListener: (animation: SurfaceAnimationLayer | undefined) => void
    ) {
        super(id, left, top, width, height);
        this.frameIndex = 0;
        this.isPaused = false;
        this.isStopped = false;
        this.rememberFrame = false;

        this.loop = loop;
        if (clickListener) {
            this.clicked.add(clickListener);
        }
        this.initialIndex = initialIndex;
        if (frameAdvancedListener) {
            this.frameAdvanced.add(frameAdvancedListener);
        }

        this.addFrame = this.addFrame.bind(this);
        this.setResourceListener = this.setResourceListener.bind(this);
        this.pause = this.pause.bind(this);
        this.onAnimationClick = this.onAnimationClick.bind(this);
        this.onAnimationAdvance = this.onAnimationAdvance.bind(this);
    }

    /**
     * Adds an animation frame
     * @param id - Animation frame id
     * @param source - Animation frame bitmap source
     * @param left - Source bitmap crop x coordinate
     * @param top - Source bitmap crop y coordinate
     * @param width - Source bitmap crop width
     * @param height - Source bitmap crop height
     * @param duration - Frame duration in seconds
     * @param transition - Frame "to" transition
     * @param transitionDuration - Transition duration in seconds
     * @param pauseFrame - Pause frame until tapped
     * @returns New animation frame
     */
    public addFrame(
        id: string,
        source: string,
        left: number,
        top: number,
        width: number,
        height: number,
        duration: number,
        transition: string,
        transitionDuration: number,
        pauseFrame: boolean
    ) {
        const frame = new SurfaceAnimationFrame(
            id,
            left,
            top,
            width,
            height,
            source,
            duration,
            transition,
            transitionDuration,
            pauseFrame
        );
        this.frames.push(frame);
        return frame;
    }

    /**
     * Registers a resource listener
     * @param listener - Animation resource listener (rm: Elise.ResourceManager, state: Elise.ResourceState)
     */
    public setResourceListener(listener: (rm: ResourceManager, state: ResourceState | undefined) => void) {
        if (this.model) {
            this.model.resourceManager.listenerEvent.add(listener);
        }
    }

    /**
     * Adds animation to parent surface
     */
    public addToSurface(surface: Surface) {
        this.surface = surface;

        // If no frames, throw error
        if (this.frames.length < 1) {
            throw new Error(ErrorMessages.NoAnimationFramesAreDefined);
        }

        // Create model
        const model = Model.create(this.width, this.height);
        this.model = model;
        if (surface.resourceListenerEvent.hasListeners()) {
            surface.resourceListenerEvent.listeners.forEach(listener => {
                model.resourceManager.listenerEvent.add(listener);
            });
        }

        // Create bitmap resources for animation frames
        const registered = [];
        for (const frame of this.frames) {
            const source = frame.source;
            let found = false;
            for (const item of registered) {
                if (item.toLowerCase() === source.toLowerCase()) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                const key = registered.length.toString();
                BitmapResource.create(key, frame.source).addTo(model);
                registered.push(frame.source);
            }
        }

        // Create sprite element
        const sprite = SpriteElement.create(0, 0, this.width, this.height);
        sprite.id = this.id;
        sprite.loop = this.loop;
        sprite.timer = TransitionRenderer.SPRITE_TRANSITION;
        sprite.click = SurfaceAnimationLayer.ANIMATION_CLICK;
        sprite.onAdvance = SurfaceAnimationLayer.ANIMATION_ADVANCE;
        sprite.frames = [];
        sprite.setInteractive(true);

        // Add frames
        for (const frame of this.frames) {
            let key = '';
            for (let j = 0; j < registered.length; j++) {
                if (registered[j].toLowerCase() === frame.source.toLowerCase()) {
                    key = j.toString();
                    break;
                }
            }
            sprite.frames.push(
                SpriteFrame.create(
                    key,
                    frame.left,
                    frame.top,
                    frame.width,
                    frame.height,
                    frame.duration,
                    frame.transition,
                    frame.transitionDuration
                )
            );
        }

        // Set non-default initial frame
        if (this.initialIndex) {
            sprite.frameIndex = this.initialIndex;
        }

        // Add sprite to model
        model.add(sprite);

        const controller = new SurfaceAnimationViewController();
        this.controller = controller;
        this.controller.surface = this.surface;
        controller.animation = this;
        controller.setScale(surface.scale);
        controller.setModel(this.model);
        const canvas = controller.getCanvas();
        canvas.setAttribute('id', this.id + '_canvas');
        canvas.style.position = 'absolute';
        canvas.style.left = this.translateX + this.left * surface.scale + 'px';
        canvas.style.top = this.translateY + this.top * surface.scale + 'px';
        canvas.style.opacity = (this.surface.opacity * this.opacity).toString();
        this.element = canvas;
        this.sprite = sprite;
    }

    /**
     * Loads required resource and calls completion callback
     * @param callback - Completion callback (success: boolean)
     */
    public prepare(callback: (result: boolean) => void) {
        const self = this;

        // let parentElement = document.getElementById(self.surface.hostDivId);
        // parentElement.appendChild(self.element);
        if (!self.element) {
            throw new Error(ErrorMessages.ElementUndefined);
        }
        if (!self.controller) {
            throw new Error(ErrorMessages.ControllerIsUndefined);
        }
        if (!self.surface) {
            throw new Error(ErrorMessages.SurfaceIsUndefined);
        }
        if (!self.surface.div) {
            throw new Error(ErrorMessages.SurfaceDivIsUndefined);
        }
        self.surface.div.appendChild(self.element);

        // self.controller.surface = self.surface;
        const elementCommandHandler = new ElementCommandHandler();
        elementCommandHandler.attachController(self.controller);
        elementCommandHandler.addHandler(
            TransitionRenderer.SPRITE_TRANSITION,
            TransitionRenderer.spriteTransitionHandler
        );
        elementCommandHandler.addHandler(
            SurfaceAnimationLayer.ANIMATION_CLICK,
            (controller: IController, element: ElementBase, command: string, trigger: string, parameters: any) => {
                const animationController = controller as SurfaceAnimationViewController;
                const animation = animationController.animation;
                if (animation) {
                    animation.onAnimationClick();
                }
            }
        );
        elementCommandHandler.addHandler(
            SurfaceAnimationLayer.ANIMATION_ADVANCE,
            (controller: IController, element: ElementBase, command: string, trigger: string, parameters: any) => {
                const animationController = controller as SurfaceAnimationViewController;
                const animation = animationController.animation;
                if (animation && animation.sprite) {
                    animation.frameIndex = animation.sprite.frameIndex;
                    animation.onAnimationAdvance();
                }
            }
        );
        if (self.model) {
            self.model.prepareResources(undefined, success => {
                if (success) {
                    self.isPrepared = true;
                    if (self.controller) {
                        self.controller.draw();
                    }
                    if (callback) {
                        callback(true);
                    }
                }
                else {
                    if (self.surface) {
                        self.surface.onErrorInternal(ErrorMessages.ResourcesFailedToLoad);
                    }
                    if (callback) {
                        callback(false);
                    }
                }
            });
        }
    }

    /**
     * Unloads animation and destroys visual elements
     */
    public destroy() {
        if (this.controller) {
            this.controller.detach();
        }
        if (this.element) {
            delete this.element;
        }
        delete this.surface;
    }

    /**
     * Pauses animation
     */
    public pause() {
        if (!this.controller || !this.sprite) {
            return;
        }
        if (this.isPaused) {
            this.controller.resumeTimer();
            this.isPaused = false;
        }
        else {
            // Only pause if not transitioning
            const spriteState = this.sprite.getStateForTime(this.controller.elapsedTime());
            if (!spriteState || !spriteState.transition) {
                this.controller.pauseTimer();
                this.isPaused = true;
            }
        }
    }

    /**
     * Onload initialization
     */
    public onload() {
        if (this.controller && this.sprite) {
            // If initial frame is specified, set starting time in the past
            // by an offset equal to the starting time for the frame
            if (this.initialIndex) {
                const startTime = this.sprite.getTimeForFrame(this.initialIndex);
                if (startTime) {
                    this.controller.startTimer(-startTime);
                }
                else {
                    this.controller.startTimer(0);
                }
            }
            else {
                this.controller.startTimer(0);
            }
        }
    }

    /**
     * Onunload teardown
     */
    public onunload() {
        if (this.controller) {
            this.controller.stopTimer();
        }
    }

    /**
     * Sets rendering scale
     */
    public setScale(scale: number) {
        if (this.controller) {
            this.controller.setScale(scale);
        }
        if (!this.element) {
            throw new Error(ErrorMessages.ElementUndefined);
        }
        const layer = this.element as HTMLCanvasElement;
        layer.style.left = this.translateX + this.left * scale + 'px';
        layer.style.top = this.translateY + this.top * scale + 'px';
        layer.style.width = this.width * scale + 'px';
        layer.style.height = this.height * scale + 'px';
        return this;
    }

    /**
     * Sets rendering opacity
     */
    public setOpacity(opacity: number) {
        this.opacity = opacity;
        if (this.element && this.surface) {
            this.element.style.opacity = (this.surface.opacity * this.opacity).toString();
        }
        return this;
    }

    /**
     * Sets X translation
     */
    public setTranslateX(translateX: number) {
        this.translateX = translateX;
        if (this.element && this.surface) {
            this.element.style.left = (this.translateX + this.left) * this.surface.scale + 'px';
        }
        return this;
    }

    /**
     * Sets Y translation
     */
    public setTranslateY(translateY: number) {
        this.translateY = translateY;
        if (this.element && this.surface) {
            this.element.style.top = (this.translateY + this.top) * this.surface.scale + 'px';
        }
        return this;
    }

    public onAnimationClick() {
        this.clicked.trigger(this);
    }

    public onAnimationAdvance() {
        this.frameAdvanced.trigger(this);
    }

    public addTo(surface: Surface) {
        surface.layers.push(this);
        return this;
    }
}
