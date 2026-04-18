import { IMouseEvent } from '../core/mouse-event';

export interface DesignKeyboardInteractionHost {
    enabled: boolean;
    largeJump: number;
    lastClientX: number;
    lastClientY: number;
    isMouseDown: boolean;
    hasActiveTool: boolean;
    handleTextEditingKeyDown(e: KeyboardEvent): boolean;
    drawIfNeeded(): void;
    undo(): boolean;
    redo(): boolean;
    copySelectedToClipboard(): boolean;
    cutSelectedToClipboard(): boolean;
    pasteFromClipboard(): Promise<boolean>;
    nudgeSize(offsetX: number, offsetY: number): void;
    nudgeLocation(offsetX: number, offsetY: number): void;
    selectAll(): void;
    deleteActivePoint(): boolean;
    deleteSelection(e: KeyboardEvent): void;
    cancelActiveTool(): void;
    finalizeToolHistorySession(): void;
    setCancelAction(value: boolean): void;
    setSelecting(value: boolean): void;
    onCanvasMouseUp(e: MouseEvent | IMouseEvent): void;
    selectedElementCount(): number;
    clearSelections(): void;
}

export class DesignKeyboardInteractionService {
    public handleKeyDown(host: DesignKeyboardInteractionHost, e: KeyboardEvent): boolean {
        if (!host.enabled) {
            return false;
        }

        if (host.handleTextEditingKeyDown(e)) {
            host.drawIfNeeded();
            return true;
        }

        switch (e.keyCode) {
            case 90:
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.shiftKey) {
                        return host.redo();
                    }
                    return host.undo();
                }
                return false;

            case 89:
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    return host.redo();
                }
                return false;

            case 67:
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    return host.copySelectedToClipboard();
                }
                return false;

            case 88:
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    return host.cutSelectedToClipboard();
                }
                return false;

            case 86:
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    void host.pasteFromClipboard();
                    return true;
                }
                return false;

            case 37:
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    host.nudgeSize(-host.largeJump, 0);
                }
                else if (e.ctrlKey || e.metaKey) {
                    host.nudgeSize(-1, 0);
                }
                else if (e.shiftKey) {
                    host.nudgeLocation(-host.largeJump, 0);
                }
                else {
                    host.nudgeLocation(-1, 0);
                }
                return true;

            case 39:
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    host.nudgeSize(host.largeJump, 0);
                }
                else if (e.ctrlKey || e.metaKey) {
                    host.nudgeSize(1, 0);
                }
                else if (e.shiftKey) {
                    host.nudgeLocation(host.largeJump, 0);
                }
                else {
                    host.nudgeLocation(1, 0);
                }
                return true;

            case 38:
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    host.nudgeSize(0, -host.largeJump);
                }
                else if (e.ctrlKey || e.metaKey) {
                    host.nudgeSize(0, -1);
                }
                else if (e.shiftKey) {
                    host.nudgeLocation(0, -host.largeJump);
                }
                else {
                    host.nudgeLocation(0, -1);
                }
                return true;

            case 40:
                if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                    host.nudgeSize(0, host.largeJump);
                }
                else if (e.ctrlKey || e.metaKey) {
                    host.nudgeSize(0, 1);
                }
                else if (e.shiftKey) {
                    host.nudgeLocation(0, host.largeJump);
                }
                else {
                    host.nudgeLocation(0, 1);
                }
                return true;

            case 65:
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    host.selectAll();
                    return true;
                }
                return false;

            case 46:
            case 8:
                e.preventDefault();
                if (host.deleteActivePoint()) {
                    return true;
                }
                host.deleteSelection(e);
                return true;

            case 27:
                if (host.hasActiveTool) {
                    host.cancelActiveTool();
                    host.finalizeToolHistorySession();
                }
                if (host.isMouseDown) {
                    host.setCancelAction(true);
                    host.setSelecting(false);
                    host.onCanvasMouseUp({
                        button: 0,
                        clientX: host.lastClientX,
                        clientY: host.lastClientY,
                    });
                    return true;
                }
                if (host.selectedElementCount() > 0) {
                    host.clearSelections();
                    return true;
                }
                return false;

            default:
                return false;
        }
    }
}