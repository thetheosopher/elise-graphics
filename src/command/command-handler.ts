import type { IController } from '../controller/controller';
import type { CommandParameters } from './command-parameters';

export type ICommandHandlerMethod<T> = (
    controller: IController,
    element: T,
    command: string,
    trigger: string,
    parameters?: CommandParameters
) => void;

export interface ICommandHandler<T> {
    attachController(controller: IController): void;
    onElementCommandFired(controller: IController, element: T, command: string, trigger: string, parameters?: CommandParameters): void;
}
