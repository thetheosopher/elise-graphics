import type { IController } from '../controller/controller';
import type { IControllerEvent } from '../controller/controller-event';
import { UndoManager, UndoState } from '../command/undo-manager';
import type { Model } from '../core/model';

export interface UndoSelectionState {
    id?: string;
    index: number;
    editPoints: boolean;
}

export interface DesignUndoSnapshot {
    model: Model;
    selectedElements: UndoSelectionState[];
    isDirty: boolean;
    signature: string;
}

export interface DesignUndoHost {
    controller: IController;
    model?: Model;
    undoManager: UndoManager<DesignUndoSnapshot>;
    canUndo: boolean;
    canRedo: boolean;
    restoringUndoState: boolean;
    pendingToolHistoryBaseline?: string;
    isMouseDown: boolean;
    isMoving: boolean;
    isResizing: boolean;
    isMovingPoint: boolean;
    isRotating: boolean;
    isMovingPivot: boolean;
    activeToolIsCreating: boolean;
    undoChanged: IControllerEvent<UndoState>;
    createUndoSnapshot(): DesignUndoSnapshot;
    applyUndoSnapshot(snapshot: DesignUndoSnapshot): void;
    buildModelStateSignature(model: Model): string;
    onModelUpdated(): void;
    drawIfNeeded(): void;
}

export class DesignUndoService {
    public undo(host: DesignUndoHost): boolean {
        if (!this.canApplyUndoRedo(host)) {
            return false;
        }

        const snapshot = host.undoManager.undo();
        if (!snapshot) {
            this.updateUndoAvailability(host);
            return false;
        }

        try {
            host.applyUndoSnapshot(snapshot);
        }
        finally {
            this.updateUndoAvailability(host);
        }
        return true;
    }

    public redo(host: DesignUndoHost): boolean {
        if (!this.canApplyUndoRedo(host)) {
            return false;
        }

        const snapshot = host.undoManager.redo();
        if (!snapshot) {
            this.updateUndoAvailability(host);
            return false;
        }

        try {
            host.applyUndoSnapshot(snapshot);
        }
        finally {
            this.updateUndoAvailability(host);
        }
        return true;
    }

    public resetUndoHistory(host: DesignUndoHost): void {
        if (!host.model) {
            host.undoManager.clear();
            this.updateUndoAvailability(host);
            return;
        }

        host.undoManager.reset(host.createUndoSnapshot());
        this.updateUndoAvailability(host);
    }

    public commitUndoSnapshot(host: DesignUndoHost): void {
        if (host.restoringUndoState || !host.model) {
            return;
        }

        host.undoManager.push(host.createUndoSnapshot());
        this.updateUndoAvailability(host);
    }

    public replaceCurrentUndoSnapshot(host: DesignUndoHost): void {
        if (!host.model) {
            return;
        }

        host.undoManager.replaceCurrent(host.createUndoSnapshot());
        this.updateUndoAvailability(host);
    }

    public beginToolHistorySession(host: DesignUndoHost): void {
        if (!host.model || host.pendingToolHistoryBaseline !== undefined) {
            return;
        }

        host.pendingToolHistoryBaseline = host.buildModelStateSignature(host.model);
    }

    public finalizeToolHistorySession(host: DesignUndoHost): void {
        if (!host.model || host.pendingToolHistoryBaseline === undefined) {
            return;
        }

        const baseline = host.pendingToolHistoryBaseline;
        host.pendingToolHistoryBaseline = undefined;
        if (host.buildModelStateSignature(host.model) !== baseline) {
            host.onModelUpdated();
            this.commitUndoSnapshot(host);
            host.drawIfNeeded();
        }
    }

    public updateUndoAvailability(host: DesignUndoHost): void {
        const canUndo = host.undoManager.canUndo;
        const canRedo = host.undoManager.canRedo;
        const changed = canUndo !== host.canUndo || canRedo !== host.canRedo;
        host.canUndo = canUndo;
        host.canRedo = canRedo;
        if (changed) {
            host.undoChanged.trigger(host.controller, new UndoState(canUndo, canRedo));
        }
    }

    private canApplyUndoRedo(host: DesignUndoHost): boolean {
        if (!host.model) {
            return false;
        }

        if (
            host.isMouseDown ||
            host.isMoving ||
            host.isResizing ||
            host.isMovingPoint ||
            host.isRotating ||
            host.isMovingPivot
        ) {
            return false;
        }

        if (host.activeToolIsCreating) {
            return false;
        }

        return true;
    }
}