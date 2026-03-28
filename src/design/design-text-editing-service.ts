import { ElementBase } from '../elements/element-base';
import { TextElement, type TextRunStyle } from '../elements/text-element';

export interface DesignTextEditingHost {
    canvas?: HTMLCanvasElement;
    selectedElements: ElementBase[];
    editingTextElement?: TextElement;
    textSelectionAnchor: number;
    textSelectionStart: number;
    textSelectionEnd: number;
    isSelectingText: boolean;
    textCaretPreferredX?: number;
    pendingTextStyle: TextRunStyle;
    invalidate(): void;
    commitChange(): void;
    readClipboardText(): Promise<string | undefined>;
    writeClipboardText(text: string): Promise<boolean>;
    isDesignClipboardPayload(text: string): boolean;
}

export class DesignTextEditingService {
    public beginTextEdit(host: DesignTextEditingHost, element?: TextElement, index?: number): boolean {
        const target = element || this.getSelectedTextElement(host.selectedElements);
        if (!target) {
            return false;
        }

        host.editingTextElement = target;
        const caretIndex = Math.max(0, Math.min(index !== undefined ? index : target.getTextLength(), target.getTextLength()));
        host.textSelectionAnchor = caretIndex;
        host.textSelectionStart = caretIndex;
        host.textSelectionEnd = caretIndex;
        host.isSelectingText = false;
        host.textCaretPreferredX = undefined;
        host.pendingTextStyle = target.getTextStyleAt(Math.max(0, caretIndex - 1));
        host.invalidate();
        return true;
    }

    public endTextEdit(host: DesignTextEditingHost): void {
        host.editingTextElement = undefined;
        host.isSelectingText = false;
        host.textCaretPreferredX = undefined;
        host.pendingTextStyle = {};
        host.invalidate();
    }

    public applySelectedTextStyle(host: DesignTextEditingHost, style: TextRunStyle): boolean {
        const textElement = this.ensureTextEditTarget(host);
        if (!textElement) {
            return false;
        }

        const start = Math.min(host.textSelectionStart, host.textSelectionEnd);
        const end = Math.max(host.textSelectionStart, host.textSelectionEnd);
        if (start === end) {
            host.pendingTextStyle = {
                ...host.pendingTextStyle,
                ...style,
            };
            return true;
        }

        textElement.applyTextStyle(start, end, style);
        host.pendingTextStyle = textElement.getTextStyleAt(Math.max(start, end - 1));
        host.commitChange();
        return true;
    }

    public handleKeyDown(host: DesignTextEditingHost, e: KeyboardEvent): boolean {
        const selectedText = this.getSelectedTextElement(host.selectedElements);
        const isEditing = Boolean(host.editingTextElement && host.selectedElements.indexOf(host.editingTextElement) !== -1);
        if (!selectedText && !isEditing) {
            return false;
        }

        const isModifier = e.ctrlKey || e.metaKey;
        if (!isEditing) {
            if (!isModifier && !e.altKey && e.key.length === 1) {
                e.preventDefault();
                return this.replaceSelectedText(host, e.key);
            }
            return false;
        }

        if (isModifier) {
            const lowerKey = e.key.toLowerCase();
            if (lowerKey === 'b') {
                e.preventDefault();
                return this.applySelectedTextStyle(host, { typestyle: 'bold' });
            }
            if (lowerKey === 'i') {
                e.preventDefault();
                return this.applySelectedTextStyle(host, { typestyle: 'italic' });
            }
            if (lowerKey === 'u') {
                e.preventDefault();
                return this.applySelectedTextStyle(host, { decoration: 'underline' });
            }
            if (lowerKey === 'a') {
                e.preventDefault();
                const textElement = host.editingTextElement!;
                host.textSelectionAnchor = 0;
                host.textSelectionStart = 0;
                host.textSelectionEnd = textElement.getTextLength();
                host.invalidate();
                return true;
            }
            if (lowerKey === 'c') {
                e.preventDefault();
                void this.copySelectedTextToClipboard(host, false);
                return true;
            }
            if (lowerKey === 'x') {
                e.preventDefault();
                void this.copySelectedTextToClipboard(host, true);
                return true;
            }
            if (lowerKey === 'v') {
                e.preventDefault();
                void this.pasteTextFromClipboard(host);
                return true;
            }
        }

        switch (e.key) {
            case 'Escape':
                this.endTextEdit(host);
                return true;
            case 'Backspace':
                e.preventDefault();
                return this.deleteSelectedText(host, true);
            case 'Delete':
                e.preventDefault();
                return this.deleteSelectedText(host, false);
            case 'Enter':
                e.preventDefault();
                return this.replaceSelectedText(host, '\n');
            case 'ArrowLeft':
                e.preventDefault();
                return this.moveTextCaret(host, Math.max(0, Math.min(host.textSelectionStart, host.textSelectionEnd) - 1), e.shiftKey);
            case 'ArrowRight':
                e.preventDefault();
                return this.moveTextCaret(host, Math.max(host.textSelectionStart, host.textSelectionEnd) + 1, e.shiftKey);
            case 'ArrowUp':
                e.preventDefault();
                return this.moveTextCaretVertically(host, -1, e.shiftKey);
            case 'ArrowDown':
                e.preventDefault();
                return this.moveTextCaretVertically(host, 1, e.shiftKey);
            case 'Home':
                e.preventDefault();
                return this.moveTextCaret(host, 0, e.shiftKey);
            case 'End':
                e.preventDefault();
                return this.moveTextCaret(host, host.editingTextElement?.getTextLength() || 0, e.shiftKey);
            default:
                break;
        }

        if (!isModifier && !e.altKey && e.key.length === 1) {
            e.preventDefault();
            return this.replaceSelectedText(host, e.key);
        }

        return false;
    }

    private getSelectedTextElement(selectedElements: ElementBase[]): TextElement | undefined {
        if (selectedElements.length !== 1) {
            return undefined;
        }

        const selected = selectedElements[0];
        return selected instanceof TextElement ? selected : undefined;
    }

    private ensureTextEditTarget(host: DesignTextEditingHost): TextElement | undefined {
        if (host.editingTextElement && host.selectedElements.indexOf(host.editingTextElement) !== -1) {
            return host.editingTextElement;
        }

        const selected = this.getSelectedTextElement(host.selectedElements);
        if (!selected) {
            return undefined;
        }

        this.beginTextEdit(host, selected, selected.getTextLength());
        return host.editingTextElement;
    }

    private getSelectedTextRange(host: DesignTextEditingHost): { start: number; end: number } | undefined {
        if (!host.editingTextElement || host.selectedElements.indexOf(host.editingTextElement) === -1) {
            return undefined;
        }

        return {
            start: Math.min(host.textSelectionStart, host.textSelectionEnd),
            end: Math.max(host.textSelectionStart, host.textSelectionEnd),
        };
    }

    private async copySelectedTextToClipboard(host: DesignTextEditingHost, cut?: boolean): Promise<boolean> {
        const textElement = host.editingTextElement;
        const range = this.getSelectedTextRange(host);
        if (!textElement || !range || range.start === range.end) {
            return false;
        }

        const textValue = textElement.getResolvedText() || '';
        const success = await host.writeClipboardText(textValue.slice(range.start, range.end));
        if (success && cut) {
            this.deleteSelectedText(host, true);
        }

        return success;
    }

    private async pasteTextFromClipboard(host: DesignTextEditingHost): Promise<boolean> {
        const text = await host.readClipboardText();
        if (!text || host.isDesignClipboardPayload(text)) {
            return false;
        }

        return this.replaceSelectedText(host, text);
    }

    private replaceSelectedText(host: DesignTextEditingHost, content: string): boolean {
        const textElement = this.ensureTextEditTarget(host);
        if (!textElement) {
            return false;
        }

        const start = Math.min(host.textSelectionStart, host.textSelectionEnd);
        const end = Math.max(host.textSelectionStart, host.textSelectionEnd);
        const insertionStyle = start > 0 ? textElement.getTextStyleAt(start - 1) : host.pendingTextStyle;
        textElement.replaceTextRange(start, end, content, {
            ...insertionStyle,
            ...host.pendingTextStyle,
        });
        const nextIndex = start + content.length;
        host.textSelectionAnchor = nextIndex;
        host.textSelectionStart = nextIndex;
        host.textSelectionEnd = nextIndex;
        host.pendingTextStyle = textElement.getTextStyleAt(Math.max(0, nextIndex - 1));
        host.textCaretPreferredX = undefined;
        host.commitChange();
        return true;
    }

    private deleteSelectedText(host: DesignTextEditingHost, backward: boolean): boolean {
        const textElement = this.ensureTextEditTarget(host);
        if (!textElement) {
            return false;
        }

        let start = Math.min(host.textSelectionStart, host.textSelectionEnd);
        let end = Math.max(host.textSelectionStart, host.textSelectionEnd);
        if (start === end) {
            if (backward && start > 0) {
                start--;
            }
            else if (!backward && end < textElement.getTextLength()) {
                end++;
            }
            else {
                return true;
            }
        }

        textElement.replaceTextRange(start, end, '', host.pendingTextStyle);
        host.textSelectionAnchor = start;
        host.textSelectionStart = start;
        host.textSelectionEnd = start;
        host.pendingTextStyle = textElement.getTextStyleAt(Math.max(0, start - 1));
        host.textCaretPreferredX = undefined;
        host.commitChange();
        return true;
    }

    private moveTextCaret(host: DesignTextEditingHost, nextIndex: number, extendSelection: boolean): boolean {
        const textElement = this.ensureTextEditTarget(host);
        if (!textElement) {
            return false;
        }

        const clampedIndex = Math.max(0, Math.min(nextIndex, textElement.getTextLength()));
        if (extendSelection) {
            host.textSelectionEnd = clampedIndex;
        }
        else {
            host.textSelectionAnchor = clampedIndex;
            host.textSelectionStart = clampedIndex;
            host.textSelectionEnd = clampedIndex;
        }
        host.textCaretPreferredX = undefined;
        host.pendingTextStyle = textElement.getTextStyleAt(Math.max(0, clampedIndex - 1));
        host.invalidate();
        return true;
    }

    private moveTextCaretVertically(host: DesignTextEditingHost, direction: -1 | 1, extendSelection: boolean): boolean {
        const textElement = this.ensureTextEditTarget(host);
        if (!textElement || !host.canvas) {
            return false;
        }

        const context = host.canvas.getContext('2d');
        const bounds = textElement.getBounds();
        if (!context || !bounds) {
            return false;
        }

        const currentIndex = direction < 0
            ? Math.min(host.textSelectionStart, host.textSelectionEnd)
            : Math.max(host.textSelectionStart, host.textSelectionEnd);
        if (host.textCaretPreferredX === undefined) {
            host.textCaretPreferredX = textElement.getCaretRegion(context, bounds.location, bounds.size, currentIndex).x;
        }

        const nextIndex = textElement.getVerticalTextIndex(
            context,
            bounds.location,
            bounds.size,
            currentIndex,
            direction,
            host.textCaretPreferredX,
        );

        if (extendSelection) {
            host.textSelectionEnd = nextIndex;
        }
        else {
            host.textSelectionAnchor = nextIndex;
            host.textSelectionStart = nextIndex;
            host.textSelectionEnd = nextIndex;
        }
        host.pendingTextStyle = textElement.getTextStyleAt(Math.max(0, nextIndex - 1));
        host.invalidate();
        return true;
    }
}