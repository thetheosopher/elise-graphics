import type { IController } from '../controller/controller';
import type { Model } from '../core/model';
import type { TimerParameters } from '../core/timer-parameters';
import type { ElementBase } from '../elements/element-base';
import type { ModelElement } from '../elements/model-element';
import type { SpriteElement } from '../elements/sprite-element';
import type { ModelResource } from '../resource/model-resource';
import { CommandEventTrigger } from './command-event-trigger';
import type { ICommandHandlerMethod } from './command-handler';
import type { ICommandHandler } from './command-handler';
import type { CommandParameters } from './command-parameters';
import { ElementCommand } from './element-command';
import { ElementCommandHandlerRegistration } from './element-command-handler-registration';

export class ElementCommandHandler implements ICommandHandler<ElementBase> {
    public static PUSH_FILL = 'pushFill';
    public static POP_FILL = 'popFill';
    public static PUSH_STROKE = 'pushStroke';
    public static POP_STROKE = 'popStroke';
    public static PUSH_FRAME = 'pushFrame';
    public static POP_FRAME = 'popFrame';

    public static pushFill(c: IController, el: ElementBase, command: string, _trigger: string, _parameters: string) {
        if (!el.fillStack) {
            el.fillStack = [];
        }
        if (el.fill) {
            el.fillStack.push(el.fill);
        }
        else {
            el.fillStack.push('');
        }
        const ec: ElementCommand = ElementCommand.parse(command);
        el.setFill(ec.parameter);
        c.draw();
    }

    public static popFill(c: IController, el: ElementBase, _command: string, _trigger: string, _parameters: string) {
        if (!el.fillStack) {
            return;
        }
        if (el.fillStack.length > 0) {
            el.fill = el.fillStack.pop();
        }
        if (el.fillStack.length === 0) {
            el.fillStack = undefined;
        }
        c.draw();
    }

    public static pushStroke(c: IController, el: ElementBase, command: string, _trigger: string, _parameters: string) {
        if (!el.strokeStack) {
            el.strokeStack = [];
        }
        if (el.stroke) {
            el.strokeStack.push(el.stroke);
        }
        else {
            el.strokeStack.push('');
        }
        const ec: ElementCommand = ElementCommand.parse(command);
        el.stroke = ec.parameter;
        c.draw();
    }

    public static popStroke(c: IController, el: ElementBase, _command: string, _trigger: string, _parameters?: CommandParameters) {
        if (!el.strokeStack) {
            return;
        }
        if (el.strokeStack.length > 0) {
            el.stroke = el.strokeStack.pop();
        }
        if (el.strokeStack.length === 0) {
            el.strokeStack = undefined;
        }
        c.draw();
    }

    public static pushFrame(c: IController, element: ElementBase, command: string, _trigger: string, _parameters?: CommandParameters) {
        const el = element as SpriteElement;
        if (!el.frameStack) {
            el.frameStack = [];
        }
        el.frameStack.push(el.frameIndex);
        const ec: ElementCommand = ElementCommand.parse(command);
        el.frameIndex = parseInt(ec.parameter, 10);
        c.draw();
    }

    public static popFrame(c: IController, element: ElementBase, _command: string, _trigger: string, _parameters?: CommandParameters) {
        const el = element as SpriteElement;
        if (!el.frameStack) {
            return;
        }
        if (el.frameStack.length > 0) {
            const index = el.frameStack.pop();
            if (index !== undefined) {
                el.frameIndex = index;
            }
        }
        if (el.frameStack.length === 0) {
            el.frameStack = undefined;
        }
        c.draw();
    }

    public registrations: ElementCommandHandlerRegistration[] = [];

    constructor() {
        this.attachController = this.attachController.bind(this);
        this.elementMouseEntered = this.elementMouseEntered.bind(this);
        this.elementMouseLeft = this.elementMouseLeft.bind(this);
        this.elementMouseDown = this.elementMouseDown.bind(this);
        this.elementMouseUp = this.elementMouseUp.bind(this);
        this.elementClicked = this.elementClicked.bind(this);
        this.callElementTimers = this.callElementTimers.bind(this);
        this.timer = this.timer.bind(this);
        this.onElementCommandFired = this.onElementCommandFired.bind(this);
    }

    public attachController(controller: IController): void {
        controller.commandHandler = this;

        controller.mouseEnteredElement.add(this.elementMouseEntered);
        controller.mouseLeftElement.add(this.elementMouseLeft);
        controller.mouseDownElement.add(this.elementMouseDown);
        controller.mouseUpElement.add(this.elementMouseUp);
        controller.elementClicked.add(this.elementClicked);
        controller.timer.add(this.timer);
    }

    public elementMouseEntered(c: IController, el?: ElementBase) {
        if (c.commandHandler && el && el.mouseEnter) {
            c.commandHandler.onElementCommandFired(c, el, el.mouseEnter, CommandEventTrigger.MouseEnter, undefined);
        }
    }

    public elementMouseLeft(c: IController, el?: ElementBase) {
        if (c.commandHandler && el && el.mouseLeave) {
            c.commandHandler.onElementCommandFired(c, el, el.mouseLeave, CommandEventTrigger.MouseLeave, undefined);
        }
    }

    public elementMouseDown(c: IController, el?: ElementBase) {
        if (c.commandHandler && el && el.mouseDown) {
            c.commandHandler.onElementCommandFired(c, el, el.mouseDown, CommandEventTrigger.MouseDown, undefined);
        }
    }

    public elementMouseUp(c: IController, el?: ElementBase) {
        if (c.commandHandler && el && el.mouseUp) {
            c.commandHandler.onElementCommandFired(c, el, el.mouseUp, CommandEventTrigger.MouseUp, undefined);
        }
    }

    public elementClicked(c: IController, el?: ElementBase) {
        if (c.commandHandler && el && el.click) {
            c.commandHandler.onElementCommandFired(c, el, el.click, CommandEventTrigger.Click, undefined);
        }
    }

    public callElementTimers(m: Model, controller: IController, params: TimerParameters) {
        for (const e of m.elements) {
            if (controller.commandHandler && e.timer) {
                controller.commandHandler.onElementCommandFired(
                    controller,
                    e,
                    e.timer,
                    CommandEventTrigger.Timer,
                    params
                );
            }
            if (e.type === 'model') {
                let innerModel: Model | undefined;
                const modelElement = e as ModelElement;
                if (!modelElement.sourceModel && modelElement.source) {
                    const res = m.resourceManager.get(modelElement.source) as ModelResource;
                    if (res && res.model) {
                        innerModel = res.model;
                    }
                }
                else if (modelElement.sourceModel) {
                    innerModel = modelElement.sourceModel as unknown as Model;
                }
                if (innerModel) {
                    this.callElementTimers(innerModel, controller, params);
                }
            }
        }
        for (const r of m.resources) {
            if (r.type === 'model') {
                const mr = r as ModelResource;
                if (mr.model) {
                    this.callElementTimers(mr.model, controller, params);
                }
            }
        }
    }

    public timer(controller: IController, params?: TimerParameters) {
        const m = controller.model;
        if (m && params) {
            this.callElementTimers(m as Model, controller, params);
        }
    }

    public onElementCommandFired(
        controller: IController,
        el: ElementBase,
        command: string,
        trigger: string,
        parameters?: CommandParameters
    ) {
        const ec = ElementCommand.parse(command);
        const reg = this.getRegistration(ec.name);
        if (!reg) {
            return false;
        }
        reg.handler(controller, el, command, trigger, parameters);
        return true;
    }

    public getRegistration(command: string): ElementCommandHandlerRegistration | undefined {
        for (const reg of this.registrations) {
            if (reg.command === command) {
                return reg;
            }
        }
        return undefined;
    }

    public addHandler(command: string, handler: ICommandHandlerMethod<ElementBase>) {
        const found: ElementCommandHandlerRegistration | undefined = this.getRegistration(command);
        if (!found) {
            this.registrations.push(new ElementCommandHandlerRegistration(command, handler));
        }
        else {
            found.handler = handler;
        }
    }

    public removeHandler(command: string) {
        const found: ElementCommandHandlerRegistration | undefined = this.getRegistration(command);
        if (found) {
            this.registrations.splice(this.registrations.indexOf(found), 1);
        }
    }

    public clearHandlers() {
        this.registrations = [];
    }
}
