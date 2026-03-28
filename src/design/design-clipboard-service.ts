import { Model } from '../core/model';
import type { SerializedData } from '../core/serialization';
import { ElementBase } from '../elements/element-base';

export interface DesignClipboardData {
    format: string;
    version: number;
    resources: SerializedData[];
    elements: SerializedData[];
}

interface DesignClipboardState {
    payload: DesignClipboardData;
    text: string;
    pasteCount: number;
}

interface DesignClipboardPasteContext {
    model?: Model;
    onElementAdded?: (element: ElementBase) => void;
    onResourcesPrepared?: () => void;
}

const DESIGN_CLIPBOARD_FORMAT = 'application/x-elise-design-surface+json';
const DESIGN_CLIPBOARD_VERSION = 1;
const DESIGN_CLIPBOARD_PASTE_OFFSET = 10;

let clipboardState: DesignClipboardState | undefined;

export class DesignClipboardService {
    public copySelectionToClipboard(model: Model | undefined, selectedElements: ElementBase[]): boolean {
        const text = this.exportSelectionClipboardText(model, selectedElements);
        if (!text) {
            return false;
        }

        this.setInternalClipboardText(text);
        void this.writeClipboardText(text);
        return true;
    }

    public async pasteFromClipboard(context: DesignClipboardPasteContext): Promise<ElementBase[]> {
        if (!context.model) {
            return [];
        }

        const resolvedClipboardState = await this.resolveClipboardState();
        if (!resolvedClipboardState) {
            return [];
        }

        resolvedClipboardState.pasteCount += 1;
        const offset = DESIGN_CLIPBOARD_PASTE_OFFSET * resolvedClipboardState.pasteCount;
        return this.pasteClipboardPayload(resolvedClipboardState.payload, context, offset, offset);
    }

    public exportSelectionClipboardData(model: Model | undefined, selectedElements: ElementBase[]): DesignClipboardData | undefined {
        const payload = this.createClipboardPayload(model, selectedElements);
        if (!payload) {
            return undefined;
        }
        return JSON.parse(JSON.stringify(payload)) as DesignClipboardData;
    }

    public exportSelectionClipboardText(model: Model | undefined, selectedElements: ElementBase[]): string | undefined {
        const payload = this.exportSelectionClipboardData(model, selectedElements);
        if (!payload) {
            return undefined;
        }
        return JSON.stringify(payload);
    }

    public pasteClipboardData(
        data: string | DesignClipboardData,
        context: DesignClipboardPasteContext,
        offsetX: number = 0,
        offsetY: number = 0,
    ): ElementBase[] {
        const payload = typeof data === 'string' ? this.parseClipboardPayload(data) : data;
        if (!payload) {
            return [];
        }

        const text = typeof data === 'string' ? data : JSON.stringify(payload);
        this.setInternalClipboardText(text, payload);
        return this.pasteClipboardPayload(payload, context, offsetX, offsetY);
    }

    public async readText(): Promise<string | undefined> {
        return this.readClipboardText();
    }

    public async writeText(text: string): Promise<boolean> {
        return this.writeClipboardText(text);
    }

    public isDesignClipboardPayload(text: string): boolean {
        return !!this.parseClipboardPayload(text);
    }

    private createClipboardPayload(model: Model | undefined, selectedElements: ElementBase[]): DesignClipboardData | undefined {
        if (!model || selectedElements.length === 0) {
            return undefined;
        }

        const orderedElements = model.elements.filter((element) => selectedElements.indexOf(element) !== -1);
        if (orderedElements.length === 0) {
            return undefined;
        }

        const referencedKeys = new Set<string>();
        orderedElements.forEach((element) => {
            const keys = element.getResourceKeys ? element.getResourceKeys() : [];
            keys.forEach((key) => referencedKeys.add(key));
        });

        const resources = model.resources
            .filter((resource) => resource.key && referencedKeys.has(resource.key))
            .map((resource) => JSON.parse(JSON.stringify(resource.serialize())) as SerializedData);
        const elements = orderedElements
            .map((element) => JSON.parse(JSON.stringify(element.serialize())) as SerializedData);

        return {
            format: DESIGN_CLIPBOARD_FORMAT,
            version: DESIGN_CLIPBOARD_VERSION,
            resources,
            elements,
        };
    }

    private setInternalClipboardText(text: string, payload?: DesignClipboardData): void {
        const resolvedPayload = payload || this.parseClipboardPayload(text);
        if (!resolvedPayload) {
            return;
        }

        clipboardState = {
            payload: resolvedPayload,
            text,
            pasteCount: 0,
        };
    }

    private async resolveClipboardState(): Promise<DesignClipboardState | undefined> {
        const clipboardText = await this.readClipboardText();
        if (clipboardText) {
            const payload = this.parseClipboardPayload(clipboardText);
            if (payload) {
                if (!clipboardState || clipboardState.text !== clipboardText) {
                    clipboardState = {
                        payload,
                        text: clipboardText,
                        pasteCount: 0,
                    };
                }
                return clipboardState;
            }
        }

        return clipboardState;
    }

    private parseClipboardPayload(text: string): DesignClipboardData | undefined {
        try {
            const parsed = JSON.parse(text) as Partial<DesignClipboardData>;
            if (parsed.format !== DESIGN_CLIPBOARD_FORMAT || parsed.version !== DESIGN_CLIPBOARD_VERSION) {
                return undefined;
            }
            if (!Array.isArray(parsed.elements) || !Array.isArray(parsed.resources)) {
                return undefined;
            }

            return {
                format: parsed.format,
                version: parsed.version,
                resources: parsed.resources,
                elements: parsed.elements,
            };
        }
        catch (_error) {
            return undefined;
        }
    }

    private pasteClipboardPayload(
        payload: DesignClipboardData,
        context: DesignClipboardPasteContext,
        offsetX: number,
        offsetY: number,
    ): ElementBase[] {
        if (!context.model || payload.elements.length === 0) {
            return [];
        }

        const model = context.model;

        const clipboardModel = Model.parse(JSON.stringify({
            type: 'model',
            size: model.size || '1,1',
            resources: payload.resources,
            elements: payload.elements,
        }));

        clipboardModel.resources.forEach((resource) => {
            model.resourceManager.merge(resource.clone());
        });

        const pastedElements: ElementBase[] = [];
        clipboardModel.elements.forEach((element) => {
            if (offsetX !== 0 || offsetY !== 0) {
                try {
                    element.translate(offsetX, offsetY);
                }
                catch (_error) {
                }
            }

            element.setInteractive(true);
            model.add(element);
            context.onElementAdded?.(element);
            pastedElements.push(element);
        });

        void model.prepareResources(undefined, () => {
            context.onResourcesPrepared?.();
        });

        return pastedElements;
    }

    private async readClipboardText(): Promise<string | undefined> {
        if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.readText) {
            return undefined;
        }

        try {
            const text = await navigator.clipboard.readText();
            return text || undefined;
        }
        catch (_error) {
            return undefined;
        }
    }

    private async writeClipboardText(text: string): Promise<boolean> {
        if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.writeText) {
            return false;
        }

        try {
            await navigator.clipboard.writeText(text);
            return true;
        }
        catch (_error) {
            return false;
        }
    }
}
