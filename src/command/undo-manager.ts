export class UndoState {
    public canUndo: boolean;
    public canRedo: boolean;

    constructor(canUndo: boolean, canRedo: boolean) {
        this.canUndo = canUndo;
        this.canRedo = canRedo;
    }
}

export interface IUndoSnapshot {
    signature: string;
}

/**
 * Stores committed snapshots for undo/redo navigation.
 */
export class UndoManager<T extends IUndoSnapshot> {
    private snapshots: T[] = [];
    private currentIndex: number = -1;
    private maxEntries: number;

    constructor(maxEntries: number = 100) {
        this.maxEntries = maxEntries;
    }

    public get canUndo(): boolean {
        return this.currentIndex > 0;
    }

    public get canRedo(): boolean {
        return this.currentIndex >= 0 && this.currentIndex < this.snapshots.length - 1;
    }

    public current(): T | undefined {
        if (this.currentIndex < 0 || this.currentIndex >= this.snapshots.length) {
            return undefined;
        }
        return this.snapshots[this.currentIndex];
    }

    public clear(): void {
        this.snapshots = [];
        this.currentIndex = -1;
    }

    public reset(snapshot: T): void {
        this.snapshots = [snapshot];
        this.currentIndex = 0;
    }

    public replaceCurrent(snapshot: T): boolean {
        const current = this.current();
        if (!current || current.signature === snapshot.signature) {
            return false;
        }
        this.snapshots[this.currentIndex] = snapshot;
        return true;
    }

    public push(snapshot: T): boolean {
        const current = this.current();
        if (current && current.signature === snapshot.signature) {
            return false;
        }
        if (this.canRedo) {
            this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
        }
        this.snapshots.push(snapshot);
        if (this.snapshots.length > this.maxEntries) {
            this.snapshots.shift();
        }
        this.currentIndex = this.snapshots.length - 1;
        return true;
    }

    public undo(): T | undefined {
        if (!this.canUndo) {
            return undefined;
        }
        this.currentIndex--;
        return this.current();
    }

    public redo(): T | undefined {
        if (!this.canRedo) {
            return undefined;
        }
        this.currentIndex++;
        return this.current();
    }
}