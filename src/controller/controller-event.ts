import { SourceEvent, type ISourceEvent, type OptionalDataEventHandler } from '../core/typed-event';
import type { IController } from './controller';

export interface IControllerEvent<T> extends ISourceEvent<IController, T> {
    add(handler: OptionalDataEventHandler<IController, T>): void;
    remove(handler: OptionalDataEventHandler<IController, T>): void;
    clear(): void;
    trigger(c: IController, data?: T): void;
    hasListeners(): boolean;
}

export class ControllerEvent<T> extends SourceEvent<IController, T> implements IControllerEvent<T> {
}
