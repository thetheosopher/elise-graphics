import { IController } from '../controller/controller';

export type ICommandHandlerMethod<T> = (
    controller: IController,
    element: T,
    command: string,
    trigger: string,
    parameters?: any
) => void;

export interface ICommandHandler<T> {
    attachController(controller: IController): void;
    onElementCommandFired(controller: IController, element: T, command: string, trigger: string, parameters: any): void;
}
