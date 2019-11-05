import { ElementBase } from '../elements/element-base';
import { ICommandHandlerMethod } from './command-handler';

export class ElementCommandHandlerRegistration {
    public command: string;
    public handler: ICommandHandlerMethod<ElementBase>;

    constructor(command: string, handler: ICommandHandlerMethod<ElementBase>) {
        this.command = command;
        this.handler = handler;
    }
}
