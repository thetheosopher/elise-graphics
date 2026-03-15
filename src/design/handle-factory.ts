import { Matrix2D } from '../core/matrix-2d';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import { Size } from '../core/size';
import { ElementBase } from '../elements/element-base';
import { PathElement } from '../elements/path-element';
import { Handle } from './handle';
import type { IDesignController } from './design-controller-interface';

/**
 * Ordered cycle of resize cursors at 45° increments starting from north (0°)
 */
const CURSOR_CYCLE: string[] = ['n-resize', 'ne-resize', 'e-resize', 'se-resize', 's-resize', 'sw-resize', 'w-resize', 'nw-resize'];

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
    const idx = ((baseIndex + steps) % 8 + 8) % 8;
    return CURSOR_CYCLE[idx];
}

/**
 * Creates design mode manipulation handles for supported elements
 */
export class HandleFactory {
    /**
     * Creates array of handles for element
     * @param el - Element
     * @param c - Design controller
     * @param scale - Controller rendering scale
     * @returns Array of handles for element
     */
    public static handlesForElement(el: ElementBase, c: IDesignController, scale: number): Handle[] {
        let handles: Handle[];
        if (el.type === 'path') {
            if (el.editPoints) {
                return HandleFactory.pathShapeHandles(el as PathElement, c, scale);
            }
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        }
        else if (el.type === 'polyline' || el.type === 'polygon') {
            if (el.editPoints) {
                return HandleFactory.pointContainerHandles(el, c, scale);
            }
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        }
        else if (el.type === 'line') {
            return HandleFactory.pointContainerHandles(el, c, scale);
        }
        else {
            handles = HandleFactory.rectangularElementHandles(el, c, scale);
        }

        // Add rotation handles for rotatable elements with single selection
        if (el.canRotate() && c.selectedElementCount() === 1) {
            handles = handles.concat(HandleFactory.rotationHandles(el, c, scale));
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
        let moveLocation: Point;
        let resizeSize: Size;
        const b = el.getBounds();
        if (!b) {
            return handles;
        }
        let location = b.location;
        let size = b.size;

        if (c.isMoving) {
            if (c.isSelected(el) && el.canMove()) {
                moveLocation = c.getElementMoveLocation(el);
                location = new Point(moveLocation.x, moveLocation.y);
            }
        }
        else if (c.isResizing) {
            if (c.isSelected(el) && el.canResize()) {
                moveLocation = c.getElementMoveLocation(el);
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
        topLeft.connectedHandles = [ topRight, bottomLeft ];
        bottomRight.connectedHandles = [ bottomLeft, topRight ];

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
            const ml = c.getElementMoveLocation(el);
            location = new Point(ml.x, ml.y);
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
        let pivotX = location.x + size.width / 2;
        let pivotY = location.y + size.height / 2;
        if (c.rotationCenter) {
            pivotX = c.rotationCenter.x;
            pivotY = c.rotationCenter.y;
        } else {
            const rc = el.getRotationCenter();
            if (rc) {
                pivotX = location.x + rc.x;
                pivotY = location.y + rc.y;
            }
        }
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
     * @param el - Path element
     * @param c - Design controller
     * @param scale - Controller rendering scale
     * @returns Array of handles for element
     */
    public static pathShapeHandles(el: PathElement, c: IDesignController, scale: number): Handle[] {
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
            for (const command of commands) {
                let createHandle = true;
                const connectToPrevious = true;
                if (command.charAt(0) === 'm') {
                    handleIndex++;
                    handlePoint = Point.parse(command.substring(1, command.length));
                }
                else if (command.charAt(0) === 'l') {
                    handleIndex++;
                    handlePoint = Point.parse(command.substring(1, command.length));
                }
                else if (command.charAt(0) === 'c') {
                    const parts = command.substring(1, command.length).split(',');
                    const cp1 = new Point(parseFloat(parts[0]), parseFloat(parts[1]));
                    const cp2 = new Point(parseFloat(parts[2]), parseFloat(parts[3]));
                    const endPoint = new Point(parseFloat(parts[4]), parseFloat(parts[5]));
                    handleIndex++;
                    handlePoint = endPoint;

                    if (depth === PointDepth.Full) {
                        if (handleIndex === movingPointIndex && c.movingPointLocation) {
                            handlePoint = c.movingPointLocation;
                        }

                        // End point
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
                            hend.connectedHandles = [ previous ];
                        }
                        previous = hend;

                        // Control point 1
                        handleIndex++;
                        handlePoint = cp1;
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
                        hcp1.connectedHandles = [ previous ];

                        // Control point2
                        handleIndex++;
                        handlePoint = cp2;
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
                        hcp2.connectedHandles = [ previous ];

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
                        h.connectedHandles = [ previous ];
                    }
                    previous = h;
                }
            }
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
            const offset = c.getElementMoveLocation(el);
            const b = el.getBounds();
            if (!b) {
                return handles;
            }
            offsetX = offset.x - b.x;
            offsetY = offset.y - b.y;
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
                h.connectedHandles = [ previous ];
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
