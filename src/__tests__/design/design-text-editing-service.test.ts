import { DesignTextEditingService, type DesignTextEditingHost } from '../../design/design-text-editing-service';
import { TextElement } from '../../elements/text-element';

function createHost(initialText: string = 'Hello') {
    const textElement = TextElement.create(initialText, 10, 10, 120, 40).setInteractive(true) as TextElement;
    const invalidate = jest.fn();
    const commitChange = jest.fn();
    const clipboard = {
        text: undefined as string | undefined,
        isDesignPayload: false,
    };

    const host: DesignTextEditingHost = {
        selectedElements: [textElement],
        editingTextElement: undefined,
        textSelectionAnchor: 0,
        textSelectionStart: 0,
        textSelectionEnd: 0,
        isSelectingText: false,
        textCaretPreferredX: undefined,
        pendingTextStyle: {},
        invalidate,
        commitChange,
        readClipboardText: async () => clipboard.text,
        writeClipboardText: async (text: string) => {
            clipboard.text = text;
            return true;
        },
        isDesignClipboardPayload: (_text: string) => clipboard.isDesignPayload,
    };

    return { host, textElement, invalidate, commitChange, clipboard };
}

describe('DesignTextEditingService', () => {
    test('beginTextEdit and endTextEdit update edit session state', () => {
        const service = new DesignTextEditingService();
        const { host, textElement, invalidate } = createHost();

        expect(service.beginTextEdit(host, textElement, 2)).toBe(true);
        expect(host.editingTextElement).toBe(textElement);
        expect(host.textSelectionAnchor).toBe(2);
        expect(host.textSelectionStart).toBe(2);
        expect(host.textSelectionEnd).toBe(2);
        expect(invalidate).toHaveBeenCalledTimes(1);

        service.endTextEdit(host);

        expect(host.editingTextElement).toBeUndefined();
        expect(host.pendingTextStyle).toEqual({});
        expect(invalidate).toHaveBeenCalledTimes(2);
    });

    test('typing a character on a selected text element enters edit mode and commits the text change', () => {
        const service = new DesignTextEditingService();
        const { host, textElement, commitChange } = createHost();
        const typeEvent = {
            key: '!',
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            shiftKey: true,
            preventDefault: jest.fn(),
        } as unknown as KeyboardEvent;

        expect(service.handleKeyDown(host, typeEvent)).toBe(true);
        expect(textElement.getResolvedText()).toBe('Hello!');
        expect(host.editingTextElement).toBe(textElement);
        expect(host.textSelectionStart).toBe(6);
        expect(host.textSelectionEnd).toBe(6);
        expect(commitChange).toHaveBeenCalledTimes(1);
    });

    test('modifier formatting keys apply styles to the active text selection', () => {
        const service = new DesignTextEditingService();
        const { host, textElement, commitChange } = createHost();
        const boldEvent = {
            key: 'b',
            ctrlKey: true,
            metaKey: false,
            altKey: false,
            shiftKey: false,
            preventDefault: jest.fn(),
        } as unknown as KeyboardEvent;

        service.beginTextEdit(host, textElement, textElement.getTextLength());
        host.textSelectionStart = 0;
        host.textSelectionEnd = 5;

        expect(service.handleKeyDown(host, boldEvent)).toBe(true);
        expect(textElement.richText).toEqual([{ text: 'Hello', typestyle: 'bold' }]);
        expect(commitChange).toHaveBeenCalledTimes(1);
    });
});
