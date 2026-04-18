import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import { ElementBase } from '../elements/element-base';
import {
    canRemovePathCommandPoint,
    findPathCommandInsertionTarget,
    insertPathCommandBezierPoint,
    insertPathCommandPoint,
    removePathCommandPoint,
} from '../elements/path-command-utils';
import { clearGeometryCache } from '../elements/path-geometry';
import { PathElement } from '../elements/path-element';
import { PolygonElement } from '../elements/polygon-element';
import { PolylineElement } from '../elements/polyline-element';
import { TextPathElement } from '../elements/text-path-element';

export type PointEditableDesignElement = PolylineElement | PolygonElement | PathElement | TextPathElement;
export type PathPointInsertionMode = 'anchor' | 'bezier';

export const DEFAULT_POINT_EDIT_TOLERANCE = 8;

type PointInsertResolution = {
    insertIndex: number;
    point: Point;
};

const distanceBetweenPoints = (start: Point, end: Point): number => {
    return Math.hypot(end.x - start.x, end.y - start.y);
};

const projectPointToSegment = (point: Point, start: Point, end: Point): { point: Point; distance: number } => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) {
        return { point: start, distance: distanceBetweenPoints(point, start) };
    }

    const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
    const projectedPoint = new Point(start.x + dx * ratio, start.y + dy * ratio);
    return {
        point: projectedPoint,
        distance: distanceBetweenPoints(point, projectedPoint),
    };
};

const isPolylineLike = (element: ElementBase): element is PolylineElement | PolygonElement => {
    return element instanceof PolylineElement || element instanceof PolygonElement;
};

export const isPointEditableDesignElement = (element?: ElementBase): element is PointEditableDesignElement => {
    return !!element && (isPolylineLike(element) || element instanceof PathElement || element instanceof TextPathElement);
};

const resolvePolylineInsertTarget = (
    points: Point[],
    point: Point,
    closed: boolean,
    tolerance: number,
): PointInsertResolution | undefined => {
    if (points.length < 2) {
        return undefined;
    }

    let bestTarget: (PointInsertResolution & { distance: number }) | undefined;
    const segmentCount = closed ? points.length : points.length - 1;
    for (let index = 0; index < segmentCount; index++) {
        const start = points[index];
        const end = points[(index + 1) % points.length];
        const projection = projectPointToSegment(point, start, end);
        if (projection.distance > tolerance) {
            continue;
        }

        const insertIndex = index === points.length - 1 ? points.length : index + 1;
        if (!bestTarget || projection.distance < bestTarget.distance) {
            bestTarget = {
                insertIndex,
                point: projection.point,
                distance: projection.distance,
            };
        }
    }

    if (!bestTarget) {
        return undefined;
    }

    return {
        insertIndex: bestTarget.insertIndex,
        point: bestTarget.point,
    };
};

const resolveNearestPolylinePointIndex = (
    points: Point[],
    point: Point,
    tolerance: number,
): number | undefined => {
    let bestIndex: number | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < points.length; index++) {
        const distance = distanceBetweenPoints(point, points[index]);
        if (distance <= tolerance && distance < bestDistance) {
            bestIndex = index;
            bestDistance = distance;
        }
    }
    return bestIndex;
};

export const resolveInsertPointAtLocation = (
    element: PointEditableDesignElement,
    point: Point,
    tolerance: number = DEFAULT_POINT_EDIT_TOLERANCE,
): number | undefined => {
    if (isPolylineLike(element)) {
        const points = element.getPoints();
        const target = points
            ? resolvePolylineInsertTarget(points, point, element instanceof PolygonElement, tolerance)
            : undefined;
        return target?.insertIndex;
    }

    const commands = element.getCommands();
    return commands ? findPathCommandInsertionTarget(commands, point, tolerance)?.insertedPointIndex : undefined;
};

export const insertPointAtLocation = (
    element: PointEditableDesignElement,
    point: Point,
    tolerance: number = DEFAULT_POINT_EDIT_TOLERANCE,
    mode: PathPointInsertionMode = 'anchor',
): number | undefined => {
    if (isPolylineLike(element)) {
        const points = element.getPoints();
        if (!points) {
            return undefined;
        }
        const target = resolvePolylineInsertTarget(points, point, element instanceof PolygonElement, tolerance);
        if (!target) {
            return undefined;
        }
        points.splice(target.insertIndex, 0, target.point);
        element.setPoints(points);
        return target.insertIndex;
    }

    const commands = element.getCommands();
    if (!commands) {
        return undefined;
    }
    const target = findPathCommandInsertionTarget(commands, point, tolerance);
    if (!target) {
        return undefined;
    }
    if (mode === 'bezier') {
        insertPathCommandBezierPoint(commands, target.commandIndex, target.ratio);
    }
    else {
        insertPathCommandPoint(commands, target.commandIndex, target.ratio);
    }
    clearGeometryCache(commands);
    element.clearBounds();
    return target.insertedPointIndex;
};

export const canRemovePointAtIndex = (element: PointEditableDesignElement, index: number): boolean => {
    if (isPolylineLike(element)) {
        const points = element.getPoints();
        if (!points || index < 0 || index >= points.length) {
            return false;
        }
        const minimumPointCount = element instanceof PolygonElement ? 3 : 2;
        return points.length > minimumPointCount;
    }

    const commands = element.getCommands();
    return !!commands && canRemovePathCommandPoint(commands, index, PointDepth.Full);
};

export const removePointAtIndex = (element: PointEditableDesignElement, index: number): boolean => {
    if (!canRemovePointAtIndex(element, index)) {
        return false;
    }

    if (isPolylineLike(element)) {
        const points = element.getPoints();
        if (!points) {
            return false;
        }
        points.splice(index, 1);
        element.setPoints(points);
        return true;
    }

    const commands = element.getCommands();
    if (!commands) {
        return false;
    }
    removePathCommandPoint(commands, index, PointDepth.Full);
    clearGeometryCache(commands);
    element.clearBounds();
    return true;
};

export const resolveRemovablePointIndexAtLocation = (
    element: PointEditableDesignElement,
    point: Point,
    tolerance: number = DEFAULT_POINT_EDIT_TOLERANCE,
): number | undefined => {
    if (isPolylineLike(element)) {
        const points = element.getPoints();
        if (!points) {
            return undefined;
        }
        const index = resolveNearestPolylinePointIndex(points, point, tolerance);
        return index !== undefined && canRemovePointAtIndex(element, index) ? index : undefined;
    }

    const pointCount = element.pointCount();
    let bestIndex: number | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < pointCount; index++) {
        if (!canRemovePointAtIndex(element, index)) {
            continue;
        }
        const candidate = element.getPointAt(index, PointDepth.Full);
        const distance = distanceBetweenPoints(point, candidate);
        if (distance <= tolerance && distance < bestDistance) {
            bestIndex = index;
            bestDistance = distance;
        }
    }
    return bestIndex;
};