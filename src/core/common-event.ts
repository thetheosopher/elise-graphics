export class CommonEvent<T> {
    private handlers: Array<(data?: T) => void> = [];

    public add(handler: (data?: T) => void) {
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

    public trigger(data?: T) {
        this.handlers.slice(0).forEach(h => h(data));
    }
}
