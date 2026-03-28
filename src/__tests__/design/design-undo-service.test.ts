import { UndoManager } from '../../command/undo-manager';
import { ControllerEvent } from '../../controller/controller-event';
import { Model } from '../../core/model';
import { DesignUndoService, type DesignUndoHost, type DesignUndoSnapshot } from '../../design/design-undo-service';

function createHost() {
    const model = Model.create(50, 50);
    const undoManager = new UndoManager<DesignUndoSnapshot>();
    const undoChanged = new ControllerEvent<any>();
    let canUndo = false;
    let canRedo = false;
    let pendingToolHistoryBaseline: string | undefined;
    let currentSignature = 'sig-1';

    const host: DesignUndoHost = {
        controller: {} as never,
        model,
        undoManager,
        get canUndo() {
            return canUndo;
        },
        set canUndo(value) {
            canUndo = value;
        },
        get canRedo() {
            return canRedo;
        },
        set canRedo(value) {
            canRedo = value;
        },
        restoringUndoState: false,
        get pendingToolHistoryBaseline() {
            return pendingToolHistoryBaseline;
        },
        set pendingToolHistoryBaseline(value) {
            pendingToolHistoryBaseline = value;
        },
        isMouseDown: false,
        isMoving: false,
        isResizing: false,
        isMovingPoint: false,
        isRotating: false,
        isMovingPivot: false,
        activeToolIsCreating: false,
        undoChanged,
        createUndoSnapshot: jest.fn(() => ({
            model,
            selectedElements: [],
            isDirty: false,
            signature: currentSignature,
        })),
        applyUndoSnapshot: jest.fn(),
        buildModelStateSignature: jest.fn(() => currentSignature),
        onModelUpdated: jest.fn(),
        drawIfNeeded: jest.fn(),
    };

    return {
        host,
        setSignature: (value: string) => {
            currentSignature = value;
        },
    };
}

describe('DesignUndoService', () => {
    test('reset and commit update undo availability from snapshots', () => {
        const service = new DesignUndoService();
        const { host, setSignature } = createHost();

        service.resetUndoHistory(host);
        expect(host.canUndo).toBe(false);
        expect(host.canRedo).toBe(false);

        setSignature('sig-2');
        service.commitUndoSnapshot(host);

        expect(host.canUndo).toBe(true);
        expect(host.canRedo).toBe(false);
    });

    test('undo and redo apply snapshots and refresh availability', () => {
        const service = new DesignUndoService();
        const { host, setSignature } = createHost();

        service.resetUndoHistory(host);
        setSignature('sig-2');
        service.commitUndoSnapshot(host);

        expect(service.undo(host)).toBe(true);
        expect(host.applyUndoSnapshot).toHaveBeenCalledTimes(1);
        expect(host.canUndo).toBe(false);
        expect(host.canRedo).toBe(true);

        expect(service.redo(host)).toBe(true);
        expect(host.applyUndoSnapshot).toHaveBeenCalledTimes(2);
        expect(host.canUndo).toBe(true);
        expect(host.canRedo).toBe(false);
    });

    test('finalizeToolHistorySession commits only when model signature changes', () => {
        const service = new DesignUndoService();
        const { host, setSignature } = createHost();
        service.resetUndoHistory(host);

        service.beginToolHistorySession(host);
        expect(host.pendingToolHistoryBaseline).toBe('sig-1');

        service.finalizeToolHistorySession(host);
        expect(host.onModelUpdated).not.toHaveBeenCalled();

        service.beginToolHistorySession(host);
        setSignature('sig-2');
        service.finalizeToolHistorySession(host);

        expect(host.onModelUpdated).toHaveBeenCalledTimes(1);
        expect(host.drawIfNeeded).toHaveBeenCalledTimes(1);
        expect(host.canUndo).toBe(true);
    });

    test('replaceCurrentUndoSnapshot updates the active snapshot without pushing history', () => {
        const service = new DesignUndoService();
        const { host, setSignature } = createHost();

        service.resetUndoHistory(host);
        setSignature('sig-2');
        service.replaceCurrentUndoSnapshot(host);

        expect(host.canUndo).toBe(false);
        expect(host.canRedo).toBe(false);
        expect(host.undoManager.current()?.signature).toBe('sig-2');
    });

    test('undo is blocked during active interactions', () => {
        const service = new DesignUndoService();
        const { host } = createHost();
        service.resetUndoHistory(host);
        host.isMouseDown = true;

        expect(service.undo(host)).toBe(false);
        expect(host.applyUndoSnapshot).not.toHaveBeenCalled();
    });
});