import { ElementCommandHandler } from '../command/element-command-handler';
import { Model } from '../core/model';
import { TimerParameters } from '../core/timer-parameters';
import { ElementBase } from '../elements/element-base';
import { IControllerEvent } from './controller-event';

export interface IController {
    model?: Model;
    canvas?: HTMLCanvasElement;

    modelUpdated: IControllerEvent<Model>;
    enabledChanged: IControllerEvent<boolean>;
    commandHandler?: ElementCommandHandler;

    mouseEnteredElement: IControllerEvent<ElementBase>;
    mouseLeftElement: IControllerEvent<ElementBase>;
    mouseDownElement: IControllerEvent<ElementBase>;
    mouseUpElement: IControllerEvent<ElementBase>;
    elementClicked: IControllerEvent<ElementBase>;
    timer: IControllerEvent<TimerParameters>;

    draw(): void;
    invalidate(): void;
}
