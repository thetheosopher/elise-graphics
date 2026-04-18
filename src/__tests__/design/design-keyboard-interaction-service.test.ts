import { DesignKeyboardInteractionService, type DesignKeyboardInteractionHost } from '../../design/design-keyboard-interaction-service';

function createHost(): DesignKeyboardInteractionHost {
    return {
        enabled: true,
        largeJump: 12,
        lastClientX: 45,
        lastClientY: 55,
        isMouseDown: false,
        hasActiveTool: false,
        handleTextEditingKeyDown: jest.fn(() => false),
        drawIfNeeded: jest.fn(),
        undo: jest.fn(() => true),
        redo: jest.fn(() => true),
        copySelectedToClipboard: jest.fn(() => true),
        cutSelectedToClipboard: jest.fn(() => true),
        pasteFromClipboard: jest.fn(async () => true),
        nudgeSize: jest.fn(),
        nudgeLocation: jest.fn(),
        selectAll: jest.fn(),
        deleteActivePoint: jest.fn(() => false),
        deleteSelection: jest.fn(),
        cancelActiveTool: jest.fn(),
        finalizeToolHistorySession: jest.fn(),
        setCancelAction: jest.fn(),
        setSelecting: jest.fn(),
        onCanvasMouseUp: jest.fn(),
        selectedElementCount: jest.fn(() => 0),
        clearSelections: jest.fn(),
    };
}

describe('DesignKeyboardInteractionService', () => {
    test('delegates text-editing shortcuts and redraws immediately', () => {
        const service = new DesignKeyboardInteractionService();
        const host = createHost();
        (host.handleTextEditingKeyDown as jest.Mock).mockReturnValue(true);
        const event = {
            keyCode: 65,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
        } as unknown as KeyboardEvent;

        expect(service.handleKeyDown(host, event)).toBe(true);
        expect(host.drawIfNeeded).toHaveBeenCalledTimes(1);
        expect(host.undo).not.toHaveBeenCalled();
    });

    test('routes undo redo and clipboard shortcuts', () => {
        const service = new DesignKeyboardInteractionService();
        const host = createHost();

        const ctrlZ = { keyCode: 90, ctrlKey: true, metaKey: false, shiftKey: false, preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as KeyboardEvent;
        const ctrlY = { keyCode: 89, ctrlKey: true, metaKey: false, shiftKey: false, preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as KeyboardEvent;
        const ctrlC = { keyCode: 67, ctrlKey: true, metaKey: false, shiftKey: false, preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as KeyboardEvent;
        const ctrlX = { keyCode: 88, ctrlKey: true, metaKey: false, shiftKey: false, preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as KeyboardEvent;
        const ctrlV = { keyCode: 86, ctrlKey: true, metaKey: false, shiftKey: false, preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as KeyboardEvent;

        expect(service.handleKeyDown(host, ctrlZ)).toBe(true);
        expect(service.handleKeyDown(host, ctrlY)).toBe(true);
        expect(service.handleKeyDown(host, ctrlC)).toBe(true);
        expect(service.handleKeyDown(host, ctrlX)).toBe(true);
        expect(service.handleKeyDown(host, ctrlV)).toBe(true);

        expect(host.undo).toHaveBeenCalledTimes(1);
        expect(host.redo).toHaveBeenCalledTimes(1);
        expect(host.copySelectedToClipboard).toHaveBeenCalledTimes(1);
        expect(host.cutSelectedToClipboard).toHaveBeenCalledTimes(1);
        expect(host.pasteFromClipboard).toHaveBeenCalledTimes(1);
    });

    test('routes arrow keys to location and size nudges', () => {
        const service = new DesignKeyboardInteractionService();
        const host = createHost();

        const right = { keyCode: 39, ctrlKey: false, metaKey: false, shiftKey: false } as KeyboardEvent;
        const shiftRight = { keyCode: 39, ctrlKey: false, metaKey: false, shiftKey: true } as KeyboardEvent;
        const ctrlRight = { keyCode: 39, ctrlKey: true, metaKey: false, shiftKey: false } as KeyboardEvent;
        const ctrlShiftRight = { keyCode: 39, ctrlKey: true, metaKey: false, shiftKey: true } as KeyboardEvent;

        expect(service.handleKeyDown(host, right)).toBe(true);
        expect(service.handleKeyDown(host, shiftRight)).toBe(true);
        expect(service.handleKeyDown(host, ctrlRight)).toBe(true);
        expect(service.handleKeyDown(host, ctrlShiftRight)).toBe(true);

        expect(host.nudgeLocation).toHaveBeenNthCalledWith(1, 1, 0);
        expect(host.nudgeLocation).toHaveBeenNthCalledWith(2, 12, 0);
        expect(host.nudgeSize).toHaveBeenNthCalledWith(1, 1, 0);
        expect(host.nudgeSize).toHaveBeenNthCalledWith(2, 12, 0);
    });

    test('delete delegates to host selection removal', () => {
        const service = new DesignKeyboardInteractionService();
        const host = createHost();
        const event = { keyCode: 46, preventDefault: jest.fn() } as unknown as KeyboardEvent;

        expect(service.handleKeyDown(host, event)).toBe(true);
        expect(host.deleteSelection).toHaveBeenCalledWith(event);
    });

    test('delete removes the active point before falling back to selection removal', () => {
        const service = new DesignKeyboardInteractionService();
        const host = createHost();
        (host.deleteActivePoint as jest.Mock).mockReturnValue(true);
        const event = { keyCode: 46, preventDefault: jest.fn() } as unknown as KeyboardEvent;

        expect(service.handleKeyDown(host, event)).toBe(true);
        expect(host.deleteActivePoint).toHaveBeenCalledTimes(1);
        expect(host.deleteSelection).not.toHaveBeenCalled();
    });

    test('escape cancels active mouse interaction through mouse up', () => {
        const service = new DesignKeyboardInteractionService();
        const host = createHost();
        host.hasActiveTool = true;
        host.isMouseDown = true;
        const event = { keyCode: 27 } as KeyboardEvent;

        expect(service.handleKeyDown(host, event)).toBe(true);
        expect(host.cancelActiveTool).toHaveBeenCalledTimes(1);
        expect(host.finalizeToolHistorySession).toHaveBeenCalledTimes(1);
        expect(host.setCancelAction).toHaveBeenCalledWith(true);
        expect(host.setSelecting).toHaveBeenCalledWith(false);
        expect(host.onCanvasMouseUp).toHaveBeenCalledWith({ button: 0, clientX: 45, clientY: 55 });
    });
});