/**
 * Mouse event interface
 */
export interface IMouseEvent {
    clientX: number;
    clientY: number;
    button?: number;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    preventDefault?(): void;
    stopPropagation?(): void;
}
