import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { DesignController } from '../design/design-controller';
import { ElementBase } from '../elements/element-base';
import { HandleMovedArgs } from './handle-moved-args';

export class Handle {
    /**
     * Handle size
     */
    public static Size = new Size(7, 7);

    /**
     * Handles movement of left middle rectangular sizing handle
     * @param h - Handle being moved
     * @param args - Handle movement info
     */
    public static sizeRectangleLeftMiddle(h: Handle, args: HandleMovedArgs): void {
        const el = h.element;
        const b = el.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let newX = b.x + args.deltaX;
        let newWidth = b.width - args.deltaX;
        let newHeight = b.height;
        if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
            return;
        }
        if (h.controller.snapToGrid) {
            const snappedX = h.controller.getNearestSnapX(newX);
            if (snappedX !== newX) {
                if (newWidth + newX - snappedX >= h.controller.minElementSize.width) {
                    newWidth += newX - snappedX;
                    newX = snappedX;
                }
            }
        }
        if (el.aspectLocked || h.controller.lockAspect) {
            const aspect = b.width / b.height;
            newHeight = newWidth / aspect;
        }
        const moveLocation = new Point(newX, b.y);
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height)
        );
        h.controller.setElementMoveLocation(el, moveLocation, resizeSize);
        h.controller.setElementResizeSize(el, resizeSize, moveLocation);
        h.controller.invalidate();
    }

    /**
     * Handles movement of left bottom rectangular sizing handle
     * @param h - Handle being moved
     * @param args - Handle movement info
     */
    public static sizeRectangleLeftBottom(h: Handle, args: HandleMovedArgs): void {
        const el = h.element;
        const b = el.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        if (!el) {
            throw new Error(ErrorMessages.ElementUndefined);
        }
        if (!el.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        let newX = b.x + args.deltaX;
        let newWidth = b.width - args.deltaX;
        let newHeight = b.height + args.deltaY;
        if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
            return;
        }
        if (newX < 0) {
            newX = 0;
        }
        const size = el.model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if (b.y + newHeight > size.height) {
            newHeight = size.height - b.y;
        }
        if (h.controller.snapToGrid) {
            const snappedX = h.controller.getNearestSnapX(newX);
            if (snappedX !== newX) {
                if (newWidth + newX - snappedX >= h.controller.minElementSize.width) {
                    newWidth += newX - snappedX;
                    newX = snappedX;
                }
            }

            const newY = b.y + b.height + args.deltaY;
            const snappedY = h.controller.getNearestSnapY(newY);
            if (snappedY !== newY) {
                if (newHeight + newY - snappedY >= h.controller.minElementSize.height) {
                    newHeight -= newY - snappedY;
                }
            }
        }
        if (el.aspectLocked || h.controller.lockAspect) {
            const aspect = b.width / b.height;
            newHeight = newWidth / aspect;
        }
        const moveLocation = new Point(newX, b.y);
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height)
        );
        h.controller.setElementMoveLocation(el, moveLocation, resizeSize);
        h.controller.setElementResizeSize(el, resizeSize, moveLocation);
        h.controller.invalidate();
    }

    /**
     * Handles movement of bottom center rectangular sizing handle
     * @param h - Handle being moved
     * @param args - Handle movement info
     */
    public static sizeRectangleBottomCenter(h: Handle, args: HandleMovedArgs): void {
        const el = h.element;
        const b = el.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let newHeight = b.height + args.deltaY;
        let newWidth = b.width;
        if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
            return;
        }
        if (h.controller.snapToGrid) {
            const newY = b.y + b.height + args.deltaY;
            const snappedY = h.controller.getNearestSnapY(newY);
            if (snappedY !== newY) {
                if (newHeight + newY - snappedY >= h.controller.minElementSize.height) {
                    newHeight -= newY - snappedY;
                }
            }
        }
        if (el.aspectLocked || h.controller.lockAspect) {
            const aspect = b.width / b.height;
            newWidth = newHeight * aspect;
        }
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height)
        );
        h.controller.setElementResizeSize(el, resizeSize);
        h.controller.invalidate();
    }

    /**
     * Handles movement of right middle rectangular sizing handle
     * @param h - Handle being moved
     * @param args - Handle movement info
     */
    public static sizeRectangleRightMiddle(h: Handle, args: HandleMovedArgs): void {
        const el = h.element;
        const b = el.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let newWidth = b.width + args.deltaX;
        let newHeight = b.height;
        if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
            return;
        }
        if (h.controller.snapToGrid) {
            const newX = b.x + b.width + args.deltaX;
            const snappedX = h.controller.getNearestSnapX(newX);
            if (snappedX !== newX) {
                if (newWidth + newX - snappedX >= h.controller.minElementSize.width) {
                    newWidth -= newX - snappedX;
                }
            }
        }
        if (el.aspectLocked || h.controller.lockAspect) {
            const aspect = b.width / b.height;
            newHeight = newWidth / aspect;
        }
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height)
        );
        h.controller.setElementResizeSize(el, resizeSize);
        h.controller.invalidate();
    }

    /**
     * Handles movement of right bottom rectangular sizing handle
     * @param h - Handle being moved
     * @param args - Handle movement info
     */
    public static sizeRectangleRightBottom(h: Handle, args: HandleMovedArgs): void {
        const el = h.element;
        const b = el.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let newWidth = b.width + args.deltaX;
        let newHeight = b.height + args.deltaY;
        if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
            return;
        }
        if (h.controller.snapToGrid) {
            const newX = b.x + b.width + args.deltaX;
            const snappedX = h.controller.getNearestSnapX(newX);
            if (snappedX !== newX) {
                if (newWidth + newX - snappedX >= h.controller.minElementSize.width) {
                    newWidth -= newX - snappedX;
                }
            }
            const newY = b.y + b.height + args.deltaY;
            const snappedY = h.controller.getNearestSnapY(newY);
            if (snappedY !== newY) {
                if (newHeight + newY - snappedY >= h.controller.minElementSize.height) {
                    newHeight -= newY - snappedY;
                }
            }
        }
        if (el.aspectLocked || h.controller.lockAspect) {
            const aspect = b.width / b.height;
            newHeight = newWidth / aspect;
        }
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height)
        );
        h.controller.setElementResizeSize(el, resizeSize);
        h.controller.invalidate();
    }

    /**
     * Handles movement of right top rectangular sizing handle
     * @param h - Handle being moved
     * @param args - Handle movement info
     */
    public static sizeRectangleRightTop(h: Handle, args: HandleMovedArgs): void {
        const el = h.element;
        const b = el.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let newY = b.y + args.deltaY;
        let newWidth = b.width + args.deltaX;
        let newHeight = b.height - args.deltaY;
        if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
            return;
        }
        if (h.controller.snapToGrid) {
            const newX = b.x + b.width + args.deltaX;
            const snappedX = h.controller.getNearestSnapX(newX);
            if (snappedX !== newX) {
                if (newWidth + newX - snappedX >= h.controller.minElementSize.width) {
                    newWidth -= newX - snappedX;
                }
            }
            const snappedY = h.controller.getNearestSnapY(newY);
            if (snappedY !== newY) {
                if (newHeight + newY - snappedY >= h.controller.minElementSize.height) {
                    newHeight += newY - snappedY;
                    newY = snappedY;
                }
            }
        }
        if (el.aspectLocked || h.controller.lockAspect) {
            const aspect = b.width / b.height;
            const adjustedHeight = newWidth / aspect;
            newY -= adjustedHeight - newHeight;
            newHeight = adjustedHeight;
        }
        const moveLocation = new Point(b.x, newY);
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height)
        );
        h.controller.setElementMoveLocation(el, moveLocation, resizeSize);
        h.controller.setElementResizeSize(el, resizeSize, moveLocation);
        h.controller.invalidate();
    }

    /**
     * Handles movement of top center rectangular sizing handle
     * @param h - Handle being moved
     * @param args - Handle movement info
     */
    public static sizeRectangleTopCenter(h: Handle, args: HandleMovedArgs): void {
        const el = h.element;
        const b = el.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let newY = b.y + args.deltaY;
        let newHeight = b.height - args.deltaY;
        let newWidth = b.width;
        if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
            return;
        }
        if (h.controller.snapToGrid) {
            const snappedY = h.controller.getNearestSnapY(newY);
            if (snappedY !== newY) {
                if (newHeight + newY - snappedY >= h.controller.minElementSize.height) {
                    newHeight += newY - snappedY;
                    newY = snappedY;
                }
            }
        }
        if (el.aspectLocked || h.controller.lockAspect) {
            const aspect = b.width / b.height;
            newWidth = newHeight * aspect;
        }
        const moveLocation = new Point(b.x, newY);
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height)
        );
        h.controller.setElementMoveLocation(el, moveLocation, resizeSize);
        h.controller.setElementResizeSize(el, resizeSize, moveLocation);
        h.controller.invalidate();
    }

    /**
     * Handles movement of left top rectangular sizing handle
     * @param h - Handle being moved
     * @param args - Handle movement info
     */
    public static sizeRectangleLeftTop(h: Handle, args: HandleMovedArgs): void {
        const el = h.element;
        const b = el.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let newX = b.x + args.deltaX;
        let newY = b.y + args.deltaY;
        let newWidth = b.width - args.deltaX;
        let newHeight = b.height - args.deltaY;
        if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
            return;
        }
        if (h.controller.snapToGrid) {
            const snappedX = h.controller.getNearestSnapX(newX);
            if (snappedX !== newX) {
                if (newWidth + newX - snappedX >= h.controller.minElementSize.width) {
                    newWidth += newX - snappedX;
                    newX = snappedX;
                }
            }
            const snappedY = h.controller.getNearestSnapY(newY);
            if (snappedY !== newY) {
                if (newHeight + newY - snappedY >= h.controller.minElementSize.height) {
                    newHeight += newY - snappedY;
                    newY = snappedY;
                }
            }
        }
        if (el.aspectLocked || h.controller.lockAspect) {
            const aspect = b.width / b.height;
            const adjustedHeight = newWidth / aspect;
            newY -= adjustedHeight - newHeight;
            newHeight = adjustedHeight;
        }
        const moveLocation = new Point(newX, newY);
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height)
        );
        h.controller.setElementMoveLocation(el, moveLocation, resizeSize);
        h.controller.setElementResizeSize(el, resizeSize, moveLocation);
        h.controller.invalidate();
    }

    /**
     * Handles movement of point container point handle
     * @param h - Handle being moved
     * @param args - Handle movement info
     */
    public static movePointContainerPoint(h: Handle, args: HandleMovedArgs): void {
        const el = h.element;
        const pointIndex = h.handleIndex;
        if (pointIndex === undefined) {
            return;
        }
        let depth = PointDepth.Simple;
        if (h.controller.selectedElementCount() === 1) {
            depth = PointDepth.Full;
        }
        const p = el.getPointAt(pointIndex, depth);
        let newX = p.x + args.deltaX;
        let newY = p.y + args.deltaY;
        if (h.controller.snapToGrid) {
            newX = h.controller.getNearestSnapX(newX);
            newY = h.controller.getNearestSnapY(newY);
        }
        h.controller.movingPointLocation = new Point(newX, newY);
        const dc: DesignController = h.controller as DesignController;
        dc.clearElementMoveLocations();
        dc.clearElementResizeSizes();
        el.clearBounds();
        h.controller.invalidate();
    }

    /**
     * X coordinate
     */
    public x: number;

    /**
     * Y coordinate
     */
    public y: number;

    /**
     * Can handle be moved horizontally
     */
    public canMoveHorizontal: boolean;

    /**
     * Can handle be moved vertically
     */
    public canMoveVertical: boolean;

    /**
     * CSS handle cursor style
     */
    public cursor: string;

    /**
     * Element associated with handle
     */
    public element: ElementBase;

    /**
     * Design controller
     */
    public controller: DesignController;

    /**
     * Handle region
     */
    public region?: Region;

    /**
     * Associated bar region
     */
    public barRegion?: Region;

    /**
     * Handle ID
     */
    public handleId: any;

    /**
     * Handle index
     */
    public handleIndex?: number;

    /**
     * Rendering scale
     */
    public scale: number;

    /**
     * Handle shape
     */
    public shape?: string;

    /**
     * Handles connected to this handle
     */
    public connectedHandles: Handle[] = [];

    /**
     * Movement handler function
     */
    public handleMoved?: HandleMovedHandler;

    /**
     * Represents an element design control handle
     * @param x - X coordinate
     * @param y - Y coordinate
     */
    constructor(x: number, y: number, element: ElementBase, controller: DesignController) {
        this.getBounds = this.getBounds.bind(this);
        this.draw = this.draw.bind(this);

        this.x = x;
        this.y = y;
        this.element = element;
        this.controller = controller;
        this.canMoveHorizontal = true;
        this.canMoveVertical = true;
        this.cursor = 'crosshair';
        this.scale = 1.0;
    }

    /**
     * Returns handle bounding region
     */
    public getBounds(): Region {
        let width = Handle.Size.width;
        let height = Handle.Size.height;
        if (this.scale && this.scale !== 0) {
            height /= this.scale;
            width /= this.scale;
        }
        return new Region(this.x - width / 2, this.y - height / 2, width, height);
    }

    /**
     * Renders handle to 2D canvas context
     * @param c - Rendering context
     */
    public draw(c: CanvasRenderingContext2D): void {
        const b = this.region;
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }

        // Circle
        if (this.shape === 'circle') {
            c.beginPath();
            c.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2, 0, 2 * Math.PI, false);
            c.fillStyle = 'black';
            c.fill();
            c.strokeStyle = 'white';
            c.lineWidth = 0.5 / this.scale;
            c.stroke();
        }
        else {
            // Rectangle
            c.fillStyle = 'white';
            c.fillRect(b.x, b.y, b.width, b.height);
            c.strokeStyle = 'black';
            c.lineWidth = 0.5 / this.scale;
            c.strokeRect(b.x, b.y, b.width, b.height);
        }
    }
}

export type HandleMovedHandler = (h: Handle, args: HandleMovedArgs) => void;
