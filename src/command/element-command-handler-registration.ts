import type { ElementBase } from '../elements/element-base';
import type { ICommandHandlerMethod } from './command-handler';

export class ElementCommandHandlerRegistration {
    public command: string;
    public handler: ICommandHandlerMethod<ElementBase>;

    constructor(command: string, handler: ICommandHandlerMethod<ElementBase>) {
        this.command = command;
        this.handler = handler;
    }
}
