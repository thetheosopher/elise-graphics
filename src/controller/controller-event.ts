import type { ISourceEvent, OptionalDataEventHandler } from '../core/typed-event';
import type { IController } from './controller';

export interface IControllerEvent<T> extends ISourceEvent<IController, T> {
    add(handler: OptionalDataEventHandler<IController, T>): void;
    remove(handler: OptionalDataEventHandler<IController, T>): void;
    clear(): void;
    trigger(c: IController, data?: T): void;
    hasListeners(): boolean;
}

export class ControllerEvent<T> implements IControllerEvent<T> {
    private handlers: Array<OptionalDataEventHandler<IController, T>> = [];

    public add(handler: OptionalDataEventHandler<IController, T>) {
        this.handlers.push(handler);
    }

    public remove(handler: OptionalDataEventHandler<IController, T>): void {
        const index = this.handlers.indexOf(handler);
        if (index > -1) {
            this.handlers.splice(index, 1);
        }
    }

    public hasListeners(): boolean {
        return this.handlers.length > 0;
    }

    public clear(): void {
        this.handlers.splice(0, this.handlers.length);
    }

    public trigger(c: IController, data?: T) {
        this.handlers.slice(0).forEach(h => h(c, data));
    }
}
