import { Point } from '../core/point';
import { iteratePathCommands, normalizePathCommands } from './path-command-utils';

type PathSegmentSample = {
    start: Point;
    end: Point;
    startLength: number;
    endLength: number;
};

type PathGeometryCacheEntry = {
    firstPoint: Point;
    totalLength: number;
    segments: PathSegmentSample[];
};

const geometryCache = new WeakMap<string[], PathGeometryCacheEntry>();
const FLATNESS_TOLERANCE = 0.5;

const distanceBetweenPoints = (a: Point, b: Point): number => {
    return Math.hypot(b.x - a.x, b.y - a.y);
};

const distanceToLine = (point: Point, start: Point, end: Point): number => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) {
        return distanceBetweenPoints(point, start);
    }
    return Math.abs(dx * (start.y - point.y) - (start.x - point.x) * dy) / Math.hypot(dx, dy);
};

const midpoint = (a: Point, b: Point): Point => {
    return new Point((a.x + b.x) / 2, (a.y + b.y) / 2);
};

const lerpPoint = (a: Point, b: Point, t: number): Point => {
    return new Point(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
};

const flattenQuadratic = (
    start: Point,
    control: Point,
    end: Point,
    segments: Point[],
    tolerance: number,
): void => {
    if (distanceToLine(control, start, end) <= tolerance) {
        segments.push(end);
        return;
    }

    const p01 = midpoint(start, control);
    const p12 = midpoint(control, end);
    const split = midpoint(p01, p12);
    flattenQuadratic(start, p01, split, segments, tolerance);
    flattenQuadratic(split, p12, end, segments, tolerance);
};

const flattenCubic = (
    start: Point,
    cp1: Point,
    cp2: Point,
    end: Point,
    segments: Point[],
    tolerance: number,
): void => {
    if (Math.max(distanceToLine(cp1, start, end), distanceToLine(cp2, start, end)) <= tolerance) {
        segments.push(end);
        return;
    }

    const p01 = midpoint(start, cp1);
    const p12 = midpoint(cp1, cp2);
    const p23 = midpoint(cp2, end);
    const p012 = midpoint(p01, p12);
    const p123 = midpoint(p12, p23);
    const split = midpoint(p012, p123);
    flattenCubic(start, p01, p012, split, segments, tolerance);
    flattenCubic(split, p123, p23, end, segments, tolerance);
};

const buildGeometry = (commands: string[]): PathGeometryCacheEntry => {
    const normalized = normalizePathCommands(commands);
    const segments: PathSegmentSample[] = [];
    let totalLength = 0;
    let firstPoint = Point.Origin;
    let hasFirstPoint = false;

    const addSegment = (start: Point, end: Point): void => {
        const segmentLength = distanceBetweenPoints(start, end);
        if (!hasFirstPoint) {
            firstPoint = start;
            hasFirstPoint = true;
        }
        if (segmentLength <= 0) {
            return;
        }
        segments.push({
            start,
            end,
            startLength: totalLength,
            endLength: totalLength + segmentLength,
        });
        totalLength += segmentLength;
    };

    iteratePathCommands(normalized, (command) => {
        switch (command.type) {
            case 'm':
                if (!hasFirstPoint) {
                    firstPoint = command.point;
                    hasFirstPoint = true;
                }
                break;
            case 'l':
            case 'H':
            case 'V':
            case 'z':
                addSegment(command.start, command.end);
                break;
            case 'Q':
            case 'T': {
                const flattened: Point[] = [];
                flattenQuadratic(command.start, command.controlPoint, command.end, flattened, FLATNESS_TOLERANCE);
                let previous = command.start;
                for (const point of flattened) {
                    addSegment(previous, point);
                    previous = point;
                }
                break;
            }
            case 'c':
            case 'S': {
                const flattened: Point[] = [];
                flattenCubic(command.start, command.cp1, command.cp2, command.end, flattened, FLATNESS_TOLERANCE);
                let previous = command.start;
                for (const point of flattened) {
                    addSegment(previous, point);
                    previous = point;
                }
                break;
            }
            case 'A':
                addSegment(command.start, command.end);
                break;
        }
    });

    return {
        firstPoint,
        totalLength,
        segments,
    };
};

const getGeometry = (commands: string[]): PathGeometryCacheEntry => {
    const cached = geometryCache.get(commands);
    if (cached) {
        return cached;
    }

    const geometry = buildGeometry(commands);
    geometryCache.set(commands, geometry);
    return geometry;
};

const findSegmentIndex = (segments: PathSegmentSample[], distance: number): number => {
    let low = 0;
    let high = segments.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const segment = segments[mid];
        if (distance < segment.startLength) {
            high = mid - 1;
        }
        else if (distance > segment.endLength) {
            low = mid + 1;
        }
        else {
            return mid;
        }
    }

    return Math.max(0, Math.min(low, segments.length - 1));
};

export function getPathLength(commands: string[] | undefined): number {
    if (!commands || commands.length === 0) {
        return 0;
    }
    return getGeometry(commands).totalLength;
}

export function clearGeometryCache(commands: string[]): void {
    geometryCache.delete(commands);
}

export function getPointAtLength(
    commands: string[] | undefined,
    distance: number,
): { point: Point; angle: number } {
    if (!commands || commands.length === 0) {
        return { point: Point.Origin, angle: 0 };
    }

    const geometry = getGeometry(commands);
    if (geometry.segments.length === 0) {
        return { point: geometry.firstPoint, angle: 0 };
    }

    const clampedDistance = Math.max(0, Math.min(distance, geometry.totalLength));
    const segment = geometry.segments[findSegmentIndex(geometry.segments, clampedDistance)];
    const segmentLength = segment.endLength - segment.startLength;
    const ratio = segmentLength <= 0 ? 0 : (clampedDistance - segment.startLength) / segmentLength;
    const point = lerpPoint(segment.start, segment.end, ratio);
    const angle = Math.atan2(segment.end.y - segment.start.y, segment.end.x - segment.start.x);
    return { point, angle };
}