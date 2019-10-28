import { ElementCommandHandler } from '../command/element-command-handler';
import { IController } from '../controller/controller';
import { CommonEvent } from '../core/common-event';
import { Model } from '../core/model';
import { Utility } from '../core/utility';
import { ElementBase } from '../elements/element-base';
import { ImageElement } from '../elements/image-element';
import { SpriteElement } from '../elements/sprite-element';
import { BitmapResource } from '../resource/bitmap-resource';
import { ResourceManager } from '../resource/resource-manager';
import { ResourceManagerEvent } from '../resource/resource-manager-event';
import { ResourceState } from '../resource/resource-state';
import { ElementStates } from './element-states';
import { LayeredSurfaceElement } from './layered-surface-element';
import { SurfaceButton } from './surface-button';
import { SurfaceElement } from './surface-element';
import { SurfaceViewController } from './surface-view-controller';
import { Text } from './text';
import { Video } from './video';

export class Surface {
    /**
     * Surface factory function
     * @param {number} width - Surface width
     * @param {number} height - Surface height
     * @param {string} id - Surface id
     * @param {number} scale - Rendering scale
     * @returns {Elise.Player.Surface} New surface
     */
    public static create(width: number, height: number, id: string, scale: number) {
        return new Surface(width, height, id, scale);
    }

    /**
     * Surface width
     */
    public width: number;

    /**
     * Surface height
     */
    public height: number;

    /**
     * Surface id
     */
    public id: string;

    /**
     * Rendering scale
     */
    public scale: number;

    /**
     * Rendering opacity (0-1)
     */
    public opacity: number;

    /**
     * Error event handler
     */
    public error: CommonEvent<string> = new CommonEvent<string>();

    /**
     * Background color as string
     */
    public backgroundColor?: string;

    /**
     * Normal state image URL
     */
    public normalImageSource?: string;

    /**
     * Selected state image URL
     */
    public selectedImageSource?: string;

    /**
     * Highlighted state image URL
     */
    public highlightedImageSource?: string;

    /**
     * Disabled state image URL
     */
    public disabledImageSource?: string;

    /**
     * Base model layer elements
     */
    public elements: SurfaceElement[] = [];

    /**
     * Base model layer elements
     */
    public layers: LayeredSurfaceElement[] = [];

    /**
     * Loaded event called when all resources have been loaded or have failed (success: boolean)
     */
    public loaded: CommonEvent<boolean> = new CommonEvent<boolean>();

    /**
     * Loaded event called after controller has been initialized
     */
    public initialized: CommonEvent<SurfaceViewController> = new CommonEvent<SurfaceViewController>();

    /**
     * Hosting HTML div
     */
    public hostDiv?: HTMLDivElement;

    /**
     * Resource state listener (rm: Elise.ResourceManager, state: Elise.ResourceState)
     */
    public resourceListenerEvent: ResourceManagerEvent<ResourceState> = new ResourceManagerEvent<ResourceState>();

    /**
     * Surface view controller
     */
    public controller?: SurfaceViewController;

    /**
     * Surface div element
     */
    public div?: HTMLDivElement;

    /**
     * Surface drawing model
     */
    public model?: Model;

    /**
     * True if child surface of another surface
     */
    public isChild: boolean = false;

    /**
     * X translation
     */
    public translateX: number;

    /**
     * Y translation
     */
    public translateY: number;

    /**
     * Constructs a player surface
     * @classdesc Base elements derived from surface images and layered media elements
     * @class Elise.Player.Surface
     * @param {number} width - Surface width
     * @param {number} height - Surface height
     * @param {string} id - Surface id
     * @param {number} scale - Rendering scale
     */
    constructor(width: number, height: number, id?: string, scale?: number) {
        this.width = width;
        this.height = height;
        if (id) {
            this.id = id;
        }
        else {
            this.id = Utility.guid();
        }
        if (scale !== undefined && scale > 0) {
            this.scale = scale;
        }
        else {
            this.scale = 1.0;
        }
        this.opacity = 1;
        this.translateX = 0;
        this.translateY = 0;

        this.createDiv = this.createDiv.bind(this);
        this.initializeController = this.initializeController.bind(this);
        this.elementWithId = this.elementWithId.bind(this);
        this.layerWithId = this.layerWithId.bind(this);
        this.bind = this.bind.bind(this);
        this.unbind = this.unbind.bind(this);
        this.scaledValue = this.scaledValue.bind(this);
        this.createModel = this.createModel.bind(this);
        this.loadResources = this.loadResources.bind(this);
        this.onErrorInternal = this.onErrorInternal.bind(this);
        this.addResourceListener = this.addResourceListener.bind(this);
        this.setOpacity = this.setOpacity.bind(this);
        this.setTranslateX = this.setTranslateX.bind(this);
        this.setTranslateY = this.setTranslateY.bind(this);
        this.startVideos = this.startVideos.bind(this);
    }

    public createDiv(onBottom?: boolean) {
        if(!this.hostDiv) {
            throw new Error('Host div is undefined');
        }
        const div = document.createElement('div');
        div.id = this.id + '_div';
        this.div = div;
        if (this.isChild) {
            div.style.position = 'absolute';
            div.style.left = this.translateX * this.scale + 'px';
            div.style.top = this.translateY * this.scale + 'px';
        }
        else {
            div.style.position = 'relative';
        }
        div.style.opacity = this.opacity.toString();
        if (onBottom) {
            this.hostDiv.insertBefore(this.div, this.hostDiv.firstElementChild);
        }
        else {
            this.hostDiv.appendChild(this.div);
        }
    }

    /**
     * Initializes host HTML div, view controller and command handlers
     */
    public initializeController() {
        const self = this;
        if(!self.model) {
            throw new Error('Model is undefined.');
        }
        if(!self.div) {
            throw new Error('Div is undefined.')
        }

        self.controller = new SurfaceViewController();
        self.controller.setModel(self.model);
        self.controller.setScale(self.scale);
        self.controller.bindTarget(self.div);
        self.controller.surface = self;

        const ech = new ElementCommandHandler();
        ech.attachController(self.controller);
        ech.addHandler('pushFrame', ElementCommandHandler.pushFrame);
        ech.addHandler('popFrame', ElementCommandHandler.popFrame);

        // Bind command handler event handlers to element event trigger functions
        ech.addHandler(SurfaceButton.BUTTON_CLICK, (
            controller: IController,
            element: ElementBase,
            command: string,
            trigger: string,
            parameters: any
        ) => {
            const c = controller as SurfaceViewController;
            if(!c.surface || !element || !element.id) {
                return;
            }
            const el = c.surface.elementWithId(element.id);
            if(!el) {
                return;
            }
            const button = el as SurfaceButton;
            button.onClicked();
        });

        ech.addHandler(Text.TEXT_CLICK, (
            controller: IController,
            element: ElementBase,
            command: string,
            trigger: string,
            parameters: any
        ) => {
            const c = controller as SurfaceViewController;
            if(!c.surface || !element || !element.id) {
                return;
            }
            const el = c.surface.elementWithId(element.id);
            if(!el) {
                return;
            }
            const text = el as Text;
            text.onClicked();
        });

        self.layers.forEach((layer) => {
            if (layer.element && self.div) {
                self.div.appendChild(layer.element);
            }
        });

        self.initialized.trigger(self.controller);
    }

    /**
     * Returns first element found with given ID
     * @returns Element with given ID or undefined if not found
     */
    public elementWithId(id: string) {
        for(const el of this.elements) {
            if (el.id === id) {
                return el;
            }
        }
        return undefined;
    }

    /**
     * Returns first layered element found with given ID
     * @returns Layered element with given ID or null if not found
     */
    public layerWithId(id: string) {
        for (let i = 0; i < this.elements.length; i++) {
            const layer = this.layers[i];
            if (layer.id === id) {
                return layer;
            }
        }
        return null;
    }

    /**
     * Creates internal model if necessary, binds to host element and calls completion callback
     * @param hostDiv - Hosting div element
     * @callback Completion callback (surface: Surface)
     */
    public bind(hostDiv: HTMLDivElement, callback: (surface: Surface) => void, onBottom: boolean) {
        const self = this;
        if (self.controller) {
            self.onErrorInternal('Surface is already bound.');
            return;
        }
        self.hostDiv = hostDiv;
        self.createDiv(onBottom);
        if (self.model) {
            self.initializeController();
            if (callback) {
                callback(self);
            }
        }
        else {
            self.createModel(() => {
                if (self.model) {
                    self.initializeController();
                    if (callback) {
                        callback(self);
                    }
                }
            });
        }
    }

    /**
     * Unbinds from and destroys host element
     */
    public unbind() {
        if (!this.controller) {
            return;
        }

        if (this.hostDiv && this.div) {
            this.hostDiv.removeChild(this.div);
        }

        // Destroy layer elements
        this.layers.forEach((layer) => {
            layer.destroy();
        });

        // Clear event handlers
        this.resourceListenerEvent.clear();
        this.controller.mouseEnteredElement.clear();
        this.controller.mouseLeftElement.clear();
        this.controller.mouseDownElement.clear();
        this.controller.mouseUpElement.clear();
        this.controller.elementClicked.clear();
        this.controller.commandHandler = undefined;
        this.controller.timer.clear();
        this.controller.detach();
        delete this.controller;
        delete this.div;
        delete this.hostDiv;
    }

    /**
     * Called after all resources have been loaded to initialize surface elements
     */
    public onload() {
        // Call onload on all layer elements
        this.layers.forEach((layer) => {
            layer.onload();
        });
    }

    /**
     * Called when surface is being unloaded to unload resources
     */
    public onunload() {
        // Call onunload on all layer elements
        this.layers.forEach((layer) => {
            layer.onunload();
        });
    }

    /**
     * Sets rendering scale
     */
    public setScale(scale: number) {
        this.scale = scale;
        if(this.controller) {
            this.controller.setScale(this.scale);
        }
        this.layers.forEach((layer) => {
            layer.setScale(scale);
        });
        return this;
    }

    /**
     * Sets rendering opacity
     */
    public setOpacity(opacity: number) {
        this.opacity = opacity;
        if (this.div) {
            this.div.style.opacity = this.opacity.toString();
        }
        this.layers.forEach((layer) => {
            layer.setOpacity(opacity);
        });
        return this;
    }

    /**
     * Sets X translation
     */
    public setTranslateX(translateX: number) {
        this.translateX = translateX;
        if (this.div) {
            this.div.style.left = this.translateX * this.scale + 'px';
        }
        return this;
    }

    /**
     * Sets Y translation
     */
    public setTranslateY(translateY: number) {
        this.translateY = translateY;
        if (this.div) {
            this.div.style.top = this.translateY * this.scale + 'px';
        }
        return this;
    }

    /**
     * Returns a numeric value scaled by the current scale factor
     */
    public scaledValue(value: number) {
        return value * this.scale;
    }

    /**
     * Creates internal drawing model and layered elements, loads resources and calls callback
     * @param callback - Completion event listener
     */
    public createModel(callback: (result: boolean | undefined) => void) {
        const self = this;

        // Create model and attach resource listeners
        const model = Model.create(self.width, self.height);
        self.model = model;
        if (self.resourceListenerEvent.hasListeners()) {
            self.resourceListenerEvent.listeners.forEach((listener) => {
                if(self.model) {
                    self.model.resourceManager.listenerEvent.add(listener);
                }
            });
        }

        // Set color if defined
        if (self.backgroundColor) {
            model.setFill(self.backgroundColor);
        }

        // Add defined image resources
        if (self.normalImageSource) {
            BitmapResource.create(ElementStates.NORMAL, self.normalImageSource).addTo(model);
            ImageElement.create(ElementStates.NORMAL, 0, 0, self.width, self.height).addTo(model);
        }
        if (self.selectedImageSource) {
            BitmapResource.create(ElementStates.SELECTED, self.selectedImageSource).addTo(model);
        }
        if (self.highlightedImageSource) {
            BitmapResource.create(ElementStates.HIGHLIGHTED, self.highlightedImageSource).addTo(model);
        }
        if (self.disabledImageSource) {
            BitmapResource.create(ElementStates.DISABLED, self.disabledImageSource).addTo(model);
        }

        // Add base layer elements
        let l = self.elements.length;
        for (let i = 0; i < l; i++) {
            const el = self.elements[i];
            el.surface = self;
            el.addToModel(model);
        }

        // Add layered elements
        l = self.layers.length;
        for (let i = 0; i < l; i++) {
            const layer = self.layers[i];
            layer.surface = self;
            layer.addToSurface(self);
        }

        // Set completion callback and load resources
        if (callback) {
            self.loaded.add(callback);
        }
        self.loadResources();
    }

    /**
     * Loads all required resources and calls completion callback
     */
    public loadResources() {
        const self = this;

        // Find next unprepared layer
        for(const layer of self.layers) {
            if (!layer.isPrepared) {
                layer.prepare((success) => {
                    self.loadResources();
                });
                return;
            }
        }

        // Prepare resources and return model
        if(self.model) {
            self.model.prepareResources(undefined, (success) => {
                if (success) {
                    self.loaded.trigger(true);
                }
                else {
                    self.onErrorInternal('One or more resources failed to load.');
                    self.loaded.trigger(false);
                }
            });
        }
    }

    /**
     * Internal error handling/logging method
     * @param {string} message - Error message
     */
    public onErrorInternal(message: string) {
        this.error.trigger(message);
    }

    /**
     * Simulates a button click
     */
    public clickButton(buttonId: string) {
        const button = this.elementWithId(buttonId) as SurfaceButton;
        if (button) {
            button.onClicked();
        }
    }

    public startVideos() {
        this.layers.forEach((layer) => {
            if (layer instanceof Video) {
                if (layer.autoPlay && layer.element) {
                    layer.element.play();
                }
            }
        });
    }

    /**
     * Registers a resource listener
     * @param {function} listener - Resource listener function (rm: ResourceManager, state: ResourceState)
     */
    public addResourceListener(listener: (rm: ResourceManager, state: ResourceState | undefined) => void) {
        this.resourceListenerEvent.add(listener);
        if (this.model) {
            this.model.resourceManager.listenerEvent.add(listener);
        }
    }
}
