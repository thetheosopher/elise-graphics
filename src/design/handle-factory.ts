import { Matrix2D } from '../core/matrix-2d';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { ArcElement } from '../elements/arc-element';
import { ArrowElement } from '../elements/arrow-element';
import { ElementBase } from '../elements/element-base';
import { PathElement } from '../elements/path-element';
import { iteratePathCommands } from '../elements/path-command-utils';
import { RegularPolygonElement } from '../elements/regular-polygon-element';
import { RectangleElement } from '../elements/rectangle-element';
import { RingElement } from '../elements/ring-element';
import { TextPathElement } from '../elements/text-path-element';
import { WedgeElement } from '../elements/wedge-element';
import { Handle } from './handle';
import type { IDesignController } from './design-controller-interface';

/**
 * Ordered cycle of resize cursors at 45° increments starting from north (0°)
 */
const CURSOR_CYCLE: string[] = [
    'n-resize',
    'ne-resize',
    'e-resize',
    'se-resize',
    's-resize',
    'sw-resize',
    'w-resize',
    'nw-resize',
];

/**
 * Returns a rotated resize cursor based on a base cursor and a rotation angle
 * @param baseCursor - The unrotated cursor name (e.g. 'nw-resize')
 * @param angleRad - Transform rotation in radians
 * @returns Rotated cursor name
 */
function rotatedCursor(baseCursor: string, angleRad: number): string {
    const baseIndex = CURSOR_CYCLE.indexOf(baseCursor);
    if (baseIndex === -1) {
        return baseCursor;
    }
    // Each step is 45°; convert angle to number of steps
    const steps = Math.round(angleRad / (Math.PI / 4));
    const idx = (((baseIndex + steps) % 8) + 8) % 8;
    return CURSOR_CYCLE[idx];
}

/**
 * Creates design mode manipulation handles for supported elements
 */
export class HandleFactory {
    private static getMoveDelta(el: ElementBase, c: IDesignController, bounds: { x: number; y: number }): Point {
        const moveLocation = c.getElementMoveLocation(el);
        const frameLocation = el.getLocation();
        if (frameLocation) {
            return new Point(moveLocation.x - frameLocation.x, moveLocation.y - frameLocation.y);
        }
        return new Point(moveLocation.x - bounds.x, moveLocation.y - bounds.y);
    }

    private static getPointDepth(c: IDesignController): PointDepth {
        return c.selectedElementCount() === 1 ? PointDepth.Full : PointDepth.Simple;
    }

    private static getPreviewFrame(el: ElementBase, c: IDesignController): { location: Point; size: Size } | undefined {
        const location = el.getLocation();
        const size = el.getSize();
        if (!location || !size) {
            return undefined;
        }

        let previewLocation = location;
        let previewSize = size;

        if (c.isMoving) {
            const bounds = el.getBounds();
            if (bounds) {
                const moveDelta = HandleFactory.getMoveDelta(el, c, bounds);
                previewLocation = new Point(location.x + moveDelta.x, location.y + moveDelta.y);
            }
            else {
                previewLocation = c.getElementMoveLocation(el);
            }
        }
        else if (c.isResizing) {
            previewLocation = c.getElementMoveLocation(el);
            previewSize = c.getElementResizeSize(el);
        }

        return {
            location: previewLocation,
            size: new Size(previewSize.width, previewSize.height),
        };
    }

    private static getPreviewPoint(el: ElementBase, c: IDesignController, pointIndex: number): Point | undefined {
        let point = el.getPointAt(pointIndex, HandleFactory.getPointDepth(c));

        if (c.isMovingPoint && c.movingPointIndex === pointIndex && c.movingPointLocation) {
            point = c.movingPointLocation;
        }

        if (c.isMoving) {
            const bounds = el.getBounds();
            if (bounds) {
                const moveDelta = HandleFactory.getMoveDelta(el, c, bounds);
                point = new Point(point.x + moveDelta.x, point.y + moveDelta.y);
            }
        }

        return point;
    }

    private static createSemanticHandle(
        el: ElementBase,
        c: IDesignController,
        scale: number,
        pointIndex: number,
        handleId: string,
        options?: {
            shape?: string;
            cursor?: string;
            barRegion?: Region;
        },
    ): Handle | undefined {
        const point = HandleFactory.getPreviewPoint(el, c, pointIndex);
        if (!point) {
            return undefined;
        }

        const handle = new Handle(point.x, point.y, el, c);
        handle.scale = scale;
        handle.handleId = handleId;
        handle.handleIndex = pointIndex;
        handle.handleMoved = Handle.movePointContainerPoint;
        handle.canMoveHorizontal = true;
        handle.canMoveVertical = true;
        handle.shape = options?.shape;
        handle.cursor = options?.cursor || 'move';
        handle.region = handle.getBounds();
        handle.barRegion = options?.barRegion;
        return handle;
    }

    private static createVerticalBarRegion(x: number, y1: number, y2: number, scale: number): Region {
        const halfWidth = 6 / scale;
        return new Region(x - halfWidth, Math.min(y1, y2), halfWidth * 2, Math.abs(y2 - y1));
    }

    private static arcElementHandles(el: ArcElement, c: IDesignController, scale: number): Handle[] {
        const start = HandleFactory.createSemanticHandle(el, c, scale, 0, 'arc-start', { shape: 'circle', cursor: 'crosshair' });
        const end = HandleFactory.createSemanticHandle(el, c, scale, 1, 'arc-end', { shape: 'circle', cursor: 'crosshair' });
        const extent = HandleFactory.createSemanticHandle(el, c, scale, 2, 'arc-extent', { cursor: 'move' });
        const handles = [start, end, extent].filter((handle): handle is Handle => !!handle);

        if (start && extent) {
            start.connectedHandles = [extent];
        }
        if (end && extent) {
            end.connectedHandles = [extent];
        }

        return handles;
    }

    private static wedgeElementHandles(el: WedgeElement, c: IDesignController, scale: number): Handle[] {
        const start = HandleFactory.createSemanticHandle(el, c, scale, 0, 'wedge-start', { shape: 'circle', cursor: 'crosshair' });
        const end = HandleFactory.createSemanticHandle(el, c, scale, 1, 'wedge-end', { shape: 'circle', cursor: 'crosshair' });
        const extent = HandleFactory.createSemanticHandle(el, c, scale, 2, 'wedge-extent', { cursor: 'move' });
        const handles = [start, end, extent].filter((handle): handle is Handle => !!handle);

        if (start && extent) {
            start.connectedHandles = [extent];
        }
        if (end && extent) {
            end.connectedHandles = [extent];
        }

        return handles;
    }

    private static ringElementHandles(el: RingElement, c: IDesignController, scale: number): Handle[] {
        const outer = HandleFactory.createSemanticHandle(el, c, scale, 0, 'ring-outerRadius', { cursor: 'ew-resize' });
        const inner = HandleFactory.createSemanticHandle(el, c, scale, 1, 'ring-innerRadius', { shape: 'circle', cursor: 'ew-resize' });
        const handles = [outer, inner].filter((handle): handle is Handle => !!handle);

        if (inner && outer) {
            inner.connectedHandles = [outer];
        }

        return handles;
    }

    private static arrowElementHandles(el: ArrowElement, c: IDesignController, scale: number): Handle[] {
        const frame = HandleFactory.getPreviewFrame(el, c);
        const centerY = frame ? frame.location.y + frame.size.height / 2 : undefined;

        const headLength = HandleFactory.createSemanticHandle(el, c, scale, 0, 'arrow-headLength', { cursor: 'ew-resize' });
        const headWidthPoint = HandleFactory.getPreviewPoint(el, c, 1);
        const shaftWidthPoint = HandleFactory.getPreviewPoint(el, c, 2);

        const headWidth = headWidthPoint
            ? HandleFactory.createSemanticHandle(el, c, scale, 1, 'arrow-headWidth', {
                shape: 'circle',
                cursor: 'ns-resize',
                barRegion: centerY !== undefined ? HandleFactory.createVerticalBarRegion(headWidthPoint.x, headWidthPoint.y, centerY * 2 - headWidthPoint.y, scale) : undefined,
            })
            : undefined;

        const shaftWidth = shaftWidthPoint
            ? HandleFactory.createSemanticHandle(el, c, scale, 2, 'arrow-shaftWidth', {
                shape: 'circle',
                cursor: 'ns-resize',
                barRegion: centerY !== undefined ? HandleFactory.createVerticalBarRegion(shaftWidthPoint.x, shaftWidthPoint.y, centerY * 2 - shaftWidthPoint.y, scale) : undefined,
            })
            : undefined;

        const handles = [headLength, headWidth, shaftWidth].filter((handle): handle is Handle => !!handle);

        if (headWidth && headLength) {
            headWidth.connectedHandles = [headLength];
        }
        if (shaftWidth && headLength) {
            shaftWidth.connectedHandles = [headLength];
        }

        return handles;
    }

    private static regularPolygonElementHandles(el: RegularPolygonElement, c: IDesignController, scale: number): Handle[] {
        const outer = HandleFactory.createSemanticHandle(el, c, scale, 0, 'regularPolygon-outer', { cursor: 'move' });
        const handles = outer ? [outer] : [];

        if (el.innerRadiusScale < 0.999) {
            const inner = HandleFactory.createSemanticHandle(el, c, scale, 1, 'regularPolygon-inner', { shape: 'circle', cursor: 'move' });
            if (inner) {
                if (outer) {
                    inner.connectedHandles = [outer];
                }
                handles.push(inner);
            }
        }

        return handles;
    }

    /**
     * Creates array of handles for element
     * @param el - Element
     * @param c - Design controller
     * @param scale - Controller rendering scale
     * @returns Array of handles for element
     */
    public static handlesForElement(el: ElementBase, c: IDesignController, scale: number): Handle[] {
        let handles: Handle[];
        if (el.type === 'rectangle') {
            if (el.editPoints) {
                return HandleFactory.rectangleCornerRadiusHandles(el as RectangleElement, c, scale);
            }
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        } else if (el.type === 'path') {
            if (el.editPoints) {
                return HandleFactory.pathShapeHandles(el as PathElement, c, scale);
            }
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        } else if (el.type === 'arc') {
            if (el.editPoints) {
                return HandleFactory.arcElementHandles(el as ArcElement, c, scale);
            }
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        } else if (el.type === 'regularPolygon') {
            if (el.editPoints) {
                return HandleFactory.regularPolygonElementHandles(el as RegularPolygonElement, c, scale);
            }
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        } else if (el.type === 'arrow') {
            if (el.editPoints) {
                return HandleFactory.arrowElementHandles(el as ArrowElement, c, scale);
            }
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        } else if (el.type === 'wedge') {
            if (el.editPoints) {
                return HandleFactory.wedgeElementHandles(el as WedgeElement, c, scale);
            }
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        } else if (el.type === 'ring') {
            if (el.editPoints) {
                return HandleFactory.ringElementHandles(el as RingElement, c, scale);
            }
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        } else if (el.type === 'textPath') {
            if (el.editPoints) {
                return HandleFactory.pathShapeHandles(el as TextPathElement, c, scale);
            }
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        } else if (
            el.type === 'polyline'
            || el.type === 'polygon'
        ) {
            if (el.editPoints) {
                return HandleFactory.pointContainerHandles(el, c, scale);
            }
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        } else if (el.type === 'line') {
            return HandleFactory.pointContainerHandles(el, c, scale);
        } else {
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        }

        // Add rotation handles for rotatable elements with single selection
        if (el.canRotate() && c.selectedElementCount() === 1) {
            handles = handles.concat(HandleFactory.rotationHandles(el, c, scale));
        }
        return handles;
    }

    /**
     * Creates corner-radius edit handles for rectangles.
     * @param el - Rectangle element
     * @param c - Design controller
     * @param scale - Controller rendering scale
     * @returns Array of handles for rectangle radius editing
     */
    public static rectangleCornerRadiusHandles(el: RectangleElement, c: IDesignController, scale: number): Handle[] {
        const handles: Handle[] = [];
        const bounds = el.getBounds();
        if (!bounds) {
            return handles;
        }

        let location = bounds.location;
        if (c.isMoving && c.isSelected(el) && el.canMove()) {
            const moveLocation = c.getElementMoveLocation(el);
            location = new Point(moveLocation.x, moveLocation.y);
        }

        const size = bounds.size;
        const radii = el.getCornerRadii(size);
        const points = [
            new Point(location.x + radii[0], location.y + radii[0]),
            new Point(location.x + size.width - radii[1], location.y + radii[1]),
            new Point(location.x + size.width - radii[2], location.y + size.height - radii[2]),
            new Point(location.x + radii[3], location.y + size.height - radii[3]),
        ];
        const ids = ['cornerRadius-topLeft', 'cornerRadius-topRight', 'cornerRadius-bottomRight', 'cornerRadius-bottomLeft'];
        const cursors = ['nw-resize', 'ne-resize', 'se-resize', 'sw-resize'];

        for (let index = 0; index < points.length; index++) {
            const handle = new Handle(points[index].x, points[index].y, el, c);
            handle.scale = scale;
            handle.handleId = ids[index];
            handle.handleIndex = index;
            handle.shape = 'circle';
            handle.cursor = cursors[index];
            handle.handleMoved = Handle.moveRectangleCornerRadius;
            handle.dragValue = radii.slice() as [number, number, number, number];
            handle.region = handle.getBounds();
            handles.push(handle);
        }

        return handles;
    }

    /**
     * Creates handles for rectangular elements
     * @param el - Rectangular element
     * @param c - Design controller
     * @param scale - Controller rendering scale
     * @returns Array of handles for element
     */
    public static rectangularElementHandles(el: ElementBase, c: IDesignController, scale: number): Handle[] {
        const handles: Handle[] = [];
        let resizeSize: Size;
        const b = el.getBounds();
        if (!b) {
            return handles;
        }
        let location = b.location;
        let size = b.size;

        if (c.isMoving) {
            if (c.isSelected(el) && el.canMove()) {
                const moveDelta = HandleFactory.getMoveDelta(el, c, b);
                location = new Point(b.x + moveDelta.x, b.y + moveDelta.y);
            }
        } else if (c.isResizing) {
            if (c.isSelected(el) && el.canResize()) {
                const moveLocation = c.getElementMoveLocation(el);
                location = new Point(moveLocation.x, moveLocation.y);
                resizeSize = c.getElementResizeSize(el);
                size = new Size(resizeSize.width, resizeSize.height);
            }
        }

        // Compute rotation angle for cursor adjustment
        let angle = 0;
        if (el.transform) {
            const mat = Matrix2D.fromTransformString(el.transform, new Point(b.x, b.y));
            angle = Matrix2D.getRotationAngle(mat);
        }

        // Top Left
        const topLeft = new Handle(location.x, location.y, el, c);
        topLeft.scale = scale;
        topLeft.handleId = 'topLeft';
        topLeft.handleMoved = Handle.sizeRectangleLeftTop;
        topLeft.canMoveHorizontal = true;
        topLeft.canMoveVertical = true;
        topLeft.cursor = rotatedCursor('nw-resize', angle);
        topLeft.region = topLeft.getBounds();
        handles.push(topLeft);

        // Top center
        const topCenter = new Handle(location.x + size.width / 2, location.y, el, c);
        topCenter.scale = scale;
        topCenter.handleId = 'topCenter';
        topCenter.handleMoved = Handle.sizeRectangleTopCenter;
        topCenter.canMoveHorizontal = false;
        topCenter.canMoveVertical = true;
        topCenter.region = topCenter.getBounds();
        // topCenter.barRegion = elise.region(location.x, location.y, size.width / 4, scale);
        topCenter.cursor = rotatedCursor('n-resize', angle);
        handles.push(topCenter);

        // Top right
        const topRight = new Handle(location.x + size.width, location.y, el, c);
        topRight.scale = scale;
        topRight.handleId = 'topRight';
        topRight.handleMoved = Handle.sizeRectangleRightTop;
        topRight.canMoveHorizontal = true;
        topRight.canMoveVertical = true;
        topRight.region = topRight.getBounds();
        topRight.cursor = rotatedCursor('ne-resize', angle);
        handles.push(topRight);

        // Middle right
        const middleRight = new Handle(location.x + size.width, location.y + size.height / 2, el, c);
        middleRight.scale = scale;
        middleRight.handleId = 'middleRight';
        middleRight.handleMoved = Handle.sizeRectangleRightMiddle;
        middleRight.canMoveHorizontal = true;
        middleRight.canMoveVertical = false;
        middleRight.region = middleRight.getBounds();
        // middleRight.barRegion = elise.region(location.x + size.width, location.y, 4 / scale, size.height);
        middleRight.cursor = rotatedCursor('e-resize', angle);
        handles.push(middleRight);

        // Bottom right
        const bottomRight = new Handle(location.x + size.width, location.y + size.height, el, c);
        bottomRight.scale = scale;
        bottomRight.handleId = 'bottomRight';
        bottomRight.handleMoved = Handle.sizeRectangleRightBottom;
        bottomRight.canMoveHorizontal = true;
        bottomRight.canMoveVertical = true;
        bottomRight.region = bottomRight.getBounds();
        bottomRight.cursor = rotatedCursor('se-resize', angle);
        handles.push(bottomRight);

        // Bottom center
        const bottomCenter = new Handle(location.x + size.width / 2, location.y + size.height, el, c);
        bottomCenter.scale = scale;
        bottomCenter.handleId = 'bottomCenter';
        bottomCenter.handleMoved = Handle.sizeRectangleBottomCenter;
        bottomCenter.canMoveHorizontal = false;
        bottomCenter.canMoveVertical = true;
        bottomCenter.region = bottomCenter.getBounds();
        // bottomCenter.barRegion = elise.region(location.x, location.y + size.height, size.width, 4 / scale);
        bottomCenter.cursor = rotatedCursor('s-resize', angle);
        handles.push(bottomCenter);

        // Left bottom
        const bottomLeft = new Handle(location.x, location.y + size.height, el, c);
        bottomLeft.scale = scale;
        bottomLeft.handleId = 'bottomLeft';
        bottomLeft.handleMoved = Handle.sizeRectangleLeftBottom;
        bottomLeft.canMoveHorizontal = true;
        bottomLeft.canMoveVertical = true;
        bottomLeft.region = bottomLeft.getBounds();
        bottomLeft.cursor = rotatedCursor('sw-resize', angle);
        handles.push(bottomLeft);

        // Middle left
        const middleLeft = new Handle(location.x, location.y + size.height / 2, el, c);
        middleLeft.scale = scale;
        middleLeft.handleId = 'middleLeft';
        middleLeft.handleMoved = Handle.sizeRectangleLeftMiddle;
        middleLeft.canMoveHorizontal = true;
        middleLeft.canMoveVertical = false;
        middleLeft.region = middleLeft.getBounds();
        // middleLeft.barRegion = elise.region(location.x, location.y, 4 / scale, size.height);
        middleLeft.cursor = rotatedCursor('w-resize', angle);
        handles.push(middleLeft);

        // Connect handles
        topLeft.connectedHandles = [topRight, bottomLeft];
        bottomRight.connectedHandles = [bottomLeft, topRight];

        return handles;
    }

    /**
     * Creates rotation handles for an element (4 corner handles + pivot handle)
     * @param el - Element
     * @param c - Design controller
     * @param scale - Controller rendering scale
     * @returns Array of rotation and pivot handles
     */
    public static rotationHandles(el: ElementBase, c: IDesignController, scale: number): Handle[] {
        const handles: Handle[] = [];
        const b = el.getBounds();
        if (!b) {
            return handles;
        }
        let location = b.location;
        let size = b.size;

        if (c.isMoving && c.isSelected(el) && el.canMove()) {
            const moveDelta = HandleFactory.getMoveDelta(el, c, b);
            location = new Point(b.x + moveDelta.x, b.y + moveDelta.y);
        } else if (c.isResizing && c.isSelected(el) && el.canResize()) {
            const ml = c.getElementMoveLocation(el);
            location = new Point(ml.x, ml.y);
            const rs = c.getElementResizeSize(el);
            size = new Size(rs.width, rs.height);
        }

        // Diagonal offset from corners for rotation handles
        const offset = 14 / scale;
        const diag = offset * Math.SQRT1_2;

        // Top-left rotation handle
        const rtl = new Handle(location.x - diag, location.y - diag, el, c);
        rtl.scale = scale;
        rtl.handleId = 'rotate-topLeft';
        rtl.handleMoved = Handle.rotateElement;
        rtl.canMoveHorizontal = true;
        rtl.canMoveVertical = true;
        rtl.shape = 'circle';
        rtl.cursor = 'grab';
        rtl.region = rtl.getBounds();
        handles.push(rtl);

        // Top-right rotation handle
        const rtr = new Handle(location.x + size.width + diag, location.y - diag, el, c);
        rtr.scale = scale;
        rtr.handleId = 'rotate-topRight';
        rtr.handleMoved = Handle.rotateElement;
        rtr.canMoveHorizontal = true;
        rtr.canMoveVertical = true;
        rtr.shape = 'circle';
        rtr.cursor = 'grab';
        rtr.region = rtr.getBounds();
        handles.push(rtr);

        // Bottom-right rotation handle
        const rbr = new Handle(location.x + size.width + diag, location.y + size.height + diag, el, c);
        rbr.scale = scale;
        rbr.handleId = 'rotate-bottomRight';
        rbr.handleMoved = Handle.rotateElement;
        rbr.canMoveHorizontal = true;
        rbr.canMoveVertical = true;
        rbr.shape = 'circle';
        rbr.cursor = 'grab';
        rbr.region = rbr.getBounds();
        handles.push(rbr);

        // Bottom-left rotation handle
        const rbl = new Handle(location.x - diag, location.y + size.height + diag, el, c);
        rbl.scale = scale;
        rbl.handleId = 'rotate-bottomLeft';
        rbl.handleMoved = Handle.rotateElement;
        rbl.canMoveHorizontal = true;
        rbl.canMoveVertical = true;
        rbl.shape = 'circle';
        rbl.cursor = 'grab';
        rbl.region = rbl.getBounds();
        handles.push(rbl);

        // Pivot handle at rotation center
        // Compute proportional position relative to original bounds,
        // then apply to current (possibly tentative) bounds so the pivot
        // tracks correctly during move and resize operations.
        let fracX = 0.5;
        let fracY = 0.5;
        if (c.rotationCenter) {
            fracX = b.width > 0 ? (c.rotationCenter.x - b.x) / b.width : 0.5;
            fracY = b.height > 0 ? (c.rotationCenter.y - b.y) / b.height : 0.5;
        } else {
            const rc = el.getRotationCenter();
            if (rc) {
                fracX = b.width > 0 ? rc.x / b.width : 0.5;
                fracY = b.height > 0 ? rc.y / b.height : 0.5;
            }
        }
        const pivotX = location.x + fracX * size.width;
        const pivotY = location.y + fracY * size.height;
        const pivot = new Handle(pivotX, pivotY, el, c);
        pivot.scale = scale;
        pivot.handleId = 'pivot';
        pivot.handleMoved = Handle.moveRotationCenter;
        pivot.canMoveHorizontal = true;
        pivot.canMoveVertical = true;
        pivot.shape = 'circle';
        pivot.cursor = 'move';
        pivot.region = pivot.getBounds();
        handles.push(pivot);

        return handles;
    }

    /**
     * Creates handles for path elements
     * @param el - Path or text-path element with getCommands() API
     * @param c - Design controller
     * @param scale - Controller rendering scale
     * @returns Array of handles for element
     */
    public static pathShapeHandles(el: ElementBase & { getCommands(): string[] | undefined }, c: IDesignController, scale: number): Handle[] {
        const handles: Handle[] = [];
        let movingPointIndex = -1;
        let offsetX = 0;
        let offsetY = 0;
        if (c.isMoving) {
            const offset = c.getElementMoveLocation(el);
            const b = el.getBounds();
            if (!b) {
                return handles;
            }
            offsetX = offset.x - b.x;
            offsetY = offset.y - b.y;
        }
        if (c.isMovingPoint && c.movingPointIndex !== undefined) {
            movingPointIndex = c.movingPointIndex;
        }
        let depth = PointDepth.Simple;
        if (c.selectedElementCount() === 1) {
            depth = PointDepth.Full;
        }
        let handleIndex = -1;
        let handlePoint = Point.Origin;
        let previous: Handle | undefined;
        const commands = el.getCommands();
        if (commands) {
            iteratePathCommands(commands, (command) => {
                let createHandle = true;
                const connectToPrevious = true;
                if (command.type === 'm' || command.type === 'l' || command.type === 'H' || command.type === 'V' || command.type === 'T') {
                    handleIndex++;
                    handlePoint = command.end;
                }
                else if (command.type === 'A') {
                    handleIndex++;
                    handlePoint = command.end;

                    if (depth === PointDepth.Full) {
                        const endHandle = HandleFactory.createSemanticHandle(el, c, scale, handleIndex, 'path-arc-end', { cursor: 'move' });
                        if (endHandle) {
                            handles.push(endHandle);
                            if (connectToPrevious && previous) {
                                endHandle.connectedHandles = [previous];
                            }
                            previous = endHandle;
                        }

                        handleIndex++;
                        const radiusXHandle = HandleFactory.createSemanticHandle(el, c, scale, handleIndex, 'path-arc-radiusX', { shape: 'circle', cursor: 'ew-resize' });
                        if (radiusXHandle) {
                            handles.push(radiusXHandle);
                            if (previous) {
                                radiusXHandle.connectedHandles = [previous];
                            }
                        }

                        handleIndex++;
                        const radiusYHandle = HandleFactory.createSemanticHandle(el, c, scale, handleIndex, 'path-arc-radiusY', { shape: 'circle', cursor: 'ns-resize' });
                        if (radiusYHandle) {
                            handles.push(radiusYHandle);
                            if (previous) {
                                radiusYHandle.connectedHandles = [previous];
                            }
                        }

                        createHandle = false;
                    }
                }
                else if (command.type === 'c') {
                    handleIndex++;
                    handlePoint = command.end;

                    if (depth === PointDepth.Full) {
                        if (handleIndex === movingPointIndex && c.movingPointLocation) {
                            handlePoint = c.movingPointLocation;
                        }

                        const hend = new Handle(handlePoint.x + offsetX, handlePoint.y + offsetY, el, c);
                        hend.scale = scale;
                        hend.handleIndex = handleIndex;
                        hend.handleMoved = Handle.movePointContainerPoint;
                        hend.canMoveHorizontal = true;
                        hend.canMoveVertical = true;
                        hend.region = hend.getBounds();
                        hend.cursor = 'move';
                        handles.push(hend);
                        if (connectToPrevious && previous) {
                            hend.connectedHandles = [previous];
                        }
                        previous = hend;

                        handleIndex++;
                        handlePoint = command.cp1;
                        if (handleIndex === movingPointIndex && c.movingPointLocation) {
                            handlePoint = c.movingPointLocation;
                        }

                        const hcp1 = new Handle(handlePoint.x + offsetX, handlePoint.y + offsetY, el, c);
                        hcp1.scale = scale;
                        hcp1.handleIndex = handleIndex;
                        hcp1.shape = 'circle';
                        hcp1.handleMoved = Handle.movePointContainerPoint;
                        hcp1.canMoveHorizontal = true;
                        hcp1.canMoveVertical = true;
                        hcp1.region = hcp1.getBounds();
                        hcp1.cursor = 'move';
                        handles.push(hcp1);
                        hcp1.connectedHandles = [previous];

                        handleIndex++;
                        handlePoint = command.cp2;
                        if (handleIndex === movingPointIndex && c.movingPointLocation) {
                            handlePoint = c.movingPointLocation;
                        }

                        const hcp2 = new Handle(handlePoint.x + offsetX, handlePoint.y + offsetY, el, c);
                        hcp2.scale = scale;
                        hcp2.handleIndex = handleIndex;
                        hcp2.shape = 'circle';
                        hcp2.handleMoved = Handle.movePointContainerPoint;
                        hcp2.canMoveHorizontal = true;
                        hcp2.canMoveVertical = true;
                        hcp2.region = hcp2.getBounds();
                        hcp2.cursor = 'move';
                        handles.push(hcp2);
                        hcp2.connectedHandles = [previous];

                        createHandle = false;
                    }
                }
                else if (command.type === 'Q' || command.type === 'S') {
                    handleIndex++;
                    handlePoint = command.end;

                    if (depth === PointDepth.Full) {
                        if (handleIndex === movingPointIndex && c.movingPointLocation) {
                            handlePoint = c.movingPointLocation;
                        }

                        const hend = new Handle(handlePoint.x + offsetX, handlePoint.y + offsetY, el, c);
                        hend.scale = scale;
                        hend.handleIndex = handleIndex;
                        hend.handleMoved = Handle.movePointContainerPoint;
                        hend.canMoveHorizontal = true;
                        hend.canMoveVertical = true;
                        hend.region = hend.getBounds();
                        hend.cursor = 'move';
                        handles.push(hend);
                        if (connectToPrevious && previous) {
                            hend.connectedHandles = [previous];
                        }
                        previous = hend;

                        handleIndex++;
                        handlePoint = command.type === 'Q' ? command.controlPoint : command.cp2;
                        if (handleIndex === movingPointIndex && c.movingPointLocation) {
                            handlePoint = c.movingPointLocation;
                        }

                        const hcp = new Handle(handlePoint.x + offsetX, handlePoint.y + offsetY, el, c);
                        hcp.scale = scale;
                        hcp.handleIndex = handleIndex;
                        hcp.shape = 'circle';
                        hcp.handleMoved = Handle.movePointContainerPoint;
                        hcp.canMoveHorizontal = true;
                        hcp.canMoveVertical = true;
                        hcp.region = hcp.getBounds();
                        hcp.cursor = 'move';
                        handles.push(hcp);
                        hcp.connectedHandles = [previous];

                        createHandle = false;
                    }
                }
                else {
                    createHandle = false;
                    previous = undefined;
                }

                if (handleIndex === movingPointIndex && c.movingPointLocation) {
                    handlePoint = c.movingPointLocation;
                }

                if (createHandle) {
                    const h = new Handle(handlePoint.x + offsetX, handlePoint.y + offsetY, el, c);
                    h.scale = scale;
                    h.handleIndex = handleIndex;
                    h.handleMoved = Handle.movePointContainerPoint;
                    h.canMoveHorizontal = true;
                    h.canMoveVertical = true;
                    h.region = h.getBounds();
                    h.cursor = 'move';
                    handles.push(h);
                    if (connectToPrevious && previous) {
                        h.connectedHandles = [previous];
                    }
                    previous = h;
                }
            });
        }

        return handles;
    }

    /**
     * Creates handles for line, polyline and polygon elements (i.e. Point containers)
     * @param el - Element
     * @param c - Design controller
     * @param scale - Controller rendering scale
     * @returns Array of handles for element
     */
    public static pointContainerHandles(el: ElementBase, c: IDesignController, scale: number): Handle[] {
        const handles: Handle[] = [];
        let movingPointIndex: number | undefined;
        if (c.isMovingPoint && c.movingPointIndex !== undefined) {
            movingPointIndex = c.movingPointIndex;
        }
        let offsetX = 0;
        let offsetY = 0;
        if (c.isMoving) {
            const b = el.getBounds();
            if (!b) {
                return handles;
            }
            const moveDelta = HandleFactory.getMoveDelta(el, c, b);
            offsetX = moveDelta.x;
            offsetY = moveDelta.y;
        }
        let previous: Handle | undefined;
        const l = el.pointCount();
        for (let i = 0; i < l; i++) {
            let p = el.getPointAt(i);
            if (i === movingPointIndex && c.movingPointLocation) {
                p = c.movingPointLocation;
            }
            const h = new Handle(p.x + offsetX, p.y + offsetY, el, c);
            h.scale = scale;
            h.handleIndex = i;
            h.handleMoved = Handle.movePointContainerPoint;
            h.canMoveHorizontal = true;
            h.canMoveVertical = true;
            h.region = h.getBounds();
            h.cursor = 'move';
            handles.push(h);
            if (i !== 0 && previous) {
                h.connectedHandles = [previous];
            }
            previous = h;
        }

        // If polygon, connect last to first
        if (el.type === 'polygon') {
            handles[handles.length - 1].connectedHandles.push(handles[0]);
        }

        return handles;
    }
}
