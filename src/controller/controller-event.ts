import { IController } from './controller';

export interface IControllerEvent<T> {
    add(handler: (c: IController, data: T) => void): void;
    remove(handler: any): void;
    clear(): void;
    trigger(c: IController, data: T): void;
    hasListeners(): boolean;
}

export class ControllerEvent<T> {
    private handlers: Array<(c: IController, data: T) => void> = [];

    public add(handler: (c: IController, data: T) => void) {
        this.handlers.push(handler);
    }

    public remove(handler: any): void {
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

    public trigger(c: IController, data: T) {
        this.handlers.slice(0).forEach(h => h(c, data));
    }
}
