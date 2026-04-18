import type { IMouseEvent } from '../core/mouse-event';
import { Point } from '../core/point';
import { PointEventParameters } from '../core/point-event-parameters';
import type { ElementBase } from '../elements/element-base';

export type DesignContextMenuPointActions = {
    canAddPoint?: boolean;
    canRemovePoint?: boolean;
    addPoint?: () => boolean;
    removePoint?: () => boolean;
};

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
     * True when a point can be inserted at the requested menu location.
     */
    public canAddPoint: boolean;

    /**
     * True when a point can be removed at the requested menu location.
     */
    public canRemovePoint: boolean;

    /**
     * Adds a point at the requested menu location when available.
     */
    public addPoint?: () => boolean;

    /**
     * Removes the targeted point when available.
     */
    public removePoint?: () => boolean;

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
        pointActions?: DesignContextMenuPointActions,
    ) {
        super(event, point);
        this.element = element;
        this.selectedElements = selectedElements ? selectedElements.slice() : [];
        this.canAddPoint = !!pointActions?.canAddPoint;
        this.canRemovePoint = !!pointActions?.canRemovePoint;
        this.addPoint = pointActions?.addPoint;
        this.removePoint = pointActions?.removePoint;
    }
}