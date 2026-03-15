import type { ElementBase } from '../elements/element-base';
import type { IModel } from '../core/model-interface';
import type { TimerParameters } from '../core/timer-parameters';
import type { CommandParameters } from '../command/command-parameters';
import type { IControllerEvent } from './controller-event';

interface ControllerCommandHandler {
    onElementCommandFired(
        controller: IController,
        element: ElementBase,
        command: string,
        trigger: string,
        parameters?: CommandParameters
    ): boolean;
}

export interface IController {
    model?: IModel;
    canvas?: HTMLCanvasElement;

    modelUpdated: IControllerEvent<IModel>;
    enabledChanged: IControllerEvent<boolean>;
    commandHandler?: ControllerCommandHandler;

    mouseEnteredElement: IControllerEvent<ElementBase>;
    mouseLeftElement: IControllerEvent<ElementBase>;
    mouseDownElement: IControllerEvent<ElementBase>;
    mouseUpElement: IControllerEvent<ElementBase>;
    elementClicked: IControllerEvent<ElementBase>;
    timer: IControllerEvent<TimerParameters>;

    draw(): void;
    invalidate(): void;
}
