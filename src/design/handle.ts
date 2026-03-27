import { ErrorMessages } from '../core/error-messages';
import { Matrix2D } from '../core/matrix-2d';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { ElementBase } from '../elements/element-base';
import { RectangleElement } from '../elements/rectangle-element';
import { HandleMovedArgs } from './handle-moved-args';
import type { IDesignController } from './design-controller-interface';

/**
 * Design mode element manipulation handle
 */
export class Handle {
    /**
     * Handle size
     */
    public static Size = new Size(7, 7);

    /**
     * Returns true when the current resize drag should preserve aspect ratio.
     * Shift temporarily unlocks proportional resizing.
     */
    private static shouldLockAspect(h: Handle, args: HandleMovedArgs): boolean {
        if (args.shiftKey) {
            return false;
        }
        return !!(h.element.aspectLocked || h.controller.lockAspect);
    }

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
        if (Handle.shouldLockAspect(h, args)) {
            const aspect = b.width / b.height;
            newHeight = newWidth / aspect;
            if (newHeight < h.controller.minElementSize.height) {
                return;
            }
        }
        const moveLocation = new Point(newX, b.y);
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height),
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
        if (Handle.shouldLockAspect(h, args)) {
            const aspect = b.width / b.height;
            newHeight = newWidth / aspect;
            if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
                return;
            }
        }
        const moveLocation = new Point(newX, b.y);
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height),
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
        if (Handle.shouldLockAspect(h, args)) {
            const aspect = b.width / b.height;
            newWidth = newHeight * aspect;
            if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
                return;
            }
        }
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height),
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
        if (Handle.shouldLockAspect(h, args)) {
            const aspect = b.width / b.height;
            newHeight = newWidth / aspect;
            if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
                return;
            }
        }
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height),
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
        if (Handle.shouldLockAspect(h, args)) {
            const aspect = b.width / b.height;
            newHeight = newWidth / aspect;
            if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
                return;
            }
        }
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height),
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
        if (Handle.shouldLockAspect(h, args)) {
            const aspect = b.width / b.height;
            const adjustedHeight = newWidth / aspect;
            newY -= adjustedHeight - newHeight;
            newHeight = adjustedHeight;
            if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
                return;
            }
        }
        const moveLocation = new Point(b.x, newY);
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height),
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
        if (Handle.shouldLockAspect(h, args)) {
            const aspect = b.width / b.height;
            newWidth = newHeight * aspect;
            if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
                return;
            }
        }
        const moveLocation = new Point(b.x, newY);
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height),
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
        if (Handle.shouldLockAspect(h, args)) {
            const aspect = b.width / b.height;
            const adjustedHeight = newWidth / aspect;
            newY -= adjustedHeight - newHeight;
            newHeight = adjustedHeight;
            if (newWidth < h.controller.minElementSize.width || newHeight < h.controller.minElementSize.height) {
                return;
            }
        }
        const moveLocation = new Point(newX, newY);
        const resizeSize = new Size(
            Math.max(newWidth, h.controller.minElementSize.width),
            Math.max(newHeight, h.controller.minElementSize.height),
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
        const dc: IDesignController = h.controller as IDesignController;
        dc.clearElementMoveLocations();
        dc.clearElementResizeSizes();
        el.clearBounds();
        h.controller.invalidate();
    }

    /**
     * Handles movement of a rectangle corner-radius edit handle.
     * Shift limits the change to the dragged corner; otherwise all corners adopt the same radius.
     * @param h - Handle being moved
     * @param args - Handle movement info
     */
    public static moveRectangleCornerRadius(h: Handle, args: HandleMovedArgs): void {
        const rectangle = h.element;
        if (!(rectangle instanceof RectangleElement)) {
            return;
        }
        const bounds = rectangle.getBounds();
        const cornerIndex = h.handleIndex;
        if (!bounds || cornerIndex === undefined || !Array.isArray(h.dragValue) || h.dragValue.length < 4) {
            return;
        }

        const values = h.dragValue as number[];
        const startRadii = [0, 1, 2, 3].map((index) => Math.max(0, Number(values[index]) || 0)) as [
            number,
            number,
            number,
            number,
        ];
        const startRadius = startRadii[cornerIndex];

        let proposed = startRadius;
        switch (cornerIndex) {
            case 0:
                proposed = Math.min(startRadius + args.deltaX, startRadius + args.deltaY);
                break;
            case 1:
                proposed = Math.min(startRadius - args.deltaX, startRadius + args.deltaY);
                break;
            case 2:
                proposed = Math.min(startRadius - args.deltaX, startRadius - args.deltaY);
                break;
            case 3:
                proposed = Math.min(startRadius + args.deltaX, startRadius - args.deltaY);
                break;
        }

        let nextRadius = Math.max(0, proposed);
        const width = Math.max(0, bounds.width);
        const height = Math.max(0, bounds.height);
        if (args.shiftKey) {
            const perCornerMax = [
                Math.min(width - startRadii[1], height - startRadii[3]),
                Math.min(width - startRadii[0], height - startRadii[2]),
                Math.min(width - startRadii[3], height - startRadii[1]),
                Math.min(width - startRadii[2], height - startRadii[0]),
            ];
            nextRadius = Math.min(nextRadius, Math.max(0, perCornerMax[cornerIndex] ?? 0));
            const nextRadii = startRadii.slice() as [number, number, number, number];
            nextRadii[cornerIndex] = nextRadius;
            rectangle.setCornerRadii(nextRadii[0], nextRadii[1], nextRadii[2], nextRadii[3]);
        } else {
            nextRadius = Math.min(nextRadius, width / 2, height / 2);
            rectangle.setCornerRadius(nextRadius);
        }

        h.controller.invalidate();
    }

    /**
     * Handles rotation of element via rotation handle drag
     * @param h - Handle being moved
     * @param args - Handle movement info with mouse position
     */
    public static rotateElement(h: Handle, args: HandleMovedArgs): void {
        const el = h.element;
        const b = el.getBounds();
        if (!b || args.mouseX === undefined || args.mouseY === undefined) {
            return;
        }
        const c = h.controller;

        // Get rotation center in canvas space
        let centerX: number;
        let centerY: number;

        if (args.shiftKey) {
            // Shift held: snap pivot to element center
            centerX = b.x + b.width / 2;
            centerY = b.y + b.height / 2;
            c.rotationCenter = new Point(centerX, centerY);
        } else if (c.rotationCenter) {
            centerX = c.rotationCenter.x;
            centerY = c.rotationCenter.y;
        } else {
            centerX = b.x + b.width / 2;
            centerY = b.y + b.height / 2;
        }

        // Transform local center to canvas space for angle calculation
        let canvasCenterX = centerX;
        let canvasCenterY = centerY;
        const origTransform = c.originalTransform;
        if (origTransform) {
            const mat = Matrix2D.fromTransformString(origTransform, new Point(b.x, b.y));
            const cp = mat.transformPoint(new Point(centerX, centerY));
            canvasCenterX = cp.x;
            canvasCenterY = cp.y;
        }

        // Compute current angle from center to mouse (both in canvas space)
        const currentAngle = Math.atan2(args.mouseY - canvasCenterY, args.mouseX - canvasCenterX);

        // Compute delta from start angle
        const deltaAngle = currentAngle - c.rotationStartAngle;

        // New rotation in degrees
        let newDegrees = c.originalRotation + (deltaAngle * 180) / Math.PI;

        // Shift snap to 15° increments
        if (args.shiftKey) {
            newDegrees = Math.round(newDegrees / 15) * 15;
        }

        // Normalize to 0-360
        newDegrees = ((newDegrees % 360) + 360) % 360;

        // Compute local center relative to element position
        const localCx = centerX - b.x;
        const localCy = centerY - b.y;

        // Check if original transform was a simple rotation
        if (!origTransform || origTransform.trim().substring(0, 7).toLowerCase() === 'rotate(') {
            // Simple rotation or no transform: use standard setRotation
            el.setRotation(newDegrees, localCx, localCy);
        } else {
            // Non-rotation transform: compose original transform matrix with rotation
            const origin = new Point(b.x, b.y);
            const origMatrix = Matrix2D.fromTransformString(origTransform, origin);

            // Build rotation matrix around the center point
            const rotMatrix = new Matrix2D(1, 0, 0, 1, 0, 0);
            rotMatrix.translate(centerX, centerY);
            const angleRad = (newDegrees * Math.PI) / 180;
            rotMatrix.rotate(angleRad);
            rotMatrix.translate(-centerX, -centerY);

            // Remove original rotation component to get the base transform
            const origAngle = (c.originalRotation * Math.PI) / 180;
            const unrotMatrix = new Matrix2D(1, 0, 0, 1, 0, 0);
            unrotMatrix.translate(centerX, centerY);
            unrotMatrix.rotate(-origAngle);
            unrotMatrix.translate(-centerX, -centerY);
            const baseMatrix = Matrix2D.multiply(unrotMatrix, origMatrix);

            // Composite: new rotation applied to the base (non-rotation) transform
            const composite = Matrix2D.multiply(baseMatrix, rotMatrix);

            // Store as matrix transform with center point
            const m = composite;
            el.transform = `matrix(${m.m11},${m.m12},${m.m21},${m.m22},${m.offsetX},${m.offsetY}(${localCx},${localCy}))`;
        }
        c.invalidate();
    }

    /**
     * Handles movement of rotation center (pivot) handle
     * @param h - Handle being moved
     * @param args - Handle movement info
     */
    public static moveRotationCenter(h: Handle, args: HandleMovedArgs): void {
        const c = h.controller;
        if (c.originalPivotCenter) {
            c.rotationCenter = new Point(c.originalPivotCenter.x + args.deltaX, c.originalPivotCenter.y + args.deltaY);
        } else {
            const b = h.element.getBounds();
            if (b) {
                c.rotationCenter = new Point(b.x + b.width / 2 + args.deltaX, b.y + b.height / 2 + args.deltaY);
            }
        }
        c.invalidate();
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
    public controller: IDesignController;

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
    public handleId: string | number = '';

    /**
     * Handle index
     */
    public handleIndex?: number;

    /**
     * Optional drag-start value used by some specialized handles.
     */
    public dragValue?: unknown;

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
    constructor(x: number, y: number, element: ElementBase, controller: IDesignController) {
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
        } else {
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
