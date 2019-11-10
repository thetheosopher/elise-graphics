import { IController } from '../controller/controller';
import { Color } from '../core/color';
import { CommonEvent } from '../core/common-event';
import { ErrorMessages } from '../core/error-messages';
import { Model } from '../core/model';
import { FillFactory } from '../fill/fill-factory';
import { FillInfo } from '../fill/fill-info';
import { ViewController } from '../view/view-controller';

export class Sketcher {
    public static create(modelUrl: string, scale: number = 1) {
        return new Sketcher(modelUrl, scale);
    }

    public sketchDone: CommonEvent<boolean> = new CommonEvent<boolean>();

    public modelUrl?: string;
    public timerDelay: number;
    public strokeBatchSize: number;
    public repeat: boolean;
    public fillDelay: number;
    public fillBatchSize: number;
    public repeatDelay: number;
    public sketchColor: boolean;
    public strokeOpacity: number;

    public drawModel?: Model;
    public sourceModel?: Model;
    public context?: CanvasRenderingContext2D;
    public elementIndex: number = 0;
    public elementCount: number = 0;
    public passIndex: number = 0;
    public timerHandle?: number;
    public controller?: ViewController;
    public scale: number = 1;

    constructor(model: string | Model, scale: number = 1) {
        this.addTo = this.addTo.bind(this);
        this.controllerAttached = this.controllerAttached.bind(this);
        this.controllerDetached = this.controllerDetached.bind(this);
        this.clampColor = this.clampColor.bind(this);
        this.drawNextElement = this.drawNextElement.bind(this);
        this.onModelSet = this.onModelSet.bind(this);

        if (model instanceof Model) {
            this.sourceModel = model;
        }
        else {
            this.modelUrl = model;
        }
        this.scale = scale;
        this.timerDelay = 20;
        this.strokeBatchSize = 128;
        this.repeat = true;
        this.fillDelay = 5000;
        this.fillBatchSize = 1024;
        this.repeatDelay = 10000;
        this.sketchColor = false;
        this.strokeOpacity = 128;
    }

    public addTo(model: Model) {
        model.controllerAttached.add(this.controllerAttached);
        model.controllerDetached.add(this.controllerDetached);
        return this;
    }

    public controllerAttached(drawModel: Model, controller?: IController | undefined) {
        drawModel.controllerAttached.clear();
        this.drawModel = drawModel;
        this.controller = controller as ViewController;
        const self = this;

        // If model not provided, load externally
        if (!self.sourceModel && this.modelUrl) {
            Model.load('', this.modelUrl, _sourceModel => {
                self.sourceModel = _sourceModel;
                self.onModelSet();
            });
        }
        else {
            self.onModelSet();
        }
    }

    public onModelSet() {
        const self = this;

        // If we no longer have a canvas, abort
        if (
            !self.controller ||
            !self.controller.canvas ||
            !self.sourceModel ||
            !self.controller.model ||
            !self.controller.renderer
        ) {
            return;
        }

        // Start rendering context
        const context = self.controller.canvas.getContext('2d');
        if (!context) {
            throw new Error(ErrorMessages.CanvasContextIsNull);
        }
        self.context = context;
        self.controller.model.context = self.context;
        self.controller.renderer.beginRender(self.context, self.controller.scale);

        // Set up timer to add elements from source model to draw model
        self.elementCount = self.sourceModel.elements.length;
        self.elementIndex = 0;
        self.passIndex = 0;
        self.timerHandle = setTimeout(self.drawNextElement, self.timerDelay, self);
    }

    public controllerDetached(drawModel: Model, controller?: IController | undefined) {
        this.controller = undefined;
        drawModel.controllerDetached.clear();
        this.drawModel = undefined;
        if (this.timerHandle) {
            clearTimeout(this.timerHandle);
            this.timerHandle = undefined;
        }
    }

    public clampColor(value: number) {
        let rvalue = value;
        if (rvalue < 0) {
            rvalue = 0;
        }
        else if (rvalue > 255) {
            rvalue = 255;
        }
        return Math.floor(rvalue);
    }

    public drawNextElement(sketcher: Sketcher) {
        this.timerHandle = undefined;
        if (
            !sketcher.controller ||
            !sketcher.controller.canvas ||
            !sketcher.drawModel ||
            !sketcher.controller.renderer ||
            !sketcher.context ||
            !sketcher.controller.model ||
            !sketcher.sourceModel
        ) {
            return;
        }
        if (sketcher.elementIndex >= sketcher.elementCount || sketcher.elementIndex < 0) {
            if (sketcher.passIndex === 1) {
                if (sketcher.repeat) {
                    sketcher.drawModel.elements = [];
                    sketcher.passIndex = 0;
                    sketcher.elementIndex = 0;
                    sketcher.timerHandle = setTimeout(this.drawNextElement, sketcher.repeatDelay, sketcher);
                }
                else {
                    sketcher.controller.renderer.endRender(sketcher.context);
                    sketcher.context = undefined;
                    if (this.sketchDone.hasListeners()) {
                        this.sketchDone.trigger(true);
                    }
                }
            }
            else {
                sketcher.passIndex += 1;
                sketcher.elementIndex = 0;
                sketcher.timerHandle = setTimeout(this.drawNextElement, sketcher.fillDelay, sketcher);
            }
        }
        else {
            if (sketcher.passIndex === 0 && sketcher.elementIndex === 0) {
                const size = sketcher.controller.model.getSize();
                if (size !== undefined) {
                    const w = size.width;
                    const h = size.height;
                    if (FillFactory.setElementFill(sketcher.context, sketcher.controller.model)) {
                        sketcher.context.fillRect(0, 0, w, h);
                    }
                    else {
                        sketcher.context.clearRect(0, 0, w, h);
                    }
                }
            }

            const els = sketcher.sourceModel.elements;
            const batchSize = sketcher.passIndex === 0 ? this.strokeBatchSize : this.fillBatchSize;
            for (let i = 0; i < batchSize; i++) {
                // Get next element from source model
                const el = els[sketcher.elementIndex];
                const isFillable = el.type === 'path' || el.type === 'polygon';
                if (!el) {
                    return;
                }

                // If first pass, draw outline
                if (sketcher.passIndex === 0) {
                    const elc = el.clone();
                    if (isFillable) {
                        const fillInfo = FillInfo.getFillInfo(el);
                        if (fillInfo && fillInfo.type === 'color' && fillInfo.color) {
                            const color = Color.parse(fillInfo.color);
                            elc.setFill('#FFFFFF');
                            if (this.sketchColor) {
                                const strokeColor = new Color(this.strokeOpacity, color.r, color.g, color.b);
                                elc.setStroke(strokeColor.toHexString());
                            }
                            else {
                                const grayColor = this.clampColor(0.21 * color.r + 0.72 * color.g + 0.07 * color.b);
                                const strokeColor = new Color(this.strokeOpacity, grayColor, grayColor, grayColor);
                                elc.setStroke(strokeColor.toHexString());
                            }
                        }
                    }
                    sketcher.drawModel.add(elc);
                    sketcher.controller.renderer.renderElement(sketcher.context, elc);
                }
                else {
                    // On second pass, replace fill and erase stroke
                    const elc = sketcher.drawModel.elements[sketcher.elementIndex];
                    if (isFillable) {
                        elc.setFill(el.fill);
                        elc.setStroke(undefined);
                    }
                    sketcher.controller.renderer.renderElement(sketcher.context, elc);
                }

                sketcher.elementIndex++;
                if (sketcher.elementIndex >= sketcher.elementCount || sketcher.elementIndex < 0) {
                    break;
                }
            }
            if (sketcher.controller) {
                sketcher.timerHandle = setTimeout(this.drawNextElement, sketcher.timerDelay, sketcher);
            }
        }
    }
}
