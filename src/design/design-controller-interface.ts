import type { Point } from '../core/point';
import type { Size } from '../core/size';
import type { ElementBase } from '../elements/element-base';
import type { Model } from '../core/model';

/**
 * Shared interface for design controller used by renderers, handles, and tools
 */
export interface IDesignController {
    model?: Model;
    isMoving: boolean;
    isResizing: boolean;
    isMovingPoint: boolean;
    movingPointIndex?: number;
    movingPointLocation?: Point;
    minElementSize: Size;
    snapToGrid: boolean;
    lockAspect: boolean;
    isSelected(element: ElementBase): boolean;
    selectedElementCount(): number;
    getElementMoveLocation(element: ElementBase): Point;
    getElementResizeSize(element: ElementBase): Size;
    setElementMoveLocation(element: ElementBase, location: Point, size: Size): void;
    setElementResizeSize(element: ElementBase, size: Size, location?: Point): void;
    clearElementMoveLocations(): void;
    clearElementResizeSizes(): void;
    getNearestSnapX(x: number): number;
    getNearestSnapY(y: number): number;
    invalidate(): void;
}
