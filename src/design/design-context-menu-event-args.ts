import type { IMouseEvent } from '../core/mouse-event';
import { Point } from '../core/point';
import { PointEventParameters } from '../core/point-event-parameters';
import type { ElementBase } from '../elements/element-base';

/**
 * Arguments for design-surface context menu requests.
 */
export class DesignContextMenuEventArgs extends PointEventParameters {
    /**
     * Top-most interactive element under the requested menu location.
     */
    public element?: ElementBase;

    /**
     * Snapshot of the current selection when the menu was requested.
     */
    public selectedElements: ElementBase[];

    /**
     * @param event - Source mouse event
     * @param point - Model-space point where the context menu was requested
     * @param element - Top-most element under the pointer
     * @param selectedElements - Current controller selection
     */
    constructor(
        event: MouseEvent | IMouseEvent,
        point: Point,
        element?: ElementBase,
        selectedElements?: ElementBase[],
    ) {
        super(event, point);
        this.element = element;
        this.selectedElements = selectedElements ? selectedElements.slice() : [];
    }
}